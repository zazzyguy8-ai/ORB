from pathlib import Path

import pytest

from leadpipe.models import Lead
from leadpipe.scoring import IcpConfig, check_hard_excludes, score_lead, summarise

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "icp.yaml"


@pytest.fixture(scope="module")
def config() -> IcpConfig:
    return IcpConfig.load(CONFIG_PATH)


def make_lead(**overrides) -> Lead:
    """A lead that passes every hard exclude, so tests change one thing at a time."""
    base = dict(
        full_name="Marta Kovacova",
        headline="VP Marketing at Nordwell",
        title="VP Marketing",
        company_name="Nordwell Logistics",
        company_domain="nordwell.com",
        company_size=180,
        industry="Logistics",
        linkedin_url="https://linkedin.com/in/marta",
        followers=4200,
        last_activity_days=9,
    )
    base.update(overrides)
    return Lead.from_row({k: v for k, v in base.items()})


# --- the cases the boss actually complained about ---------------------------


def test_major_creator_is_rejected(config):
    lead = score_lead(make_lead(followers=480000, headline="Content creator"), config)
    assert lead.bucket == "rejected"
    assert any("audience too large" in r for r in lead.reject_reasons)


def test_personal_brand_is_rejected(config):
    lead = score_lead(
        make_lead(headline="Business coach", bio="I help entrepreneurs grow"), config
    )
    assert lead.bucket == "rejected"
    assert any("creator/personal brand" in r for r in lead.reject_reasons)


def test_marketing_agency_is_rejected(config):
    lead = score_lead(make_lead(headline="Founder at a digital marketing agency"), config)
    assert lead.bucket == "rejected"
    assert any("sells marketing themselves" in r for r in lead.reject_reasons)


def test_lead_without_domain_is_rejected(config):
    lead = score_lead(make_lead(company_domain=""), config)
    assert lead.bucket == "rejected"
    assert any("no company domain" in r for r in lead.reject_reasons)


def test_dormant_account_is_rejected(config):
    lead = score_lead(make_lead(last_activity_days=400), config)
    assert lead.bucket == "rejected"
    assert any("dormant" in r for r in lead.reject_reasons)


def test_student_is_rejected(config):
    lead = score_lead(make_lead(title="Student", headline="Student at university"), config)
    assert lead.bucket == "rejected"


# --- the good path ----------------------------------------------------------


def test_ideal_lead_qualifies(config):
    lead = score_lead(make_lead(), config)
    assert lead.bucket == "qualified"
    assert lead.score >= 60
    assert lead.reject_reasons == []


def test_founder_outscores_manager(config):
    founder = score_lead(make_lead(title="Founder", headline="Founder at Nordwell"), config)
    manager = score_lead(make_lead(title="Marketing Manager", headline="Marketing Manager"), config)
    assert founder.score > manager.score


def test_every_rejection_carries_a_reason(config):
    lead = score_lead(make_lead(company_size=2, title="Assistant", headline="Assistant"), config)
    if lead.bucket == "rejected":
        assert lead.reject_reasons, "a rejected lead must always explain itself"


def test_multiple_failures_are_all_reported(config):
    lead = make_lead(followers=900000, company_domain="", headline="influencer")
    reasons = check_hard_excludes(lead, config)
    assert len(reasons) >= 3


# --- reporting --------------------------------------------------------------


def test_summary_groups_reasons(config):
    leads = [
        score_lead(make_lead(followers=480000), config),
        score_lead(make_lead(followers=900000), config),
        score_lead(make_lead(), config),
    ]
    stats = summarise(leads)
    assert stats["total"] == 3
    assert stats["buckets"]["rejected"] == 2
    assert stats["top_reject_reasons"]["audience too large"] == 2
