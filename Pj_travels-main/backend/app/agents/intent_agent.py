from __future__ import annotations

import logging

from app.agents._utils import CONTEXT_LIMITS, summarize_previous_plan, truncate_context, with_trace
from app.graph.state import PlannerState
from app.models.schemas import IntentDetails
from app.services.llm import StructuredLLM

logger = logging.getLogger(__name__)


def intent_node(state: PlannerState, llm: StructuredLLM) -> PlannerState:
    feedback = state.get("validation_feedback")
    correction = ""
    if feedback:
        correction = (
            "\n\nYour previous response had issues that need fixing:\n"
            f"{feedback}\n\n"
            "Fix these issues in your new response."
        )

    hints = state.get("orchestrator_plan", {})
    hint_lines = []
    if hints.get("destination_hint"):
        hint_lines.append(f"- Destination hint: {hints['destination_hint']}")
    if hints.get("duration_hint"):
        hint_lines.append(f"- Duration hint: {hints['duration_hint']} days")
    if hints.get("budget_hint"):
        hint_lines.append(f"- Budget hint: {hints['budget_hint']}")
    if hints.get("travelers_hint"):
        hint_lines.append(f"- Travelers hint: {hints['travelers_hint']}")
    if hints.get("interests_hint"):
        hint_lines.append(f"- Interests hint: {', '.join(hints['interests_hint'])}")
    if hints.get("suggested_pacing"):
        hint_lines.append(f"- Pace hint: {hints['suggested_pacing']}")
    hint_block = "\n".join(hint_lines)
    if hint_block:
        hint_block = "\nRequest analysis hints:\n" + hint_block

    has_previous = bool(state.get("previous_plan"))
    system_prompt = (
        "You are the Intent Agent in a travel planning multi-agent system. "
        "Extract the trip requirements and return JSON only."
    )

    follow_up_rules = ""
    if has_previous:
        follow_up_rules = """
FOLLOW-UP MATH RULES (apply when Previous context is provided above):
- The "Current user request" includes the ORIGINAL request followed by the user's new modification.
- If the user adds travelers (e.g. "add one more person"), INCREASE travelers from the previous plan's count.
- If the user mentions contributing money (e.g. "contribute 12k", "add 12k to budget"), ADD that amount to the previous plan's USER BUDGET LIMIT to get the new budget_limit.
- The budget_limit must equal the TOTAL available money: original_budget_limit + all contributions.
- If no new budget contribution is mentioned, keep budget_limit from the previous plan.
- Keep destination, duration_days, and travel_style from the previous plan unless the user explicitly changes them.
"""

    user_prompt = f"""
Current user request:
{truncate_context(state['normalized_request'], CONTEXT_LIMITS['normalized_request'], 'normalized_request')}

Previous context:
{summarize_previous_plan(state.get("previous_plan"))}
{hint_block}
Return JSON that matches this schema:
{IntentDetails.model_json_schema()}

Rules:
- Infer sensible defaults when the user omits details.
- Use INR unless another currency is explicit.
- If children are mentioned, include their ages in kids_ages.
- Detect transport_preference from phrases like "rent a car", "rental bike", "local taxi", "public transport".
- Keep interests and constraints concise.
- Do not include any commentary outside the JSON object.
{follow_up_rules}
{correction}
""".strip()
    intent = llm.generate(
        schema=IntentDetails,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        agent_type="intent",
    )
    intent_output = intent.model_dump(mode="json")
    logger.info(
        "Intent: dest=%s dur=%d travellers=%d budget=%.0f %s",
        intent_output.get("destination"), intent_output.get("duration_days", 0),
        intent_output.get("travelers", 1), intent_output.get("budget_limit", 0) or 0,
        intent_output.get("budget_currency", "INR"),
    )
    return {
        "intent": intent_output,
        **with_trace(
            state,
            "intent_agent",
            {
                "normalized_request": state["normalized_request"],
                "previous_plan_summary": summarize_previous_plan(state.get("previous_plan")),
                "orchestrator_hints": hints,
                "validation_feedback": feedback,
            },
            intent_output,
        ),
    }
