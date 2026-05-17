from __future__ import annotations

import logging

from app.agents._utils import with_trace
from app.graph.state import PlannerState
from app.models.schemas import (
    BudgetBreakdown,
    DestinationResearch,
    FinalTravelPlan,
    IntentDetails,
    ItineraryPlan,
)

logger = logging.getLogger(__name__)


def finalizer_node(state: PlannerState) -> PlannerState:
    intent = IntentDetails.model_validate(state["intent"])
    research = DestinationResearch.model_validate(state["research"])
    itinerary = ItineraryPlan.model_validate(state["itinerary"])
    budget = BudgetBreakdown.model_validate(state["budget"])

    total = round(
        budget.transportation
        + budget.accommodation
        + budget.food
        + budget.activities
        + budget.local_transport
        + budget.contingency,
        2,
    )
    budget.total_estimated_cost = total
    budget.within_budget = intent.budget_limit is None or total <= intent.budget_limit

    travel_tips = list(
        dict.fromkeys([*research.travel_tips, *budget.savings_tips, *research.cautions])
    )
    budget_status = (
        "within budget" if budget.within_budget else "above the stated budget"
    )
    summary = (
        f"{intent.duration_days}-day {intent.travel_style} trip to "
        f"{intent.destination} for {intent.travelers} traveler(s), estimated at "
        f"{budget.currency} {budget.total_estimated_cost:.0f} and currently {budget_status}."
    )

    final_plan = FinalTravelPlan(
        executive_summary=summary,
        destination_overview=research.overview,
        intent=intent,
        research=research,
        itinerary=itinerary.days,
        budget=budget,
        travel_tips=travel_tips,
        assumptions=budget.assumptions,
    )
    final_plan_output = final_plan.model_dump(mode="json")
    logger.info(
        "Final plan: %s | budget=%.0f %s itinerary=%d days",
        summary, budget.total_estimated_cost, budget.currency, len(itinerary.days),
    )
    return {
        "final_plan": final_plan_output,
        **with_trace(
            state,
            "finalizer",
            {
                "intent": state["intent"],
                "research": state["research"],
                "itinerary": state["itinerary"],
                "budget": state["budget"],
            },
            final_plan_output,
        ),
    }
