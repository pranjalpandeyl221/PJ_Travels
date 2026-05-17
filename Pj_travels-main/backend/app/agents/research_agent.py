from __future__ import annotations

import logging

from app.agents._utils import CONTEXT_LIMITS, truncate_context, with_trace
from app.graph.state import PlannerState
from app.models.schemas import DestinationResearch
from app.services.llm import StructuredLLM
from app.tools.web_search import search_destination

logger = logging.getLogger(__name__)


def research_node(state: PlannerState, llm: StructuredLLM) -> PlannerState:
    destination = state.get("intent", {}).get("destination", "")

    raw = search_destination(destination)
    snippets: list[str] = []
    for category, results in raw.items():
        for r in results:
            text = r.get("text") or r.get("snippet") or ""
            if text:
                snippets.append(f"[{category}] {text.strip()[:500]}")

    web_context = "\n\n".join(snippets) if snippets else "No web results available."

    feedback = state.get("validation_feedback")
    correction = ""
    if feedback:
        correction = (
            "\n\nYour previous response had issues that need fixing:\n"
            f"{feedback}\n\n"
            "Fix these issues in your new response."
        )

    system_prompt = (
        "You are the Research Agent in a travel planning multi-agent system. "
        "Extract real facts from the web content below. "
        "Never say 'No web results available' — if content exists, use it."
    )
    user_prompt = f"""
Destination: {destination}

Web content about {destination}:
{truncate_context(web_context, CONTEXT_LIMITS['web_context'], 'web_context')}

Return JSON matching this schema:
{DestinationResearch.model_json_schema()}

CRITICAL RULES:
- Extract real information from the web content above.
- overview must be 4-5 detailed sentences: describe the destination's character, what makes it unique, and what a traveler can expect.
- best_time_to_visit and expected_weather must use data from the content (2-3 sentences each).
- top_attractions: list 8-12 specific places, landmarks, or experiences with real names (not generic categories).
- food_highlights: list 6-8 specific dishes, restaurants, or food experiences with real names.
- local_transport: list 4-6 specific transport options available at the destination.
- travel_tips: list 4-6 practical tips (currency, language, etiquette, packing, safety).
- cautions: list 3-5 specific cautions (scams, weather risks, health concerns, peak crowds).
- destination field must be exactly "{destination}".
- Return JSON only, no commentary.
{correction}
""".strip()
    research = llm.generate(
        schema=DestinationResearch,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.2,
        agent_type="research",
    )
    research_output = research.model_dump(mode="json")
    logger.info(
        "Research: dest=%s overview_len=%d attractions=%d",
        research_output.get("destination"),
        len(research_output.get("overview", "")),
        len(research_output.get("top_attractions", [])),
    )
    return {
        "research": research_output,
        **with_trace(
            state,
            "research_agent",
            {
                "intent": state["intent"],
                "web_search_queries": list(raw.keys()),
                "validation_feedback": feedback,
            },
            research_output,
        ),
    }
