from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TravelPlanRequest(BaseModel):
    user_request: str = Field(..., min_length=1, description="Natural language travel request.")
    session_id: str | None = Field(
        default=None,
        description="Optional thread identifier for short-term memory across requests.",
    )


class AgentTrace(BaseModel):
    input: dict[str, Any]
    output: dict[str, Any]


class IntentDetails(BaseModel):
    destination: str = Field(..., description="Primary destination for the trip.")
    duration_days: int = Field(..., ge=1, le=30)
    budget_currency: str = Field(default="INR")
    budget_limit: float | None = Field(default=None, ge=0)
    origin: str | None = None
    travelers: int = Field(default=1, ge=1, le=20)
    kids_ages: list[int] = Field(default_factory=list, description="Ages of any children traveling.")
    transport_preference: str | None = Field(
        default=None,
        description="Preferred transport: rental_car, rental_bike, taxi, public_transit, mixed",
    )
    travel_style: str = Field(default="balanced")
    interests: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    pacing: str = Field(default="balanced")
    lodging_preference: str | None = None


class DestinationResearch(BaseModel):
    destination: str
    overview: str
    best_time_to_visit: str
    expected_weather: str
    top_attractions: list[str] = Field(default_factory=list)
    food_highlights: list[str] = Field(default_factory=list)
    local_transport: list[str] = Field(default_factory=list)
    travel_tips: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)


class DayPlan(BaseModel):
    day: int = Field(..., ge=1)
    title: str
    morning: str
    afternoon: str
    evening: str
    meals: list[str] = Field(default_factory=list)
    estimated_local_cost: float = Field(default=0, ge=0)
    notes: list[str] = Field(default_factory=list)


class ItineraryPlan(BaseModel):
    days: list[DayPlan] = Field(default_factory=list)
    planning_notes: list[str] = Field(default_factory=list)


class BudgetBreakdown(BaseModel):
    currency: str = "INR"
    transportation: float = Field(default=0, ge=0)
    accommodation: float = Field(default=0, ge=0)
    food: float = Field(default=0, ge=0)
    activities: float = Field(default=0, ge=0)
    local_transport: float = Field(default=0, ge=0)
    contingency: float = Field(default=0, ge=0)
    total_estimated_cost: float = Field(default=0, ge=0)
    within_budget: bool = True
    savings_tips: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class FinalTravelPlan(BaseModel):
    executive_summary: str
    destination_overview: str
    intent: IntentDetails
    research: DestinationResearch
    itinerary: list[DayPlan]
    budget: BudgetBreakdown
    travel_tips: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class TravelPlanResponse(BaseModel):
    session_id: str
    request: str
    final_plan: FinalTravelPlan | None = None
    agent_outputs: dict[str, Any] = Field(default_factory=dict)
    agent_traces: dict[str, AgentTrace] = Field(default_factory=dict)
    questions: list[str] | None = None
    chat_reply: str | None = None
