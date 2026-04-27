from app.utils.calculations import actual_rr, planned_rr


def test_planned_rr_buy():
    assert planned_rr("buy", 100, 95, 110) == 2.0


def test_planned_rr_sell():
    assert planned_rr("sell", 100, 105, 90) == 2.0


def test_actual_rr():
    assert actual_rr(200, 100) == 2.0
