# lead-pipeline

Turns a raw LinkedIn/Sales Navigator scrape into a short list of qualified leads
**with contact details attached**, and explains in writing why every dropped lead
was dropped.

It exists to fix two specific failures in the current process:

1. **Creators and personal brands were reaching the review list.** People with
   480k followers who sell marketing themselves are not buyers. They are now
   filtered out automatically, before anyone sees them.
2. **Leads shipped without emails.** Enrichment is now part of the pipeline, not
   a manual step that gets skipped.

## No browser extension required

The enrichment runs against **ContactOut's REST API**, not their Chrome
extension. That is deliberate: the extension needs a current Chrome, and the
machine running this does not have one. The API does not care what you are
running — it works from a laptop, a server, or a CI job.

If you ever do want a browser-side tool on an older Mac, note that Firefox ESR
still supports macOS versions Chrome has dropped, and has its own add-ons. But
nothing in this repo needs it.

## Quick start

```bash
pip install -r requirements.txt
cp .env.example .env          # add CONTACTOUT_API_KEY

# score only — no API credits spent, safe to run on anything
python -m leadpipe score data/sample_leads.csv -o out/

# score, then find emails for whatever qualified
python -m leadpipe run data/sample_leads.csv -o out/
```

Output lands in `out/`:

| file | who opens it |
|---|---|
| `qualified.csv` | outreach — scored, enriched, ready to send |
| `review.csv` | the human reviewer — borderline cases only, deliberately short |
| `rejected.csv` | nobody, normally — kept as an audit trail so "why did you drop this one?" is always answerable |

## What a run looks like

```
  Scoring
    total: 12
    qualified      7  (58%)
    rejected       5  (42%)

  Why leads were dropped
        2  audience too large
        2  creator/personal brand signal
        2  no company domain
        1  sells marketing themselves
        1  dormant
        1  not a buying role
```

That reason histogram is the most useful output in the repo. If 300 of 500 rows
die on `creator/personal brand signal`, the problem is the scrape source, not
the filter — go fix the search query rather than the config.

Rejections are written per-row too:

```
Jenna Powell   | audience too large (480,000 followers > 75,000);
                 creator/personal brand signal ('content creator');
                 no company domain (cannot be enriched)
```

## Tuning the ICP

Everything lives in [`config/icp.yaml`](config/icp.yaml). No code changes needed.

- `hard_excludes` — instant disqualifiers (follower ceiling, creator keywords,
  competitor keywords, missing domain, dormant accounts)
- `signals` — the point-scoring for survivors (company size, seniority,
  industry, followers, recency)
- `thresholds` — where `qualified` / `review` / `rejected` are cut

The argument about what counts as a good lead belongs in that file, settled
once, rather than in a spreadsheet review after delivery.

## Enrichment waterfall

Providers are tried in the order listed under `enrichment.waterfall`. The first
verified hit wins and the rest are skipped, so credits are only spent when
needed.

| provider | cost | returns |
|---|---|---|
| `contactout` | paid API plan | `verified` emails, optional phone numbers |
| `pattern` | free | `guessed` emails from name + domain, MX-checked |

`email_status` is the column that matters:

- **`verified`** — the provider stands behind it. Safe to send.
- **`guessed`** — a plausible pattern (`first.last@domain`) on a domain that
  accepts mail. **Run these through a bulk verifier before any real outreach** —
  sending to unverified guesses is how a sending domain gets burned.
- **`not_found`** — nothing found.

By default only the `qualified` bucket is enriched (`enrichment.enrich_buckets`),
so a 5000-row scrape cannot drain the credit allowance. Phone lookups cost more
than emails and are off by default (`enrichment.fetch_phone`).

### Adding a provider

Implement the three-method `Provider` protocol in `leadpipe/enrich/base.py`,
register it in `PROVIDER_REGISTRY`, add its name to the waterfall list. That is
the whole change — the waterfall logic is provider-agnostic.

## ContactOut configuration

`.env` needs `CONTACTOUT_API_KEY` (Team/API plan; ask sales for a key).

ContactOut has shipped more than one API convention (`token:` header on v1,
`x-api-key` on v2), and their docs were not reachable from the machine this was
written on, so the endpoint and auth header are **configurable rather than
hardcoded**. If you get a 401 or 404, fix it in `.env`, not in the code:

```bash
CONTACTOUT_BASE_URL=https://api.contactout.com/v1
CONTACTOUT_ENRICH_PATH=/linkedin/enrich
CONTACTOUT_AUTH_HEADER=token
```

The response parser already tolerates both list and string shapes for email
fields, and looks for the payload at the root or under `profile` / `data`.

## Tests

```bash
python -m pytest tests/ -q
```

The scoring tests are written as the actual complaints — `test_major_creator_is_rejected`,
`test_personal_brand_is_rejected`, `test_marketing_agency_is_rejected`. If the ICP
config is ever loosened to the point that those leads come back, the suite fails.

Enrichment tests use a fake provider, so they never hit the network or spend credits.

## A note on compliance

Scraping LinkedIn runs against their Terms of Service, and phone numbers are
treated more strictly than business emails under GDPR. Pulling contact data from
a provider's own API (which is what this repo does) is a materially safer
position than running your own scraper, and it is worth keeping outreach to
business addresses with a working opt-out.
