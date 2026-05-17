from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def check_intent(intent: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if not intent.get("destination"):
        issues.append("No destination was extracted. Infer a destination from the user request.")
    duration = intent.get("duration_days")
    if not duration or not isinstance(duration, (int, float)) or duration < 1:
        issues.append("Invalid or missing duration. Infer a reasonable number of days.")
    if issues:
        logger.warning("Intent validation failed: %s", "; ".join(issues))
    return issues


def check_research(research: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if not research.get("overview") or len(str(research.get("overview", "")).strip()) < 20:
        issues.append("Research overview is too brief or missing. Provide a meaningful destination overview.")
    if not research.get("top_attractions"):
        issues.append("Missing top attractions list.")
    if issues:
        logger.warning("Research validation failed: %s", "; ".join(issues))
    return issues


def check_itinerary(intent: dict[str, Any], itinerary: dict[str, Any]) -> list[str]:
    days = itinerary.get("days", [])
    expected = intent.get("duration_days", len(days))
    issues: list[str] = []
    if not days:
        issues.append("No itinerary days were generated.")
    elif len(days) != expected:
        issues.append(f"Generated {len(days)} days but expected {expected}. Adjust the day count.")
    else:
        empty_days = [d.get("day") for d in days if not d.get("morning") and not d.get("afternoon")]
        if empty_days:
            issues.append(f"Days {empty_days} have no activities scheduled.")
    if issues:
        logger.warning("Itinerary validation failed: %s", "; ".join(issues))
    return issues


def check_budget(intent: dict[str, Any], budget: dict[str, Any]) -> str | None:
    limit = intent.get("budget_limit")
    total = budget.get("total_estimated_cost", 0)
    if limit is not None and total > limit:
        overshoot = total - limit
        logger.info("Budget over limit: total=%.0f limit=%.0f overshoot=%.0f", total, limit, overshoot)
        return (
            f"The total cost ({total:.0f}) exceeds budget ({limit:.0f}) by {overshoot:.0f}. "
            f"Revise the itinerary to reduce costs to fit within {limit:.0f}."
        )
    return None
