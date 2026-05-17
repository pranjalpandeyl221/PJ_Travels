from __future__ import annotations

import logging
import re
from typing import Any, Generator
from uuid import uuid4

from app.agents._utils import CONTEXT_LIMITS, truncate_context
from app.graph.builder import build_travel_planner_graph
from app.models.schemas import AgentTrace, FinalTravelPlan, TravelPlanRequest, TravelPlanResponse
from app.services.llm import StructuredLLM

logger = logging.getLogger(__name__)


_CRITICAL_KW = {
    "duration": ["day", "days", "night", "week", "month", "overnight"],
    "travelers": ["for", "with", "solo", "alone", "couple", "family",
                   "i'm", "i am", "we're", "we are", "my", "our"],
    "budget": ["inr", "usd", "eur", "gbp", "₹", "$", "€", "budget", "under", "spend"],
}
_AMBIGUOUS_FIRST = frozenset(
    {"plan", "trip", "make", "create", "need", "want", "book", "find", "get", "show"}
)


def _has_destination(text: str) -> bool:
    lower = text.lower()
    words = lower.split()
    if len(words) >= 2 and words[0] not in _AMBIGUOUS_FIRST and not words[0].replace(",", "").replace(".", "").lstrip("-").isdigit():
        return True
    return any(kw in lower for kw in (" to ", " in ", " visit "))


def _has_budget(text: str) -> bool:
    lower = text.lower()
    if any(kw in lower for kw in _CRITICAL_KW["budget"]):
        return True
    if re.search(r"\b\d{4,}\b", lower):
        return True
    if re.search(r"\b\d+\s*k\b", lower):
        return True
    return False


def _needs_clarification(request: str) -> list[str] | None:
    lower = request.lower()
    words = lower.split()

    questions: list[str] = []

    if not _has_destination(lower):
        questions.append("Where would you like to go?")

    if not any(kw in lower for kw in _CRITICAL_KW["duration"]):
        questions.append("How many days?")

    if len(words) < 6 and not any(kw in lower for kw in _CRITICAL_KW["travelers"]):
        questions.append("How many people?")

    if not _has_budget(lower):
        questions.append("What's your approximate budget?")

    return questions if questions else None


_original_requests: dict[str, str] = {}

# ---------------------------------------------------------------------------
# Follow‑up intent classification
# ---------------------------------------------------------------------------

_FOLLOWUP_SUMMARY = frozenset({
    "summarize", "summary", "overview", "recap", "tl;dr", "brief",
    "gist", "key points", "tell me about the trip", "sum up",
})

_FOLLOWUP_QUESTION = frozenset({
    "what", "how", "when", "where", "why", "which", "can you",
    "tell me", "is there", "are there", "do we", "will we",
})


def _classify_followup(request: str) -> str:
    """Returns 'summary', 'question', or 'replan'."""
    lower = request.lower().strip()
    if any(kw in lower for kw in _FOLLOWUP_SUMMARY):
        return "summary"
    if any(kw in lower for kw in _FOLLOWUP_QUESTION):
        return "question"
    return "replan"


# ---------------------------------------------------------------------------


class TravelPlannerService:
    def __init__(self, llm: StructuredLLM) -> None:
        self._llm = llm
        self._graph = build_travel_planner_graph(llm)
        logger.info("Travel planner graph built")

    # ------------------------------------------------------------------
    # Chat‑style helpers — answer questions and summarize from existing plan
    # ------------------------------------------------------------------

    def _summarize_trip(self, plan: dict[str, Any]) -> str:
        intent = plan.get("intent", {})
        budget = plan.get("budget", {})
        itinerary_raw = plan.get("itinerary", {})
        itinerary = itinerary_raw if isinstance(itinerary_raw, list) else itinerary_raw.get("days", [])
        prompt = (
            f"Summarize this trip in 3-4 concise bullet points:\n"
            f"Destination: {intent.get('destination')}\n"
            f"Duration: {intent.get('duration_days')} days\n"
            f"Travelers: {intent.get('travelers')}\n"
            f"Budget: {intent.get('budget_currency', 'INR')} {budget.get('total_estimated_cost', 0)}\n"
            f"Itinerary: {[d.get('title') for d in itinerary[:7]]}\n"
            f"Travel tips: {plan.get('travel_tips', [])[:3]}"
        )
        return self._llm.generate_text(
            system_prompt="You are a helpful travel assistant. Summarize the trip concisely.",
            user_prompt=prompt,
            temperature=0.3,
        )

    def _answer_question(self, plan: dict[str, Any], question: str) -> str:
        itinerary_raw = plan.get("itinerary", {})
        itinerary_days = itinerary_raw if isinstance(itinerary_raw, list) else itinerary_raw.get("days", [])
        plan_json = {
            "destination": plan.get("intent", {}).get("destination"),
            "duration_days": plan.get("intent", {}).get("duration_days"),
            "travelers": plan.get("intent", {}).get("travelers"),
            "budget": plan.get("budget", {}),
            "itinerary": itinerary_days[:7],
            "research": {
                "overview": plan.get("research", {}).get("overview", "")[:500],
                "top_attractions": plan.get("research", {}).get("top_attractions", [])[:8],
                "food_highlights": plan.get("research", {}).get("food_highlights", [])[:6],
            },
            "travel_tips": plan.get("travel_tips", [])[:5],
        }
        import json as _json
        prompt = (
            f"The user has an existing trip plan. Answer their question using ONLY the plan data below.\n\n"
            f"Plan data:\n{_json.dumps(plan_json, indent=2)}\n\n"
            f"User question: {question}\n\n"
            f"Answer concisely and helpfully using information from the plan."
        )
        return self._llm.generate_text(
            system_prompt="You are a helpful travel assistant. Answer questions based on the user's existing trip plan. Be concise and accurate.",
            user_prompt=prompt,
            temperature=0.3,
        )

    def plan_trip(self, request: TravelPlanRequest) -> TravelPlanResponse:
        session_id = request.session_id or str(uuid4())

        if not request.session_id:
            _original_requests[session_id] = request.user_request
            questions = _needs_clarification(request.user_request)
            if questions:
                logger.info("Clarification: session=%s qns=%d", session_id, len(questions))
                return TravelPlanResponse(
                    session_id=session_id,
                    request=request.user_request,
                    questions=questions,
                )

        previous_plan: dict | None = None
        if request.session_id:
            try:
                prev = self._graph.get_state(
                    {"configurable": {"thread_id": request.session_id}}
                )
                if prev and prev.values.get("final_plan"):
                    previous_plan = prev.values["final_plan"]
                    logger.info("Loaded previous plan for session=%s", session_id)
            except Exception:
                logger.debug("No previous state for session=%s", session_id)

            # ── Chat‑style follow‑ups (summary / question) ──────────────
            if previous_plan:
                intent_type = _classify_followup(request.user_request)
                if intent_type == "summary":
                    reply = self._summarize_trip(previous_plan)
                    return TravelPlanResponse(
                        session_id=session_id, request=request.user_request, chat_reply=reply,
                    )
                if intent_type == "question":
                    reply = self._answer_question(previous_plan, request.user_request)
                    return TravelPlanResponse(
                        session_id=session_id, request=request.user_request, chat_reply=reply,
                    )

        # Combine original request context with the current follow-up
        original = _original_requests.get(session_id, "")
        user_input = request.user_request
        if original and original.lower() != user_input.lower():
            user_input = f"{original} {user_input}"
            logger.info("Combined request: session=%s len=%d", session_id, len(user_input))

        # Cap combined request to prevent context window overflow
        user_input = truncate_context(user_input, CONTEXT_LIMITS["combined_request"], "combined_request")

        logger.info(
            "Invoking graph: session=%s request=%r",
            session_id, user_input[:120],
        )
        result = self._graph.invoke(
            {
                "user_request": user_input,
                "session_id": session_id,
                "previous_plan": previous_plan,
            },
            config={"configurable": {"thread_id": session_id}},
        )
        return TravelPlanResponse(
            session_id=session_id,
            request=request.user_request,
            final_plan=FinalTravelPlan.model_validate(result["final_plan"]),
            agent_outputs={
                "intent_agent": result["intent"],
                "research_agent": result["research"],
                "itinerary_agent": result["itinerary"],
                "budget_agent": result["budget"],
            },
            agent_traces={
                key: AgentTrace.model_validate(value)
                for key, value in result.get("agent_traces", {}).items()
            },
        )

    # ------------------------------------------------------------------
    # Streaming variant — yields SSE-compatible dicts per agent
    # ------------------------------------------------------------------

    def plan_trip_stream(self, request: TravelPlanRequest) -> Generator[dict[str, Any], None, None]:
        session_id = request.session_id or str(uuid4())

        # Clarification check (non-streaming — returned immediately)
        if not request.session_id:
            _original_requests[session_id] = request.user_request
            questions = _needs_clarification(request.user_request)
            if questions:
                yield {"type": "questions", "session_id": session_id, "request": request.user_request, "data": questions}
                return

        # Previous plan for follow-up requests
        previous_plan: dict | None = None
        if request.session_id:
            try:
                prev = self._graph.get_state({"configurable": {"thread_id": request.session_id}})
                if prev and prev.values.get("final_plan"):
                    previous_plan = prev.values["final_plan"]
            except Exception:
                pass

            # ── Chat‑style follow‑ups (summary / question) ──────────────
            if previous_plan:
                intent_type = _classify_followup(request.user_request)
                if intent_type == "summary":
                    logger.info("Follow‑up summary: session=%s", session_id)
                    reply = self._summarize_trip(previous_plan)
                    yield {"type": "session", "session_id": session_id, "request": request.user_request}
                    yield {"type": "chat_reply", "session_id": session_id, "data": reply}
                    return
                if intent_type == "question":
                    logger.info("Follow‑up question: session=%s q=%r", session_id, request.user_request[:80])
                    reply = self._answer_question(previous_plan, request.user_request)
                    yield {"type": "session", "session_id": session_id, "request": request.user_request}
                    yield {"type": "chat_reply", "session_id": session_id, "data": reply}
                    return

        # Combine original + follow-up
        original = _original_requests.get(session_id, "")
        user_input = request.user_request
        if original and original.lower() != user_input.lower():
            user_input = f"{original} {user_input}"

        # Cap combined request to prevent context window overflow
        user_input = truncate_context(user_input, CONTEXT_LIMITS["combined_request"], "combined_request")

        yield {"type": "session", "session_id": session_id, "request": request.user_request}

        logger.info("Streaming graph: session=%s request=%r", session_id, user_input[:120])

        accumulated: dict[str, Any] = {}
        for event in self._graph.stream(
            {
                "user_request": user_input,
                "session_id": session_id,
                "previous_plan": previous_plan,
            },
            config={"configurable": {"thread_id": session_id}},
        ):
            for node_name, updates in event.items():
                if node_name == "intent_agent":
                    accumulated["intent"] = updates.get("intent")
                    accumulated["agent_traces"] = updates.get("agent_traces")
                    yield {"type": "intent", "data": updates.get("intent", {})}
                elif node_name == "research_agent":
                    accumulated["research"] = updates.get("research")
                    yield {"type": "research", "data": updates.get("research", {})}
                elif node_name == "itinerary_agent":
                    accumulated["itinerary"] = updates.get("itinerary")
                    yield {"type": "itinerary", "data": updates.get("itinerary", {})}
                elif node_name == "budget_agent":
                    accumulated["budget"] = updates.get("budget")
                    yield {"type": "budget", "data": updates.get("budget", {})}
                elif node_name == "finalizer":
                    accumulated["final_plan"] = updates.get("final_plan")
                    accumulated["agent_traces"] = updates.get("agent_traces")
                    result = TravelPlanResponse(
                        session_id=session_id,
                        request=request.user_request,
                        final_plan=FinalTravelPlan.model_validate(accumulated["final_plan"]),
                        agent_outputs={
                            "intent_agent": accumulated.get("intent"),
                            "research_agent": accumulated.get("research"),
                            "itinerary_agent": accumulated.get("itinerary"),
                            "budget_agent": accumulated.get("budget"),
                        },
                        agent_traces={
                            key: AgentTrace.model_validate(value)
                            for key, value in (accumulated.get("agent_traces") or {}).items()
                        },
                    )
                    yield {"type": "complete", "data": result.model_dump(mode="json")}
                    logger.info(
                        "Stream complete: session=%s dest=%s",
                        session_id,
                        accumulated.get("final_plan", {}).get("intent", {}).get("destination", "?"),
                    )
