"""Tests for streaming endpoint, chat-style follow-ups, replan, and over-budget flows."""

import json

import pytest
from fastapi.testclient import TestClient

from app.api.routes import trips
from app.main import app
from app.models.schemas import BudgetBreakdown, DestinationResearch, IntentDetails, ItineraryPlan
from app.services import planner
from app.services.llm import StructuredLLM

# ---------------------------------------------------------------------------
# Reusable stub — deterministic structured output for every agent
# ---------------------------------------------------------------------------

class StubStructuredLLM(StructuredLLM):
    def generate(self, *, schema, system_prompt, user_prompt, temperature=0.2, **kwargs):
        if schema is IntentDetails:
            return IntentDetails(
                destination="Goa",
                duration_days=5,
                budget_currency="INR",
                budget_limit=20000,
                travelers=1,
                travel_style="budget",
                interests=["beaches", "seafood"],
                constraints=["budget under 20000 INR"],
                pacing="balanced",
            )
        if schema is DestinationResearch:
            return DestinationResearch(
                destination="Goa",
                overview="Goa combines beaches, nightlife, and laid-back coastal towns.",
                best_time_to_visit="November to February",
                expected_weather="Warm and humid with breezy evenings.",
                top_attractions=["Calangute Beach", "Fontainhas", "Dudhsagar Falls"],
                food_highlights=["Goan fish curry", "bebinca"],
                local_transport=["Rent a scooter", "Use local cabs"],
                travel_tips=["Book stays early in peak season"],
                cautions=["Carry cash for smaller vendors"],
            )
        if schema is ItineraryPlan:
            return ItineraryPlan(
                days=[
                    {
                        "day": day,
                        "title": f"Day {day}",
                        "morning": "Beach time",
                        "afternoon": "Local sightseeing",
                        "evening": "Dinner and walk",
                        "meals": ["breakfast", "lunch", "dinner"],
                        "estimated_local_cost": 1200,
                        "notes": ["Keep commute short"],
                    }
                    for day in range(1, 6)
                ],
                planning_notes=["Cluster North Goa activities together."],
            )
        if schema is BudgetBreakdown:
            return BudgetBreakdown(
                currency="INR",
                transportation=5000,
                accommodation=7000,
                food=3500,
                activities=2000,
                local_transport=1500,
                contingency=1000,
                savings_tips=["Use a scooter instead of private cabs."],
                assumptions=["Train travel from a nearby city."],
            )
        raise AssertionError(f"Unexpected schema: {schema}")

    def generate_text(self, *, system_prompt, user_prompt, temperature=0.3, **kwargs):
        return "Stub response — summary or question answer."


# ---------------------------------------------------------------------------
# Over-budget stub — individual cost components sum to > 20000
# ---------------------------------------------------------------------------

class OverBudgetStubLLM(StubStructuredLLM):
    def generate(self, *, schema, system_prompt, user_prompt, temperature=0.2, **kwargs):
        if schema is BudgetBreakdown:
            return BudgetBreakdown(
                currency="INR",
                transportation=8000,
                accommodation=12000,
                food=5000,
                activities=3000,
                local_transport=2000,
                contingency=3000,
                savings_tips=["Negotiate at local markets."],
                assumptions=["Train travel from nearby city."],
            )
        return super().generate(schema=schema, system_prompt=system_prompt, user_prompt=user_prompt, temperature=temperature)


# ===================================================================
# Fixtures
# ===================================================================

@pytest.fixture(autouse=True)
def _clean_original_requests():
    """Clear the module-level _original_requests dict between tests."""
    saved = dict(planner._original_requests)
    planner._original_requests.clear()
    yield
    planner._original_requests.clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def shared_service():
    """Single service instance shared across requests (needed for follow-up tests)."""
    return trips.TravelPlannerService(StubStructuredLLM())


@pytest.fixture
def over_budget_service():
    return trips.TravelPlannerService(OverBudgetStubLLM())


def _inject_service(service):
    trips.get_travel_planner_service.cache_clear()
    app.dependency_overrides[trips.get_travel_planner_service] = lambda: service


def _clear_overrides():
    app.dependency_overrides.clear()


# ===================================================================
# Streaming endpoint
# ===================================================================

class TestStreamingEndpoint:
    def test_stream_plan_returns_all_sse_events(self, client, shared_service):
        _inject_service(shared_service)
        try:
            response = client.post("/api/v1/trips/plan/stream", json={
                "user_request": "Plan a 5-day budget trip to Goa under 20000 INR."
            })
            assert response.status_code == 200

            events = []
            for line in response.text.strip().split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

            event_types = [e["type"] for e in events]
            for expected in ("session", "intent", "research", "itinerary", "budget", "complete"):
                assert expected in event_types, f"Missing event type: {expected}"
            assert event_types[-1] == "complete"

            complete = events[-1]["data"]
            assert complete["session_id"] is not None
            assert complete["final_plan"]["intent"]["destination"] == "Goa"
        finally:
            _clear_overrides()

    def test_stream_clarification_returns_questions(self, client, shared_service):
        _inject_service(shared_service)
        try:
            response = client.post("/api/v1/trips/plan/stream", json={
                "user_request": "Plan a trip"
            })
            assert response.status_code == 200
            events = []
            for line in response.text.strip().split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))
            assert len(events) >= 1
            assert events[0]["type"] == "questions"
            assert len(events[0]["data"]) > 0
        finally:
            _clear_overrides()

    def test_stream_session_event_includes_request(self, client, shared_service):
        _inject_service(shared_service)
        try:
            response = client.post("/api/v1/trips/plan/stream", json={
                "user_request": "Plan a 5-day budget trip to Goa under 20000 INR."
            })
            events = []
            for line in response.text.strip().split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))
            session_event = events[0]
            assert session_event["type"] == "session"
            assert session_event["request"] == "Plan a 5-day budget trip to Goa under 20000 INR."
            assert session_event["session_id"] is not None
        finally:
            _clear_overrides()


# ===================================================================
# Chat-style follow-ups
# ===================================================================

def _seed_plan(client) -> str:
    """Create a plan and return the session_id."""
    resp = client.post("/api/v1/trips/plan", json={
        "user_request": "Plan a 5-day budget trip to Goa under 20000 INR."
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["final_plan"] is not None
    return body["session_id"]


class TestChatFollowups:
    def test_summary_returns_chat_reply(self, client, shared_service):
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "Summarize the trip",
                "session_id": session_id,
            })
            assert resp.status_code == 200
            body = resp.json()
            assert body["chat_reply"] is not None
            assert "Stub response" in body["chat_reply"]
            assert body["final_plan"] is None
        finally:
            _clear_overrides()

    def test_question_returns_chat_reply(self, client, shared_service):
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "What are the best beaches in Goa?",
                "session_id": session_id,
            })
            assert resp.status_code == 200
            body = resp.json()
            assert body["chat_reply"] is not None
            assert "Stub response" in body["chat_reply"]
            assert body["final_plan"] is None
        finally:
            _clear_overrides()

    def test_chat_reply_with_streaming(self, client, shared_service):
        """Chat-style summary via streaming endpoint should yield chat_reply event."""
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            response = client.post("/api/v1/trips/plan/stream", json={
                "user_request": "Summarize the trip",
                "session_id": session_id,
            })
            assert response.status_code == 200
            events = []
            for line in response.text.strip().split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

            types = [e["type"] for e in events]
            assert "session" in types
            assert "chat_reply" in types
            chat = next(e for e in events if e["type"] == "chat_reply")
            assert "Stub response" in chat["data"]
        finally:
            _clear_overrides()

    def test_normal_request_not_confused_as_chat(self, client, shared_service):
        """A new plan request (no session_id) should not be treated as a follow-up."""
        _inject_service(shared_service)
        try:
            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "Plan a 5-day budget trip to Goa under 20000 INR."
            })
            assert resp.status_code == 200
            body = resp.json()
            assert body["chat_reply"] is None
            assert body["final_plan"] is not None
        finally:
            _clear_overrides()


# ===================================================================
# Modification replan — goes through full graph with combined request
# ===================================================================

class TestModificationReplan:
    def test_modification_re_runs_graph(self, client, shared_service):
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "Add another day to the trip",
                "session_id": session_id,
            })
            assert resp.status_code == 200
            body = resp.json()
            assert body["final_plan"] is not None
            assert body["chat_reply"] is None
            assert body["agent_outputs"] != {}
        finally:
            _clear_overrides()

    def test_combined_request_in_trace(self, client, shared_service):
        """The graph should receive the combined original + follow-up request."""
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "Add another day to the trip",
                "session_id": session_id,
            })
            assert resp.status_code == 200
            body = resp.json()

            user_request = body["agent_traces"]["orchestrator"]["input"]["user_request"]
            assert "5-day budget trip to Goa" in user_request
            assert "Add another day" in user_request
        finally:
            _clear_overrides()

    def test_modification_via_stream(self, client, shared_service):
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            response = client.post("/api/v1/trips/plan/stream", json={
                "user_request": "Add another day to the trip",
                "session_id": session_id,
            })
            assert response.status_code == 200
            events = []
            for line in response.text.strip().split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

            types = [e["type"] for e in events]
            for expected in ("session", "intent", "research", "itinerary", "budget", "complete"):
                assert expected in types

            # Should NOT have chat_reply (it's a replan, not a chat reply)
            assert "chat_reply" not in types
        finally:
            _clear_overrides()

    def test_previous_plan_in_graph_state(self, client, shared_service):
        """The previous_plan should be passed into the graph for replan requests."""
        _inject_service(shared_service)
        try:
            session_id = _seed_plan(client)

            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "Add another day to the trip",
                "session_id": session_id,
            })
            assert resp.status_code == 200
            body = resp.json()

            trace_output = body["agent_traces"]["orchestrator"]["output"]
            assert trace_output["previous_plan"] is not None
            assert trace_output["previous_plan"]["intent"]["destination"] == "Goa"
        finally:
            _clear_overrides()


# ===================================================================
# Over-budget scenario
# ===================================================================

class TestOverBudget:
    def test_over_budget_sets_within_budget_false(self, client, over_budget_service):
        _inject_service(over_budget_service)
        try:
            response = client.post("/api/v1/trips/plan", json={
                "user_request": "Plan a 5-day budget trip to Goa under 20000 INR."
            })
            assert response.status_code == 200
            body = response.json()
            budget = body["final_plan"]["budget"]
            assert budget["within_budget"] is False
            assert budget["total_estimated_cost"] > 20000
        finally:
            _clear_overrides()

    def test_stream_over_budget(self, client, over_budget_service):
        _inject_service(over_budget_service)
        try:
            response = client.post("/api/v1/trips/plan/stream", json={
                "user_request": "Plan a 5-day budget trip to Goa under 20000 INR."
            })
            events = []
            for line in response.text.strip().split("\n"):
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))
            complete = next(e for e in events if e["type"] == "complete")
            budget = complete["data"]["final_plan"]["budget"]
            assert budget["within_budget"] is False
            assert budget["total_estimated_cost"] > 20000
        finally:
            _clear_overrides()

    def test_over_budget_replan(self, client, over_budget_service):
        """Over-budget plan then replan should also reflect over-budget state."""
        _inject_service(over_budget_service)
        try:
            session_id = _seed_plan(client)

            resp = client.post("/api/v1/trips/plan", json={
                "user_request": "Reduce costs by staying in hostels",
                "session_id": session_id,
            })
            assert resp.status_code == 200
            body = resp.json()
            budget = body["final_plan"]["budget"]
            assert budget["within_budget"] is False
            assert budget["total_estimated_cost"] > 20000
        finally:
            _clear_overrides()
