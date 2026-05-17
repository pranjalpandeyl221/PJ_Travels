from __future__ import annotations

import json
import logging

from app.agents._utils import with_trace
from app.graph.state import PlannerState
from app.models.schemas import BudgetBreakdown
from app.services.llm import StructuredLLM

logger = logging.getLogger(__name__)


def budget_node(state: PlannerState, llm: StructuredLLM) -> PlannerState:
    intent_json = json.dumps(state.get("intent", {}), indent=2)
    itinerary_json = json.dumps(state.get("itinerary", {}), indent=2)
    currency = state.get("intent", {}).get("budget_currency", "INR")

    system_prompt = (
        "You are the Budget Agent in a travel planning multi-agent system. "
        "Estimate every cost category as a specific positive number in the local currency. "
        "Return JSON only."
    )
    user_prompt = f"""
Intent (JSON):
{intent_json}

Itinerary (JSON):
{itinerary_json}

Calculate a realistic budget in {currency} and return JSON with these exact keys:
- currency: "{currency}"
- transportation: number > 0 (how to reach and move around)
- accommodation: number > 0 (hotel/guesthouse for all nights)
- food: number > 0 (meals for all days for all travelers)
- activities: number > 0 (entry fees, tours, guides)
- local_transport: number > 0 (rickshaws, cabs, buses)
- contingency: number > 0 (emergency buffer, 5-10% of total)
- total_estimated_cost: number > 0 (sum of all above)
- within_budget: true/false (based on budget_limit field)
- savings_tips: list of strings
- assumptions: list of strings

RULES:
- Every cost field MUST be a positive number > 0. Never return 0.
- Scale costs by duration_days and travelers from the intent.
- Use reasonable local prices for the destination.
- Return JSON only, no text before or after.
""".strip()
    budget = llm.generate(
        schema=BudgetBreakdown,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.15,
        agent_type="budget",
    )
    budget_output = budget.model_dump(mode="json")
    total = budget_output.get("total_estimated_cost", 0)
    logger.info(
        "Budget: total=%.0f %s acc=%.0f food=%.0f transport=%.0f act=%.0f",
        total, budget_output.get("currency", "INR"),
        budget_output.get("accommodation", 0),
        budget_output.get("food", 0),
        budget_output.get("transportation", 0),
        budget_output.get("activities", 0),
    )
    return {
        "budget": budget_output,
        **with_trace(
            state,
            "budget_agent",
            {
                "intent": state["intent"],
                "itinerary": state["itinerary"],
            },
            budget_output,
        ),
    }
