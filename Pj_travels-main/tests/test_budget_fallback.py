from app.models.schemas import BudgetBreakdown, IntentDetails, ItineraryPlan


def test_budget_zeros_remain_zeros_when_llm_returns_no_data() -> None:
    intent = IntentDetails(
        destination="Goa",
        duration_days=5,
        budget_currency="INR",
        budget_limit=20000,
        travelers=1,
        travel_style="budget",
    )
    itinerary = ItineraryPlan(
        days=[
            {
                "day": day,
                "title": f"Day {day}",
                "morning": "Morning",
                "afternoon": "Afternoon",
                "evening": "Evening",
                "estimated_local_cost": 1200,
            }
            for day in range(1, 6)
        ]
    )
    budget = BudgetBreakdown(currency="INR")

    total = round(
        budget.transportation
        + budget.accommodation
        + budget.food
        + budget.activities
        + budget.local_transport
        + budget.contingency,
        2,
    )

    assert total == 0
    assert budget.transportation == 0
    assert budget.accommodation == 0
    assert budget.food == 0
    assert budget.activities == 0
    assert budget.local_transport == 0
    assert budget.contingency == 0
