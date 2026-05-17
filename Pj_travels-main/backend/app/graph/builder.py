from __future__ import annotations

import logging

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from app.agents import validators
from app.agents.budget_agent import budget_node
from app.agents.finalizer import finalizer_node
from app.agents.intent_agent import intent_node
from app.agents.itinerary_agent import itinerary_node
from app.agents.orchestrator import orchestrator_node
from app.agents.research_agent import research_node
from app.graph.state import PlannerState
from app.services.llm import StructuredLLM

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Validation nodes — run quality checks and manage retry counters
# ---------------------------------------------------------------------------


def _validate_intent_node(state: PlannerState) -> dict:
    issues = validators.check_intent(state.get("intent", {}))
    revisions = dict(state.get("revision_count", {}))
    if issues and revisions.get("intent", 0) < 2:
        revisions["intent"] = revisions.get("intent", 0) + 1
        logger.info("Intent validation failed (attempt %d), retrying: %s", revisions["intent"], "; ".join(issues))
        return {"validation_feedback": "; ".join(issues), "revision_count": revisions}
    return {"validation_feedback": None}


def _validate_research_node(state: PlannerState) -> dict:
    issues = validators.check_research(state.get("research", {}))
    revisions = dict(state.get("revision_count", {}))
    if issues and revisions.get("research", 0) < 2:
        revisions["research"] = revisions.get("research", 0) + 1
        logger.info("Research validation failed (attempt %d), retrying: %s", revisions["research"], "; ".join(issues))
        return {"validation_feedback": "; ".join(issues), "revision_count": revisions}
    return {"validation_feedback": None}


def _validate_itinerary_node(state: PlannerState) -> dict:
    issues = validators.check_itinerary(state.get("intent", {}), state.get("itinerary", {}))
    revisions = dict(state.get("revision_count", {}))
    if issues and revisions.get("itinerary", 0) < 2:
        revisions["itinerary"] = revisions.get("itinerary", 0) + 1
        logger.info("Itinerary validation failed (attempt %d), retrying: %s", revisions["itinerary"], "; ".join(issues))
        return {"validation_feedback": "; ".join(issues), "revision_count": revisions}
    return {"validation_feedback": None}


def _validate_budget_node(state: PlannerState) -> dict:
    intent = state.get("intent", {})
    budget = state.get("budget", {})
    limit = intent.get("budget_limit")
    total = budget.get("total_estimated_cost", 0)
    if limit is not None and total > limit:
        logger.info("Budget exceeded: total=%.0f limit=%.0f — frontend will warn user", total, limit)
    return {"validation_feedback": None}


# ---------------------------------------------------------------------------
# Routing functions — 1:1 with validation nodes above
# ---------------------------------------------------------------------------


def _route_intent(state: PlannerState) -> str:
    if state.get("validation_feedback") and state.get("revision_count", {}).get("intent", 0) <= 2:
        logger.info("Graph route: validate_intent -> intent_agent (revision)")
        return "intent_agent"
    logger.info("Graph route: validate_intent -> research_agent")
    return "research_agent"


def _route_research(state: PlannerState) -> str:
    if state.get("validation_feedback") and state.get("revision_count", {}).get("research", 0) <= 2:
        logger.info("Graph route: validate_research -> research_agent (revision)")
        return "research_agent"
    logger.info("Graph route: validate_research -> itinerary_agent")
    return "itinerary_agent"


def _route_itinerary(state: PlannerState) -> str:
    if state.get("validation_feedback") and state.get("revision_count", {}).get("itinerary", 0) <= 2:
        logger.info("Graph route: validate_itinerary -> itinerary_agent (revision)")
        return "itinerary_agent"
    logger.info("Graph route: validate_itinerary -> budget_agent")
    return "budget_agent"


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------


def build_travel_planner_graph(llm: StructuredLLM):
    builder = StateGraph(PlannerState)

    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("intent_agent", lambda s: intent_node(s, llm))
    builder.add_node("validate_intent", _validate_intent_node)
    builder.add_node("research_agent", lambda s: research_node(s, llm))
    builder.add_node("validate_research", _validate_research_node)
    builder.add_node("itinerary_agent", lambda s: itinerary_node(s, llm))
    builder.add_node("validate_itinerary", _validate_itinerary_node)
    builder.add_node("budget_agent", lambda s: budget_node(s, llm))
    builder.add_node("validate_budget", _validate_budget_node)
    builder.add_node("finalizer", finalizer_node)

    # Linear chain with validation gates
    builder.add_edge(START, "orchestrator")
    builder.add_edge("orchestrator", "intent_agent")
    builder.add_edge("intent_agent", "validate_intent")
    builder.add_conditional_edges("validate_intent", _route_intent, {
        "intent_agent": "intent_agent",
        "research_agent": "research_agent",
    })
    builder.add_edge("research_agent", "validate_research")
    builder.add_conditional_edges("validate_research", _route_research, {
        "research_agent": "research_agent",
        "itinerary_agent": "itinerary_agent",
    })
    builder.add_edge("itinerary_agent", "validate_itinerary")
    builder.add_conditional_edges("validate_itinerary", _route_itinerary, {
        "itinerary_agent": "itinerary_agent",
        "budget_agent": "budget_agent",
    })
    builder.add_edge("budget_agent", "validate_budget")
    builder.add_edge("validate_budget", "finalizer")
    builder.add_edge("finalizer", END)

    return builder.compile(checkpointer=InMemorySaver())
