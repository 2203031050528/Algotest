def evaluate_condition(
    current_value,
    operator,
    target_value,
):
    if current_value is None:
        return False

    if operator == "<":
        return current_value < target_value

    if operator == "<=":
        return current_value <= target_value

    if operator == ">":
        return current_value > target_value

    if operator == ">=":
        return current_value >= target_value

    if operator == "==":
        return current_value == target_value

    if operator == "!=":
        return current_value != target_value

    return False


def evaluate_conditions(
    row,
    conditions,
):
    if not conditions:
        return False

    for condition in conditions:

        indicator = condition["indicator"]
        period = condition.get("period")

        operator = condition["operator"]
        target = condition["value"]

        column = (
            indicator.lower()
            if not period
            else f"{indicator.lower()}_{period}"
        )

        if column not in row:
            return False

        if not evaluate_condition(
            row[column],
            operator,
            target,
        ):
            return False

    return True