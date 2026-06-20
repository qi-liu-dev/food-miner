class FoodMinerError(Exception):
    """Base application error."""


class NotFoundError(FoodMinerError):
    pass


class ConflictError(FoodMinerError):
    pass


class ValidationError(FoodMinerError):
    pass
