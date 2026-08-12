"""Free fallback: guess the corporate email pattern, then sanity-check the domain.

This costs nothing and catches a meaningful slice of leads the paid provider
misses. It never claims 'verified' on its own — an MX record proves the domain
can receive mail, not that the mailbox exists. Treat these as second-tier and
send them through a bulk verifier before any real outreach.
"""

from __future__ import annotations

import os
import re
import unicodedata

from ..models import Lead
from .base import ContactResult

try:
    import dns.resolver  # type: ignore

    DNS_AVAILABLE = True
except ImportError:  # dnspython is optional
    DNS_AVAILABLE = False


# Ordered by real-world frequency in B2B.
PATTERNS = (
    "{first}.{last}@{domain}",
    "{first}@{domain}",
    "{f}{last}@{domain}",
    "{first}{last}@{domain}",
    "{first}_{last}@{domain}",
    "{last}.{first}@{domain}",
    "{f}.{last}@{domain}",
)

# Free-mail and hosting domains are never a company's mail domain.
BLOCKED_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "linkedin.com",
    "wixsite.com",
    "squarespace.com",
    "linktr.ee",
    "bit.ly",
}

_MX_CACHE: dict[str, bool] = {}


def _slug(value: str) -> str:
    """'Šimon O'Brien-Novák' -> 'simonobriennovak'."""
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_only = decomposed.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z]", "", ascii_only.lower())


def domain_accepts_mail(domain: str) -> bool:
    """True if the domain publishes MX records. Cached per run."""
    if domain in _MX_CACHE:
        return _MX_CACHE[domain]
    if not DNS_AVAILABLE:
        # Without dnspython we cannot check; don't block the guess.
        return True
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=5)
        result = len(answers) > 0
    except Exception:
        result = False
    _MX_CACHE[domain] = result
    return result


class PatternProvider:
    name = "pattern"

    def __init__(self, check_mx: bool | None = None):
        if check_mx is None:
            check_mx = os.getenv("PATTERN_CHECK_MX", "true").lower() != "false"
        self.check_mx = check_mx

    def available(self) -> bool:
        return True  # no credentials needed

    def find(self, lead: Lead, fetch_phone: bool = False) -> ContactResult:
        domain = (lead.company_domain or "").lower()
        if not domain:
            return ContactResult(source=self.name, error="no company domain")
        if domain in BLOCKED_DOMAINS:
            return ContactResult(source=self.name, error=f"not a company domain ({domain})")

        first, last = _slug(lead.first_name), _slug(lead.last_name)
        if not first:
            return ContactResult(source=self.name, error="no usable first name")

        if self.check_mx and not domain_accepts_mail(domain):
            return ContactResult(source=self.name, error=f"{domain} has no MX records")

        # Patterns needing a surname are skipped when we only have a first name.
        for template in PATTERNS:
            if "{last}" in template and not last:
                continue
            guess = template.format(first=first, last=last, f=first[0], domain=domain)
            return ContactResult(email=guess, status="guessed", source=self.name)

        return ContactResult(source=self.name, status="not_found")
