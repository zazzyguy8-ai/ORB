"""ICP scoring: turn config/icp.yaml into a qualified / review / rejected verdict.

Every rejection carries a reason string. That is deliberate — the point of this
module is that nobody has to eyeball a list to find out why a creator with
400k followers ended up in it.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .models import Lead


class IcpConfig:
    """Parsed icp.yaml with convenient accessors."""

    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.thresholds = data.get("thresholds", {})
        self.hard_excludes = data.get("hard_excludes", {})
        self.signals = data.get("signals", {})
        self.enrichment = data.get("enrichment", {})

    @classmethod
    def load(cls, path: str | Path) -> "IcpConfig":
        with open(path, "r", encoding="utf-8") as handle:
            return cls(yaml.safe_load(handle) or {})


def _matched_keyword(text: str, keywords: list[str] | None) -> str | None:
    for keyword in keywords or []:
        if keyword.lower() in text:
            return keyword
    return None


def check_hard_excludes(lead: Lead, config: IcpConfig) -> list[str]:
    """Return every reason this lead is disqualified. Empty list means it passes.

    We collect all reasons rather than short-circuiting: when reviewing a
    borderline list it matters whether something failed one rule or five.
    """
    rules = config.hard_excludes
    text = lead.searchable_text
    reasons: list[str] = []

    max_followers = rules.get("max_followers")
    if max_followers is not None and lead.followers is not None:
        if lead.followers > max_followers:
            reasons.append(
                f"audience too large ({lead.followers:,} followers > {max_followers:,})"
            )

    min_followers = rules.get("min_followers")
    if min_followers is not None and lead.followers is not None:
        if lead.followers < min_followers:
            reasons.append(
                f"audience too small ({lead.followers:,} followers < {min_followers:,})"
            )

    hit = _matched_keyword(text, rules.get("persona_keywords"))
    if hit:
        reasons.append(f"creator/personal brand signal ('{hit}')")

    hit = _matched_keyword(text, rules.get("competitor_keywords"))
    if hit:
        reasons.append(f"sells marketing themselves ('{hit}')")

    hit = _matched_keyword(text, rules.get("disqualifying_titles"))
    if hit:
        reasons.append(f"not a buying role ('{hit}')")

    if rules.get("require_company_domain") and not lead.company_domain:
        reasons.append("no company domain (cannot be enriched)")

    max_idle = rules.get("max_days_since_activity")
    if max_idle is not None and lead.last_activity_days is not None:
        if lead.last_activity_days > max_idle:
            reasons.append(f"dormant ({lead.last_activity_days}d since last activity)")

    return reasons


def _score_bands(value: int | None, bands: list[dict[str, Any]]) -> int:
    if value is None:
        return 0
    for band in bands:
        low = band.get("min", 0)
        high = band.get("max")
        if value >= low and (high is None or value <= high):
            return int(band.get("points", 0))
    return 0


def _score_tiers(text: str, tiers: list[dict[str, Any]]) -> int:
    """Tiers are ordered best-first; the first match wins."""
    for tier in tiers:
        if _matched_keyword(text, tier.get("keywords")):
            return int(tier.get("points", 0))
    return 0


def _score_activity(days: int | None, bands: list[dict[str, Any]]) -> int:
    if days is None:
        return 0
    for band in bands:
        if days <= int(band.get("max_days", 0)):
            return int(band.get("points", 0))
    return 0


def score_lead(lead: Lead, config: IcpConfig) -> Lead:
    """Score a lead in place and assign its bucket."""
    lead.reject_reasons = check_hard_excludes(lead, config)
    if lead.reject_reasons:
        lead.score = 0
        lead.bucket = "rejected"
        lead.score_breakdown = {}
        return lead

    signals = config.signals
    breakdown: dict[str, int] = {}

    if "company_size" in signals:
        breakdown["company_size"] = _score_bands(
            lead.company_size, signals["company_size"].get("bands", [])
        )

    if "seniority" in signals:
        breakdown["seniority"] = _score_tiers(
            f"{lead.title} {lead.headline}".lower(), signals["seniority"].get("tiers", [])
        )

    if "industry" in signals:
        rule = signals["industry"]
        industry_text = f"{lead.industry} {lead.company_name}".lower()
        preferred = _matched_keyword(industry_text, rule.get("preferred"))
        breakdown["industry"] = int(
            rule.get("points_preferred", 0) if preferred else rule.get("points_other", 0)
        )

    if "followers" in signals:
        breakdown["followers"] = _score_bands(
            lead.followers, signals["followers"].get("bands", [])
        )

    if "activity" in signals:
        breakdown["activity"] = _score_activity(
            lead.last_activity_days, signals["activity"].get("bands", [])
        )

    lead.score_breakdown = breakdown
    lead.score = sum(breakdown.values())

    qualified = int(config.thresholds.get("qualified", 60))
    review = int(config.thresholds.get("review", 35))
    if lead.score >= qualified:
        lead.bucket = "qualified"
    elif lead.score >= review:
        lead.bucket = "review"
    else:
        lead.bucket = "rejected"
        lead.reject_reasons = [f"score {lead.score} below review threshold {review}"]

    return lead


def score_all(leads: list[Lead], config: IcpConfig) -> list[Lead]:
    return [score_lead(lead, config) for lead in leads]


def summarise(leads: list[Lead]) -> dict[str, Any]:
    """Counts per bucket plus the most common rejection reasons.

    The reason histogram is the useful part: if 300 of 500 rows died on
    'creator/personal brand signal', the scrape source is wrong, not the filter.
    """
    buckets: dict[str, int] = {}
    reasons: dict[str, int] = {}
    for lead in leads:
        buckets[lead.bucket] = buckets.get(lead.bucket, 0) + 1
        for reason in lead.reject_reasons:
            # Collapse the parenthetical detail so reasons group together.
            key = reason.split(" (")[0]
            reasons[key] = reasons.get(key, 0) + 1

    return {
        "total": len(leads),
        "buckets": dict(sorted(buckets.items())),
        "top_reject_reasons": dict(
            sorted(reasons.items(), key=lambda kv: kv[1], reverse=True)[:10]
        ),
    }
