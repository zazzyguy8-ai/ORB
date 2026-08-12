"""CSV in, CSV out — the format everyone on the team already uses."""

from __future__ import annotations

import csv
from pathlib import Path

from .models import Lead

# Written first so the columns that matter are visible without scrolling.
PRIORITY_COLUMNS = (
    "bucket",
    "score",
    "full_name",
    "title",
    "company_name",
    "company_domain",
    "email",
    "email_status",
    "phone",
    "linkedin_url",
    "reject_reasons",
)


def read_leads(path: str | Path) -> list[Lead]:
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        return [Lead.from_row(row) for row in csv.DictReader(handle)]


def write_leads(path: str | Path, leads: list[Lead]) -> None:
    """Write leads, unioning columns so no row loses a field."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    rows = [lead.to_row() for lead in leads]

    if not rows:
        Path(path).write_text("", encoding="utf-8")
        return

    seen: list[str] = [c for c in PRIORITY_COLUMNS if any(c in row for row in rows)]
    for row in rows:
        for key in row:
            if key not in seen:
                seen.append(key)

    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=seen, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_split(out_dir: str | Path, leads: list[Lead]) -> dict[str, int]:
    """Write one file per bucket.

    This is the deliverable format: outreach opens qualified.csv, the reviewer
    opens review.csv (short), and rejected.csv stays available as an audit trail
    so 'why did you drop this one' is always answerable.
    """
    out_dir = Path(out_dir)
    counts: dict[str, int] = {}
    for bucket in ("qualified", "review", "rejected"):
        subset = [lead for lead in leads if lead.bucket == bucket]
        counts[bucket] = len(subset)
        if subset:
            write_leads(out_dir / f"{bucket}.csv", subset)
    return counts
