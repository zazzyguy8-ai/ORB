"""Provider interface for contact enrichment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from ..models import Lead


@dataclass
class ContactResult:
    """What a provider found. `status` drives whether the waterfall stops."""

    email: str = ""
    # verified  -> provider asserts deliverability; trust it, stop the waterfall
    # guessed   -> plausible but unconfirmed; keep going, keep as fallback
    # not_found -> nothing
    status: str = "not_found"
    phone: str = ""
    source: str = ""
    error: str = ""

    @property
    def found_email(self) -> bool:
        return bool(self.email) and self.status in ("verified", "guessed")


class Provider(Protocol):
    """Anything that can turn a Lead into contact details."""

    name: str

    def available(self) -> bool:
        """False when the provider is not configured (no API key, etc.)."""
        ...

    def find(self, lead: Lead, fetch_phone: bool = False) -> ContactResult:
        ...
