from __future__ import annotations

import logging
import re

from app.agents._utils import with_trace
from app.graph.state import PlannerState

logger = logging.getLogger(__name__)


_INTEREST_KEYWORDS: dict[str, list[str]] = {
    "adventure": ["trek", "hike", "adventure", "climb", "raft", "bungee", "camp"],
    "beach": ["beach", "coast", "sea", "ocean", "surf", "island", "sun"],
    "culture": ["museum", "heritage", "history", "temple", "palace", "culture"],
    "food": ["food", "cuisine", "eat", "cook", "street food", "dining"],
    "nature": ["nature", "wildlife", "forest", "national park", "mountain"],
    "shopping": ["shop", "market", "mall", "boutique", "souvenir"],
    "nightlife": ["night", "club", "bar", "pub", "party"],
    "relaxation": ["relax", "spa", "wellness", "leisure", "quiet", "retreat"],
}

_PACING_KW: dict[str, list[str]] = {
    "relaxed": ["relax", "slow", "leisure", "unwind", "peaceful", "easy"],
    "packed": ["packed", "fast", "intense", "action", "full", "maximize"],
}


def _analyze_request(request: str) -> dict[str, Any]:
    lower = request.lower()

    destination = None
    words = lower.split()
    idx_words = ["to", "in", "for", "at"]
    for i, w in enumerate(words):
        if w in idx_words and i + 1 < len(words):
            candidate = words[i + 1].strip(".,!?;:")
            if candidate not in {"a", "an", "the", "some", "my", "our"}:
                destination = candidate

    duration = None
    dur_match = re.search(r"(\d+)\s*(day|night|week)", lower)
    if dur_match:
        duration = int(dur_match.group(1))

    budget = None
    # Match currency-prefixed numbers
    for curr_sym in ["inr", "usd", "eur", "gbp", "₹", "$", "€"]:
        pattern = rf"{curr_sym}\s*(\d[\d,]*)" if curr_sym.isalpha() else rf"{curr_sym}\s*(\d[\d,]*)"
        m = re.search(pattern, lower)
        if m:
            budget = float(m.group(1).replace(",", ""))
            break
    # Match "k" suffix (e.g. "63k", "12k", "63K")
    if budget is None:
        k_match = re.search(r"(\d+)\s*k\b", lower)
        if k_match:
            budget = float(k_match.group(1)) * 1000

    travelers = None
    t_match = re.search(r"(\d+)\s*(traveler|person|people|friend|solo)", lower)
    if t_match:
        travelers = int(t_match.group(1))

    interests: list[str] = []
    for interest, keywords in _INTEREST_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            interests.append(interest)

    pacing = "balanced"
    for p, keywords in _PACING_KW.items():
        if any(kw in lower for kw in keywords):
            pacing = p
            break

    word_count = len(words)
    if word_count < 8:
        complexity = "simple"
    elif word_count < 20:
        complexity = "moderate"
    else:
        complexity = "complex"

    return {
        "destination_hint": destination,
        "duration_hint": duration,
        "budget_hint": budget,
        "travelers_hint": travelers,
        "interests_hint": interests,
        "suggested_pacing": pacing,
        "complexity": complexity,
        "has_budget_constraint": budget is not None,
        "has_duration_constraint": duration is not None,
    }


def orchestrator_node(state: PlannerState) -> PlannerState:
    plan = _analyze_request(state["user_request"])
    logger.info(
        "Orchestrator: dest=%s dur=%s budget=%s travellers=%s complexity=%s",
        plan.get("destination_hint"), plan.get("duration_hint"),
        plan.get("budget_hint"), plan.get("travelers_hint"),
        plan.get("complexity"),
    )
    output = {
        "normalized_request": state["user_request"].strip(),
        "previous_plan": state.get("previous_plan"),
        "orchestrator_plan": plan,
    }
    return {
        **output,
        **with_trace(
            state,
            "orchestrator",
            {
                "user_request": state["user_request"],
                "session_id": state.get("session_id"),
            },
            {k: v for k, v in output.items() if k != "orchestrator_plan"},
        ),
    }
