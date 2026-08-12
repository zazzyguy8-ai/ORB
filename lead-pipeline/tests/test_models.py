from leadpipe.models import Lead, _to_int


def test_parses_messy_numbers():
    assert _to_int("1,234") == 1234
    assert _to_int("12K") == 12000
    assert _to_int("1.5M") == 1500000
    assert _to_int("") is None
    assert _to_int("n/a") is None


def test_splits_full_name():
    lead = Lead.from_row({"full_name": "Marta Kovacova"})
    assert lead.first_name == "Marta"
    assert lead.last_name == "Kovacova"


def test_builds_full_name_from_parts():
    lead = Lead.from_row({"first_name": "Tomas", "last_name": "Bielik"})
    assert lead.full_name == "Tomas Bielik"


def test_normalises_website_to_domain():
    assert Lead.from_row({"company_domain": "https://www.Petrino.io/about"}).company_domain == "petrino.io"
    assert Lead.from_row({"website": "http://nordwell.com"}).company_domain == "nordwell.com"
    assert Lead.from_row({"company_domain": "unknown"}).company_domain == ""


def test_unknown_columns_survive_the_round_trip():
    lead = Lead.from_row({"full_name": "Ravi Anand", "utm_source": "sales-nav-batch-3"})
    assert lead.extra["utm_source"] == "sales-nav-batch-3"
    assert lead.to_row()["utm_source"] == "sales-nav-batch-3"


def test_headers_are_normalised():
    lead = Lead.from_row({"Full Name": "Peter Novak", "Company Size": "540"})
    assert lead.full_name == "Peter Novak"
    assert lead.company_size == 540
