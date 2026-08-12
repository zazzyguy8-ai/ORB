"""ContactOut provider.

Important: this talks to ContactOut's REST API, NOT the Chrome extension. That
is the whole point — the extension needs a browser we cannot install, the API
does not care what machine you are on.

Endpoint shapes and the auth header name are configurable via environment
variables because ContactOut has published more than one convention over time
(`token:` on v1, `x-api-key` on v2). If a call fails with 401/404, adjust
CONTACTOUT_* in .env rather than editing this file — see README.
"""

from __future__ import annotations

import os
import time
from typing import Any

import requests

from ..models import Lead
from .base import ContactResult

DEFAULT_BASE_URL = "https://api.contactout.com/v1"
DEFAULT_ENRICH_PATH = "/linkedin/enrich"
DEFAULT_AUTH_HEADER = "token"


class ContactOutProvider:
    name = "contactout"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        enrich_path: str | None = None,
        auth_header: str | None = None,
        timeout: int = 20,
        max_retries: int = 3,
    ):
        self.api_key = api_key or os.getenv("CONTACTOUT_API_KEY", "")
        self.base_url = (base_url or os.getenv("CONTACTOUT_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self.enrich_path = enrich_path or os.getenv("CONTACTOUT_ENRICH_PATH", DEFAULT_ENRICH_PATH)
        self.auth_header = auth_header or os.getenv("CONTACTOUT_AUTH_HEADER", DEFAULT_AUTH_HEADER)
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = requests.Session()

    def available(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict[str, str]:
        return {
            self.auth_header: self.api_key,
            # ContactOut's v1 examples send this alongside the token header.
            "authorization": "basic",
            "accept": "application/json",
            "content-type": "application/json",
        }

    def _get(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        """GET with backoff on rate limits and transient server errors."""
        delay = 2
        last_error = ""
        for attempt in range(self.max_retries):
            try:
                response = self._session.get(
                    url, params=params, headers=self._headers(), timeout=self.timeout
                )
            except requests.RequestException as exc:
                last_error = f"network error: {exc}"
            else:
                if response.status_code == 200:
                    return response.json()
                if response.status_code in (429, 500, 502, 503, 504):
                    last_error = f"HTTP {response.status_code}"
                else:
                    # 401/403/404 will not fix themselves by retrying.
                    raise RuntimeError(
                        f"HTTP {response.status_code}: {response.text[:200]}"
                    )
            if attempt < self.max_retries - 1:
                time.sleep(delay)
                delay *= 2
        raise RuntimeError(last_error or "request failed")

    @staticmethod
    def _first_string(*candidates: Any) -> str:
        """Pull the first usable string out of mixed str/list/None fields.

        ContactOut returns emails as a list on some endpoints and a bare string
        on others, so normalise defensively instead of assuming a shape.
        """
        for candidate in candidates:
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
            if isinstance(candidate, (list, tuple)):
                for item in candidate:
                    if isinstance(item, str) and item.strip():
                        return item.strip()
        return ""

    def find(self, lead: Lead, fetch_phone: bool = False) -> ContactResult:
        if not self.available():
            return ContactResult(source=self.name, error="CONTACTOUT_API_KEY not set")
        if not lead.linkedin_url:
            return ContactResult(source=self.name, error="no linkedin_url on lead")

        params: dict[str, Any] = {"profile": lead.linkedin_url}
        if fetch_phone:
            # Phone lookups burn a separate, smaller credit pool — only ask
            # when the caller explicitly opted in via icp.yaml.
            params["include_phone"] = "true"

        try:
            payload = self._get(f"{self.base_url}{self.enrich_path}", params)
        except RuntimeError as exc:
            return ContactResult(source=self.name, error=str(exc))

        # The useful object may sit at the root or under `profile` / `data`.
        profile = payload.get("profile") or payload.get("data") or payload
        if not isinstance(profile, dict):
            return ContactResult(source=self.name, error="unexpected response shape")

        email = self._first_string(
            profile.get("work_email"),
            profile.get("work_emails"),
            profile.get("email"),
            profile.get("emails"),
            profile.get("personal_email"),
            profile.get("personal_emails"),
        )
        phone = ""
        if fetch_phone:
            phone = self._first_string(profile.get("phone"), profile.get("phones"))

        if not email and not phone:
            return ContactResult(source=self.name, status="not_found")

        return ContactResult(
            email=email,
            # ContactOut validates before returning, so a hit counts as verified.
            status="verified" if email else "not_found",
            phone=phone,
            source=self.name,
        )
