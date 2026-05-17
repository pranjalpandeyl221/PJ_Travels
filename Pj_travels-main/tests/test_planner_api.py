from fastapi.testclient import TestClient

from app.api.routes import trips
from app.main import app
from app.models.schemas import (
    BudgetBreakdown,
    DestinationResearch,
    IntentDetails,
    ItineraryPlan,
)
from app.services.llm import StructuredLLM


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


def test_plan_trip_endpoint_returns_structured_response() -> None:
    trips.get_travel_planner_service.cache_clear()
    app.dependency_overrides[trips.get_travel_planner_service] = lambda: trips.TravelPlannerService(
        StubStructuredLLM()
    )
    client = TestClient(app)

    response = client.post(
        "/api/v1/trips/plan",
        json={"user_request": "Plan a 5-day budget trip to Goa under 20000 INR."},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["final_plan"]["intent"]["destination"] == "Goa"
    assert len(body["final_plan"]["itinerary"]) == 5
    assert body["final_plan"]["budget"]["total_estimated_cost"] == 20000
    assert body["agent_outputs"]["budget_agent"]["currency"] == "INR"
    assert body["agent_traces"]["intent_agent"]["input"]["normalized_request"].startswith("Plan a 5-day")
    assert body["agent_traces"]["budget_agent"]["output"]["currency"] == "INR"
