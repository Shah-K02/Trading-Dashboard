def planned_rr(side: str, entry: float, stop_loss: float, take_profit: float) -> float | None:
    if not stop_loss or not take_profit:
        return None

    if side == "buy":
        risk = entry - stop_loss
        reward = take_profit - entry
    else:
        risk = stop_loss - entry
        reward = entry - take_profit

    if risk <= 0:
        return None
    return round(reward / risk, 4)


def actual_rr(net_pnl: float, risk_amount: float | None) -> float | None:
    if not risk_amount or risk_amount <= 0:
        return None
    return round(net_pnl / risk_amount, 4)
