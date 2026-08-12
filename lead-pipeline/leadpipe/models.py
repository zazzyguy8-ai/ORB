"""Core data types for the lead pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# Columns we understand. Anything else in the input CSV is preserved verbatim
# in Lead.extra so no scraped data is ever silently dropped.
KNOWN_FIELDS = (
    "full_name",
    "first_name",
    "last_name",
    "headline",
    "bio",
    "title",
    "company_name",
    "company_domain",
    "company_size",
    "industry",
    "location",
    "linkedin_url",
    "followers",
    "last_activity_days",
)


def _to_int(value: Any) -> int | None:
    """Parse ints tolerantly: scrapers emit '1,234', '12K', '' and None."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip().lower().replace(",", "").replace(" ", "")
    if not text:
        return None
    multiplier = 1
    if text.endswith("k"):
        multiplier, text = 1_000, text[:-1]
    elif text.endswith("m"):
        multiplier, text = 1_000_000, text[:-1]
    try:
        return int(float(text) * multiplier)
    except ValueError:
        return None


@dataclass
class Lead:
    """A single scraped person, plus everything the pipeline learns about them."""

    full_name: str = ""
    first_name: str = ""
    last_name: str = ""
    headline: str = ""
    bio: str = ""
    title: str = ""
    company_name: str = ""
    company_domain: str = ""
    company_size: int | None = None
    industry: str = ""
    location: str = ""
    linkedin_url: str = ""
    followers: int | None = None
    last_activity_days: int | None = None

    # --- filled in by scoring ---
    score: int = 0
    bucket: str = ""
    reject_reasons: list[str] = field(default_factory=list)
    score_breakdown: dict[str, int] = field(default_factory=dict)

    # --- filled in by enrichment ---
    email: str = ""
    email_status: str = ""  # verified | guessed | not_found | ""
    email_source: str = ""
    phone: str = ""
    phone_source: str = ""

    # --- passthrough ---
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "Lead":
        """Build a Lead from a raw CSV row, normalising names and numbers."""
        normalised = {(k or "").strip().lower().replace(" ", "_"): v for k, v in row.items()}

        lead = cls()
        for name in KNOWN_FIELDS:
            value = normalised.pop(name, None)
            if value is None:
                continue
            if name in ("company_size", "followers", "last_activity_days"):
                setattr(lead, name, _to_int(value))
            else:
                setattr(lead, name, str(value).strip())

        lead.extra = {k: v for k, v in normalised.items() if v not in (None, "")}
        lead._backfill_names()
        lead._backfill_domain()
        return lead

    def _backfill_names(self) -> None:
        """Scrapers give us either a full name or the parts, rarely both."""
        if self.full_name and not (self.first_name and self.last_name):
            parts = self.full_name.split()
            if parts:
                self.first_name = self.first_name or parts[0]
                self.last_name = self.last_name or (parts[-1] if len(parts) > 1 else "")
        elif not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()

    def _backfill_domain(self) -> None:
        """Accept a website URL in the domain column and reduce it to a host."""
        raw = (self.company_domain or self.extra.get("website") or "").strip().lower()
        if not raw:
            self.company_domain = ""
            return
        for prefix in ("https://", "http://"):
            if raw.startswith(prefix):
                raw = raw[len(prefix) :]
        raw = raw.split("/")[0]
        if raw.startswith("www."):
            raw = raw[4:]
        # A bare token with no dot is not a domain.
        self.company_domain = raw if "." in raw else ""

    @property
    def searchable_text(self) -> str:
        """Everything a keyword rule should look at, lowercased."""
        return " ".join(
            part.lower()
            for part in (self.headline, self.bio, self.title, self.company_name)
            if part
        )

    def to_row(self) -> dict[str, Any]:
        """Flatten back to a CSV row, output columns first."""
        row: dict[str, Any] = {}
        for name in KNOWN_FIELDS:
            value = getattr(self, name)
            row[name] = "" if value is None else value
        row.update(
            {
                "score": self.score,
                "bucket": self.bucket,
                "reject_reasons": "; ".join(self.reject_reasons),
                "score_breakdown": "; ".join(
                    f"{k}={v}" for k, v in self.score_breakdown.items()
                ),
                "email": self.email,
                "email_status": self.email_status,
                "email_source": self.email_source,
                "phone": self.phone,
                "phone_source": self.phone_source,
            }
        )
        row.update(self.extra)
        return row
