from __future__ import annotations

import json
import logging

from app.agents._utils import CONTEXT_LIMITS, truncate_context, with_trace
from app.graph.state import PlannerState
from app.models.schemas import ItineraryPlan
from app.services.llm import StructuredLLM

logger = logging.getLogger(__name__)


def itinerary_node(state: PlannerState, llm: StructuredLLM) -> PlannerState:
    feedback = state.get("validation_feedback")
    revision_hint = ""
    if feedback:
        revision_hint = (
            "\n\nFeedback from previous attempt:\n"
            f"{feedback}\n\n"
            "Fix these issues in your new response."
        )

    intent = state.get("intent", {})
    research = state.get("research", {})
    dest = intent.get("destination", "the destination")
    duration = intent.get("duration_days", 1)
    travelers = intent.get("travelers", 1)
    style = intent.get("travel_style", "balanced")
    top_attractions = research.get("top_attractions", [])
    food = research.get("food_highlights", [])

    system_prompt = (
        "You are the Itinerary Agent in a travel planning multi-agent system. "
        "Create a detailed day-by-day itinerary as a JSON object with a 'days' array and optional 'planning_notes'. "
        "Every day must feel unique with real place names, specific activities, and local context. "
        "Return JSON only with no extra text."
    )
    user_prompt = f"""
Create a {duration}-day itinerary for {travelers} traveler(s) to {dest}.
Trip style: {style}.
Top attractions and places to visit: {truncate_context(', '.join(top_attractions) if top_attractions else 'various local sights', CONTEXT_LIMITS['attractions_food'], 'attractions')}.
Local food and dining: {truncate_context(', '.join(food) if food else 'local cuisine', CONTEXT_LIMITS['attractions_food'], 'food')}.

Return a JSON object with this exact structure:
{{
  "days": [
    {{
      "day": 1,
      "title": "Descriptive title for the day (e.g. 'Exploring the Pink City')",
      "morning": "Detailed morning plan — start time, specific places visited, activities done, approx duration. Include real location names.",
      "afternoon": "Detailed afternoon plan — specific restaurants or cafes for lunch (name them), sights visited, activities. Include real location names.",
      "evening": "Detailed evening plan — dinner spots, evening walks, cultural shows, markets. Include real location names.",
      "meals": ["breakfast - cafe/restaurant name", "lunch - cafe/restaurant name", "dinner - cafe/restaurant name"],
      "estimated_local_cost": 1500,
      "notes": ["specific tip, booking advice, or local insight for this day"]
    }}
  ],
  "planning_notes": ["general trip tips covering transport, best times, booking advice"]
}}

RULES:
- Include exactly {duration} day entries (day 1 to {duration}).
- Every day MUST have morning, afternoon, and evening filled with detailed, specific activities for {dest}.
- Use the real attraction names and dishes from the lists above — spread them across different days.
- morning/afternoon/evening descriptions should be 2-3 sentences each with real place names and specifics.
- estimated_local_cost should be a positive number in local currency per day for all travelers.
- evening can be omitted on the last day only if it's a departure day.
- planning_notes should contain 3-5 practical tips for the whole trip.
- Return valid JSON only, no markdown fences, no commentary.
{revision_hint}
""".strip()
    itinerary = llm.generate(
        schema=ItineraryPlan,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.3,
        agent_type="itinerary",
    )
    itinerary_output = itinerary.model_dump(mode="json")
    day_count = len(itinerary_output.get("days", []))
    logger.info("Itinerary: %d days, revision=%s", day_count, bool(feedback))
    return {
        "itinerary": itinerary_output,
        **with_trace(
            state,
            "itinerary_agent",
            {
                "intent": state["intent"],
                "research": state["research"],
                "validation_feedback": feedback,
            },
            itinerary_output,
        ),
    }
