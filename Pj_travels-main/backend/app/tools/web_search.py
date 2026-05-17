from __future__ import annotations

import json
import logging
from typing import Any
from urllib.request import Request, urlopen

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def search_exa(query: str, num_results: int = 5) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.exa_key:
        logger.warning("EXA_KEY not set — skipping search")
        return []

    payload = json.dumps({
        "query": query,
        "numResults": num_results,
    }).encode()

    req = Request(
        "https://api.exa.ai/search",
        data=payload,
        headers={
            "x-api-key": settings.exa_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        results = data.get("results", [])
        logger.info("Exa search q=%r returned %d results", query, len(results))
        return results
    except Exception as exc:
        logger.warning("Exa search failed q=%r: %s", query, exc)
        return []


def fetch_exa_contents(urls: list[str]) -> dict[str, str]:
    if not urls:
        return {}

    settings = get_settings()
    if not settings.exa_key:
        return {}

    payload = json.dumps({"ids": urls, "text": True}).encode()

    req = Request(
        "https://api.exa.ai/contents",
        data=payload,
        headers={
            "x-api-key": settings.exa_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception as exc:
        logger.warning("Exa contents failed for %d URLs: %s", len(urls), exc)
        return {}

    url_to_text: dict[str, str] = {}
    for r in data.get("results", []):
        text = r.get("text", "")
        url = r.get("url", "")
        if text and url:
            url_to_text[url] = text.strip()
    logger.info("Exa contents fetched %d/%d pages", len(url_to_text), len(urls))
    return url_to_text


def search_destination(destination: str) -> dict[str, Any]:
    queries = {
        "overview": f"{destination} travel destination overview",
        "attractions": f"top tourist attractions things to do in {destination}",
        "weather": f"{destination} weather best time to visit season",
        "food": f"local food cuisine famous dishes in {destination}",
        "transport": f"local transport getting around {destination} tips",
    }

    results: dict[str, list[dict[str, Any]]] = {}
    for key, q in queries.items():
        results[key] = search_exa(q, num_results=3)

    all_urls: list[str] = []
    seen: set[str] = set()
    for category_results in results.values():
        for r in category_results:
            url = r.get("url", "")
            if url and url not in seen:
                seen.add(url)
                all_urls.append(url)

    if all_urls:
        contents = fetch_exa_contents(all_urls)
        for category_results in results.values():
            for r in category_results:
                url = r.get("url", "")
                if url in contents:
                    r["text"] = contents[url]

    return results
