from leadpipe.enrich.base import ContactResult
from leadpipe.enrich.pattern import PatternProvider, _slug
from leadpipe.enrich.waterfall import enrich_lead
from leadpipe.models import Lead


class FakeProvider:
    """Stand-in for a paid provider so tests never hit the network."""

    def __init__(self, name, result, is_available=True):
        self.name = name
        self._result = result
        self._available = is_available
        self.calls = 0

    def available(self):
        return self._available

    def find(self, lead, fetch_phone=False):
        self.calls += 1
        return self._result


def a_lead(**overrides):
    base = dict(first_name="Marta", last_name="Kovacova", company_domain="nordwell.com")
    base.update(overrides)
    return Lead.from_row(base)


# --- waterfall ordering -----------------------------------------------------


def test_verified_hit_stops_the_waterfall():
    first = FakeProvider("paid", ContactResult(email="a@x.com", status="verified", source="paid"))
    second = FakeProvider("free", ContactResult(email="b@x.com", status="guessed", source="free"))

    lead = enrich_lead(a_lead(), [first, second])

    assert lead.email == "a@x.com"
    assert lead.email_source == "paid"
    assert second.calls == 0, "second provider should not be charged after a verified hit"


def test_falls_through_when_first_provider_misses():
    first = FakeProvider("paid", ContactResult(status="not_found", source="paid"))
    second = FakeProvider("free", ContactResult(email="b@x.com", status="guessed", source="free"))

    lead = enrich_lead(a_lead(), [first, second])

    assert lead.email == "b@x.com"
    assert lead.email_status == "guessed"


def test_verified_result_beats_an_earlier_guess():
    guesser = FakeProvider("free", ContactResult(email="guess@x.com", status="guessed", source="free"))
    verifier = FakeProvider("paid", ContactResult(email="real@x.com", status="verified", source="paid"))

    lead = enrich_lead(a_lead(), [guesser, verifier])

    assert lead.email == "real@x.com"
    assert lead.email_status == "verified"


def test_a_guess_is_not_lost_to_a_later_miss():
    guesser = FakeProvider("free", ContactResult(email="guess@x.com", status="guessed", source="free"))
    empty = FakeProvider("other", ContactResult(status="not_found", source="other"))

    lead = enrich_lead(a_lead(), [guesser, empty])

    assert lead.email == "guess@x.com"


def test_unconfigured_providers_are_skipped():
    missing_key = FakeProvider("paid", ContactResult(email="a@x.com", status="verified"), is_available=False)
    fallback = FakeProvider("free", ContactResult(email="b@x.com", status="guessed", source="free"))

    lead = enrich_lead(a_lead(), [missing_key, fallback])

    assert missing_key.calls == 0
    assert lead.email == "b@x.com"


def test_phone_is_taken_from_any_provider():
    phone_only = FakeProvider("paid", ContactResult(phone="+421900000000", source="paid"))
    email_only = FakeProvider("free", ContactResult(email="b@x.com", status="guessed", source="free"))

    lead = enrich_lead(a_lead(), [phone_only, email_only], fetch_phone=True)

    assert lead.phone == "+421900000000"
    assert lead.email == "b@x.com"


def test_no_results_marks_not_found():
    lead = enrich_lead(a_lead(), [FakeProvider("x", ContactResult(status="not_found"))])
    assert lead.email == ""
    assert lead.email_status == "not_found"


# --- pattern provider -------------------------------------------------------


def test_slug_strips_diacritics_and_punctuation():
    assert _slug("Šimon O'Brien-Novák") == "simonobriennovak"


def test_pattern_guesses_first_dot_last():
    result = PatternProvider(check_mx=False).find(a_lead())
    assert result.email == "marta.kovacova@nordwell.com"
    assert result.status == "guessed", "an unverified guess must never claim to be verified"


def test_pattern_rejects_free_mail_domains():
    result = PatternProvider(check_mx=False).find(a_lead(company_domain="gmail.com"))
    assert not result.found_email
    assert "not a company domain" in result.error


def test_pattern_needs_a_domain():
    result = PatternProvider(check_mx=False).find(a_lead(company_domain=""))
    assert not result.found_email
