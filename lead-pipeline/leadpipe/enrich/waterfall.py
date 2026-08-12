"""Run leads through providers in order until one produces contact details.

A waterfall exists because no single provider covers more than roughly half a
list. Trying two or three in sequence is what moves hit rate from ~50% to ~80%,
and running the cheap one last means we only pay when the paid one misses.
"""

from __future__ import annotations

from typing import Any, Callable, Iterable

from ..models import Lead
from ..scoring import IcpConfig
from .base import ContactResult, Provider
from .contactout import ContactOutProvider
from .pattern import PatternProvider

PROVIDER_REGISTRY: dict[str, Callable[[], Provider]] = {
    "contactout": ContactOutProvider,
    "pattern": PatternProvider,
}


def build_providers(names: Iterable[str]) -> list[Provider]:
    """Instantiate providers by name, skipping unknown entries."""
    providers: list[Provider] = []
    for name in names:
        factory = PROVIDER_REGISTRY.get(name)
        if factory is None:
            print(f"  ! unknown provider '{name}' in icp.yaml — skipping")
            continue
        providers.append(factory())
    return providers


def enrich_lead(
    lead: Lead,
    providers: list[Provider],
    fetch_phone: bool = False,
    stop_on_verified: bool = True,
) -> Lead:
    """Apply providers in order, keeping the best result seen.

    'Best' means a verified email beats a guessed one. A guess from an early
    provider is retained while later providers are tried, so we never downgrade
    a lead to empty just because provider #2 returned nothing.
    """
    best: ContactResult | None = None

    for provider in providers:
        if not provider.available():
            continue

        result = provider.find(lead, fetch_phone=fetch_phone)

        # Phones are rarer than emails; take one from any provider that has it.
        if result.phone and not lead.phone:
            lead.phone = result.phone
            lead.phone_source = result.source

        if not result.found_email:
            continue

        if best is None or (result.status == "verified" and best.status != "verified"):
            best = result

        if result.status == "verified" and stop_on_verified:
            break

    if best is not None:
        lead.email = best.email
        lead.email_status = best.status
        lead.email_source = best.source
    elif not lead.email:
        lead.email_status = "not_found"

    return lead


def enrich_all(
    leads: list[Lead],
    config: IcpConfig,
    progress: bool = True,
) -> dict[str, Any]:
    """Enrich the buckets named in icp.yaml. Returns run statistics."""
    settings = config.enrichment
    providers = build_providers(settings.get("waterfall", ["contactout", "pattern"]))
    target_buckets = set(settings.get("enrich_buckets", ["qualified"]))
    fetch_phone = bool(settings.get("fetch_phone", False))
    stop_on_verified = bool(settings.get("stop_on_verified", True))

    configured = [p.name for p in providers if p.available()]
    skipped = [p.name for p in providers if not p.available()]
    if skipped:
        print(f"  ! not configured, skipping: {', '.join(skipped)}")
    if not configured:
        print("  ! no enrichment provider is configured — nothing to do")

    targets = [lead for lead in leads if lead.bucket in target_buckets]
    stats = {
        "attempted": len(targets),
        "verified": 0,
        "guessed": 0,
        "not_found": 0,
        "phones": 0,
        "by_provider": {},
    }

    for index, lead in enumerate(targets, start=1):
        enrich_lead(lead, providers, fetch_phone, stop_on_verified)

        if lead.email_status == "verified":
            stats["verified"] += 1
        elif lead.email_status == "guessed":
            stats["guessed"] += 1
        else:
            stats["not_found"] += 1

        if lead.phone:
            stats["phones"] += 1
        if lead.email_source:
            by_provider = stats["by_provider"]
            by_provider[lead.email_source] = by_provider.get(lead.email_source, 0) + 1

        if progress and index % 25 == 0:
            print(f"  ... {index}/{len(targets)}")

    return stats
