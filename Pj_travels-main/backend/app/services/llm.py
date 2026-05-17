from __future__ import annotations

import logging
import random
import re as _re
import time
from abc import ABC, abstractmethod
from typing import TypeVar

from openai import APIError, APITimeoutError, OpenAI, RateLimitError
from pydantic import BaseModel, ValidationError

from app.core.config import Settings
from app.services.json_utils import extract_json_object

logger = logging.getLogger(__name__)
ModelT = TypeVar("ModelT", bound=BaseModel)

# Per-agent retry configuration: (max_attempts, base_backoff_seconds)
AGENT_RETRY_CONFIG: dict[str, tuple[int, float]] = {
    "intent": (3, 1.0),
    "research": (4, 2.0),
    "itinerary": (4, 1.5),
    "budget": (3, 1.0),
}

DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_BASE_BACKOFF = 1.0
MAX_BACKOFF = 600  # never sleep more than 10 minutes


def _backoff(attempt: int, base_backoff: float, agent_type: str | None = None) -> None:
    delay = base_backoff * (2 ** attempt) + random.random() * base_backoff
    tag = f" agent={agent_type}" if agent_type else ""
    logger.debug("Backoff%s attempt=%d delay=%.1fs", tag, attempt, delay)
    time.sleep(delay)


def _parse_rate_limit_delay(exc: RateLimitError) -> float | None:
    """Extract retry-after delay from a 429 response, preferring the Retry-After header."""
    try:
        retry_after = exc.response.headers.get("Retry-After")
        if retry_after:
            return min(float(retry_after), MAX_BACKOFF)
    except Exception:
        pass
    # Fallback: parse message like "Please try again in 5m57.696s"
    m = _re.search(r"try again in (\d+)m([\d.]+)s", str(exc))
    if m:
        return min(int(m.group(1)) * 60 + float(m.group(2)), MAX_BACKOFF)
    return None


class StructuredLLM(ABC):
    @abstractmethod
    def generate(
        self,
        *,
        schema: type[ModelT],
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        **kwargs,
    ) -> ModelT:
        raise NotImplementedError

    @abstractmethod
    def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        **kwargs,
    ) -> str:
        """Free‑form text generation without a schema constraint."""
        raise NotImplementedError


class GroqLLM(StructuredLLM):
    def __init__(self, settings: Settings) -> None:
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is required to use Groq.")
        self._client = OpenAI(
            base_url=settings.groq_base_url,
            api_key=settings.groq_api_key,
            timeout=120,
        )
        self._model = settings.groq_model

    def generate(
        self,
        *,
        schema: type[ModelT],
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        agent_type: str | None = None,
    ) -> ModelT:
        max_attempts, base_backoff = AGENT_RETRY_CONFIG.get(agent_type, (DEFAULT_MAX_ATTEMPTS, DEFAULT_BASE_BACKOFF))
        base_system_prompt = (
            f"{system_prompt}\n\n"
            "Return one concrete JSON object that matches the requested output.\n"
            "Do not return a schema, field descriptions, markdown, or commentary.\n"
            "Never include keys such as title, type, properties, required, or $defs "
            "unless they are actual data values requested by the user."
        )
        messages = [
            {"role": "system", "content": base_system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        last_error: Exception | None = None
        for attempt in range(max_attempts):
            try:
                completion = self._client.chat.completions.create(
                    model=self._model,
                    temperature=temperature,
                    messages=messages,
                )
                content = completion.choices[0].message.content or ""
                try:
                    payload = extract_json_object(content)
                    return schema.model_validate(payload)
                except (ValueError, ValidationError) as exc:
                    last_error = exc
                    messages = [
                        {"role": "system", "content": base_system_prompt},
                        {
                            "role": "user",
                            "content": (
                                f"{user_prompt}\n\n"
                                "Your previous reply was invalid for the requested schema.\n"
                                f"Validation issue: {exc}\n"
                                f"Previous reply:\n{content}\n\n"
                                "Return only a corrected concrete JSON object."
                            ),
                        },
                    ]
            except APITimeoutError:
                logger.warning("LLM timeout on attempt %d/%d", attempt + 1, max_attempts)
                last_error = None
                if attempt < max_attempts - 1:
                    _backoff(attempt, base_backoff, agent_type)
                continue
            except RateLimitError as exc:
                delay = _parse_rate_limit_delay(exc)
                if delay is not None and attempt < max_attempts - 1:
                    logger.warning("Rate limited, waiting %.0fs before retry %d/%d", delay, attempt + 2, max_attempts)
                    last_error = None
                    time.sleep(delay)
                    continue
                logger.warning("Rate limit exhausted after %d/%d attempts, failing", attempt + 1, max_attempts)
                last_error = exc
                if attempt < max_attempts - 1:
                    _backoff(attempt, base_backoff, agent_type)
                    continue
                raise
            except APIError as exc:
                logger.warning("LLM API error on attempt %d/%d: %s", attempt + 1, max_attempts, exc)
                last_error = exc
                if attempt < max_attempts - 1:
                    _backoff(attempt, base_backoff, agent_type)
                    continue
                raise

        if last_error:
            raise last_error
        raise RuntimeError(f"LLM generation failed after {max_attempts} attempts (agent={agent_type})")

    def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        **kwargs,
    ) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        last_error: Exception | None = None
        for attempt in range(DEFAULT_MAX_ATTEMPTS):
            try:
                completion = self._client.chat.completions.create(
                    model=self._model,
                    temperature=temperature,
                    messages=messages,
                )
                return completion.choices[0].message.content or ""
            except APITimeoutError:
                logger.warning("LLM text timeout attempt %d/%d", attempt + 1, DEFAULT_MAX_ATTEMPTS)
                if attempt < DEFAULT_MAX_ATTEMPTS - 1:
                    _backoff(attempt, DEFAULT_BASE_BACKOFF, "text")
                continue
            except RateLimitError as exc:
                delay = _parse_rate_limit_delay(exc)
                if delay is not None and attempt < DEFAULT_MAX_ATTEMPTS - 1:
                    logger.warning("Rate limited (text), waiting %.0fs before retry %d/%d", delay, attempt + 2, DEFAULT_MAX_ATTEMPTS)
                    last_error = None
                    time.sleep(delay)
                    continue
                last_error = exc
                if attempt < DEFAULT_MAX_ATTEMPTS - 1:
                    _backoff(attempt, DEFAULT_BASE_BACKOFF, "text")
                    continue
                raise
            except APIError as exc:
                logger.warning("LLM text API error attempt %d/%d: %s", attempt + 1, DEFAULT_MAX_ATTEMPTS, exc)
                if attempt < DEFAULT_MAX_ATTEMPTS - 1:
                    _backoff(attempt, DEFAULT_BASE_BACKOFF, "text")
                    continue
                raise
        if last_error:
            raise last_error
        raise RuntimeError(f"LLM text generation failed after {DEFAULT_MAX_ATTEMPTS} attempts")
