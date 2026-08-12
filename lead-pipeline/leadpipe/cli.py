"""Command line entry point.

    python -m leadpipe score  data/raw.csv -o out/
    python -m leadpipe enrich out/qualified.csv -o out/enriched.csv
    python -m leadpipe run    data/raw.csv -o out/
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .csvio import read_leads, write_leads, write_split
from .enrich.waterfall import enrich_all
from .scoring import IcpConfig, score_all, summarise

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config" / "icp.yaml"


def _load_env() -> None:
    """Load .env if python-dotenv is installed; it is optional."""
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass


def _print_summary(stats: dict) -> None:
    print("\n  Scoring")
    print(f"    total: {stats['total']}")
    for bucket, count in stats["buckets"].items():
        share = (count / stats["total"] * 100) if stats["total"] else 0
        print(f"    {bucket:<10} {count:>5}  ({share:.0f}%)")
    if stats["top_reject_reasons"]:
        print("\n  Why leads were dropped")
        for reason, count in stats["top_reject_reasons"].items():
            print(f"    {count:>5}  {reason}")


def _print_enrichment(stats: dict) -> None:
    attempted = stats["attempted"]
    hit = stats["verified"] + stats["guessed"]
    rate = (hit / attempted * 100) if attempted else 0
    print("\n  Enrichment")
    print(f"    attempted: {attempted}")
    print(f"    verified:  {stats['verified']}")
    print(f"    guessed:   {stats['guessed']}")
    print(f"    not found: {stats['not_found']}")
    print(f"    phones:    {stats['phones']}")
    print(f"    hit rate:  {rate:.0f}%")
    if stats["by_provider"]:
        print("    by provider: " + ", ".join(
            f"{name}={count}" for name, count in stats["by_provider"].items()
        ))


def cmd_score(args: argparse.Namespace) -> int:
    config = IcpConfig.load(args.config)
    leads = read_leads(args.input)
    print(f"  loaded {len(leads)} leads from {args.input}")

    score_all(leads, config)
    stats = summarise(leads)
    _print_summary(stats)

    counts = write_split(args.output, leads)
    print(f"\n  wrote {args.output}/: " + ", ".join(
        f"{bucket}.csv={count}" for bucket, count in counts.items() if count
    ))
    if args.json:
        Path(args.json).write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return 0


def cmd_enrich(args: argparse.Namespace) -> int:
    _load_env()
    config = IcpConfig.load(args.config)
    leads = read_leads(args.input)

    # A standalone enrich run gets a file that is already filtered, so treat
    # every row as in-scope rather than requiring a bucket column.
    for lead in leads:
        if not lead.bucket:
            lead.bucket = "qualified"

    print(f"  enriching {len(leads)} leads from {args.input}")
    stats = enrich_all(leads, config)
    _print_enrichment(stats)

    write_leads(args.output, leads)
    print(f"\n  wrote {args.output}")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    _load_env()
    config = IcpConfig.load(args.config)
    leads = read_leads(args.input)
    print(f"  loaded {len(leads)} leads from {args.input}")

    score_all(leads, config)
    score_stats = summarise(leads)
    _print_summary(score_stats)

    enrich_stats = enrich_all(leads, config)
    _print_enrichment(enrich_stats)

    counts = write_split(args.output, leads)
    print(f"\n  wrote {args.output}/: " + ", ".join(
        f"{bucket}.csv={count}" for bucket, count in counts.items() if count
    ))
    if args.json:
        Path(args.json).write_text(
            json.dumps({"scoring": score_stats, "enrichment": enrich_stats}, indent=2),
            encoding="utf-8",
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="leadpipe", description="ICP scoring + contact enrichment")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="path to icp.yaml")
    subparsers = parser.add_subparsers(dest="command", required=True)

    score = subparsers.add_parser("score", help="filter and score a raw scrape")
    score.add_argument("input")
    score.add_argument("-o", "--output", default="out", help="output directory")
    score.add_argument("--json", help="also write stats as JSON to this path")
    score.set_defaults(func=cmd_score)

    enrich = subparsers.add_parser("enrich", help="find emails/phones for a scored file")
    enrich.add_argument("input")
    enrich.add_argument("-o", "--output", default="out/enriched.csv")
    enrich.set_defaults(func=cmd_enrich)

    run = subparsers.add_parser("run", help="score then enrich in one pass")
    run.add_argument("input")
    run.add_argument("-o", "--output", default="out")
    run.add_argument("--json", help="also write stats as JSON to this path")
    run.set_defaults(func=cmd_run)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
