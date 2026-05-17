from __future__ import annotations

import logging
from typing import Any

from app.graph.state import PlannerState

logger = logging.getLogger(__name__)

# Token-estimation safety limits (conservative: ~4 chars per token)
CONTEXT_LIMITS: dict[str, int] = {
    "normalized_request": 2000,
    "web_context": 6000,
    "attractions_food": 1500,
    "combined_request": 3000,
    "itinerary_prompt": 4000,
}


def truncate_context(text: str, max_chars: int | None = None, label: str = "context") -> str:
    if max_chars is None or len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    logger.warning("Truncated %s from %d to %d chars", label, len(text), max_chars)
    return truncated + f"\n... [truncated: original {len(text)} chars, showing first {max_chars}]"


def summarize_previous_plan(previous_plan: dict[str, Any] | None) -> str:
    if not previous_plan:
        return "No previous trip context."

    intent = previous_plan.get("intent", {})
    destination = intent.get("destination", "unknown destination")
    duration = intent.get("duration_days", "unknown duration")
    travelers = intent.get("travelers", "unknown")
    budget_limit = intent.get("budget_limit")
    estimated_cost = previous_plan.get("budget", {}).get("total_estimated_cost", "unknown")

    parts = [
        f"Previous destination: {destination}.",
        f"Duration: {duration} days.",
        f"Travelers: {travelers}.",
    ]
    if budget_limit is not None:
        parts.append(f"User budget limit: {budget_limit}.")
    parts.append(f"Estimated trip cost: {estimated_cost}.")
    return " ".join(parts)


def with_trace(
    state: PlannerState,
    agent_name: str,
    agent_input: dict[str, Any],
    agent_output: dict[str, Any],
) -> dict[str, Any]:
    traces = dict(state.get("agent_traces", {}))
    traces[agent_name] = {
        "input": agent_input,
        "output": agent_output,
    }
    return {"agent_traces": traces}
