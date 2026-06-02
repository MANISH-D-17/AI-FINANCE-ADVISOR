"""
LLM Router Service — Cascading AI provider with automatic fallback.

Priority: Claude (200K ctx) → Gemini (1M ctx) → Rule-based engine
Selects provider based on: token estimate, rate limit status, key availability.
All providers return identical JSON schemas.
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    CLAUDE = "claude"
    GEMINI = "gemini"
    RULES = "rules"


@dataclass
class LLMResponse:
    content: str
    provider: LLMProvider
    tokens_used: int = 0
    latency_ms: float = 0.0
    error: Optional[str] = None


@dataclass
class RateLimitState:
    """Tracks rate limit status per provider."""
    blocked_until: float = 0.0
    consecutive_errors: int = 0
    total_requests: int = 0

    def is_blocked(self) -> bool:
        return time.time() < self.blocked_until

    def mark_rate_limited(self, retry_after_seconds: int = 60):
        self.blocked_until = time.time() + retry_after_seconds
        self.consecutive_errors += 1

    def mark_success(self):
        self.consecutive_errors = 0
        self.total_requests += 1


# Module-level rate limit state (survives across requests)
_rate_limits: Dict[LLMProvider, RateLimitState] = {
    LLMProvider.CLAUDE: RateLimitState(),
    LLMProvider.GEMINI: RateLimitState(),
}


def _estimate_tokens(text: str) -> int:
    """Fast token estimation: ~4 chars per token for English/Hindi mixed."""
    return max(1, len(text) // 4)


async def _call_claude(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    response_format: str = "text",
) -> LLMResponse:
    """Call Claude claude-sonnet-4-20250514 via Anthropic SDK."""
    from config import settings

    if not getattr(settings, "ANTHROPIC_API_KEY", None):
        return LLMResponse(
            content="",
            provider=LLMProvider.CLAUDE,
            error="ANTHROPIC_API_KEY not configured",
        )

    if _rate_limits[LLMProvider.CLAUDE].is_blocked():
        return LLMResponse(
            content="",
            provider=LLMProvider.CLAUDE,
            error="Claude rate limited",
        )

    start = time.time()
    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        messages = [{"role": "user", "content": user_message}]
        if response_format == "json":
            system_prompt = (
                system_prompt
                + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown fences, "
                "no preamble, no explanation. Pure JSON object."
            )

        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
        )

        content = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens
        _rate_limits[LLMProvider.CLAUDE].mark_success()

        return LLMResponse(
            content=content,
            provider=LLMProvider.CLAUDE,
            tokens_used=tokens,
            latency_ms=(time.time() - start) * 1000,
        )

    except Exception as e:
        err_str = str(e)
        if "rate_limit" in err_str.lower() or "429" in err_str:
            _rate_limits[LLMProvider.CLAUDE].mark_rate_limited(retry_after_seconds=60)
        logger.warning(f"Claude call failed: {err_str}")
        return LLMResponse(
            content="",
            provider=LLMProvider.CLAUDE,
            error=err_str,
            latency_ms=(time.time() - start) * 1000,
        )


async def _call_gemini(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    response_format: str = "text",
) -> LLMResponse:
    """Call Gemini 2.0 Flash via Google SDK."""
    from config import settings

    if not getattr(settings, "GEMINI_API_KEY", None):
        return LLMResponse(
            content="",
            provider=LLMProvider.GEMINI,
            error="GEMINI_API_KEY not configured",
        )

    if _rate_limits[LLMProvider.GEMINI].is_blocked():
        return LLMResponse(
            content="",
            provider=LLMProvider.GEMINI,
            error="Gemini rate limited",
        )

    start = time.time()
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)

        full_prompt = system_prompt
        if response_format == "json":
            full_prompt += (
                "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown fences."
            )

        model = genai.GenerativeModel(
            "gemini-2.0-flash", system_instruction=full_prompt
        )
        response = model.generate_content(user_message)
        content = response.text

        _rate_limits[LLMProvider.GEMINI].mark_success()
        return LLMResponse(
            content=content,
            provider=LLMProvider.GEMINI,
            latency_ms=(time.time() - start) * 1000,
        )

    except Exception as e:
        err_str = str(e)
        if "quota" in err_str.lower() or "429" in err_str:
            _rate_limits[LLMProvider.GEMINI].mark_rate_limited(retry_after_seconds=60)
        logger.warning(f"Gemini call failed: {err_str}")
        return LLMResponse(
            content="",
            provider=LLMProvider.GEMINI,
            error=err_str,
            latency_ms=(time.time() - start) * 1000,
        )


async def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
    response_format: str = "text",  # "text" | "json"
    prefer_provider: Optional[LLMProvider] = None,
) -> LLMResponse:
    """
    Primary entry point. Cascades: Claude → Gemini → raises error.

    Args:
        system_prompt: Instructions for the AI.
        user_message: The actual query/content.
        max_tokens: Max response tokens.
        response_format: "text" or "json" (adds JSON instruction to prompt).
        prefer_provider: Force a specific provider (for testing).
    """
    providers_to_try = [LLMProvider.CLAUDE, LLMProvider.GEMINI]

    if prefer_provider:
        providers_to_try = [prefer_provider] + [
            p for p in providers_to_try if p != prefer_provider
        ]

    last_error = None
    for provider in providers_to_try:
        if provider == LLMProvider.CLAUDE:
            result = await _call_claude(
                system_prompt, user_message, max_tokens, response_format
            )
        elif provider == LLMProvider.GEMINI:
            result = await _call_gemini(
                system_prompt, user_message, max_tokens, response_format
            )
        else:
            continue

        if not result.error:
            logger.info(
                f"LLM call succeeded via {result.provider.value} "
                f"({result.tokens_used} tokens, {result.latency_ms:.0f}ms)"
            )
            return result

        last_error = result.error
        logger.warning(
            f"Provider {provider.value} failed: {last_error}. Trying next..."
        )

    # All providers failed
    raise RuntimeError(
        f"All LLM providers exhausted. Last error: {last_error}"
    )


async def call_llm_json(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 4096,
) -> Dict[str, Any]:
    """Convenience wrapper that guarantees a parsed JSON dict."""
    result = await call_llm(
        system_prompt=system_prompt,
        user_message=user_message,
        max_tokens=max_tokens,
        response_format="json",
    )

    text = result.content.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(
            line
            for line in lines
            if not line.startswith("```")
        ).strip()
        # Handle cases like ```json
        if text.startswith("json"):
            text = text[4:].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed from {result.provider.value}: {e}\nRaw: {text[:500]}")
        raise ValueError(f"LLM returned invalid JSON: {e}")


def get_rate_limit_status() -> Dict[str, Any]:
    """Returns current rate limit status for monitoring."""
    return {
        provider.value: {
            "is_blocked": state.is_blocked(),
            "blocked_until": state.blocked_until,
            "consecutive_errors": state.consecutive_errors,
            "total_requests": state.total_requests,
        }
        for provider, state in _rate_limits.items()
    }
