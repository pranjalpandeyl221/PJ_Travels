from __future__ import annotations

from typing import Any, TypedDict


class PlannerState(TypedDict, total=False):
    user_request: str
    session_id: str
    normalized_request: str
    previous_plan: dict[str, Any] | None
    agent_traces: dict[str, dict[str, Any]]
    orchestrator_plan: dict[str, Any]
    validation_feedback: str | None
    revision_count: dict[str, int]
    intent: dict[str, Any]
    research: dict[str, Any]
    itinerary: dict[str, Any]
    budget: dict[str, Any]
    final_plan: dict[str, Any]
