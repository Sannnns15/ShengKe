from sqlalchemy.orm import declarative_base

Base = declarative_base()

from app.models.user import User  # noqa: E402, F401
from app.models.moment import Moment  # noqa: E402, F401
from app.models.comment import Comment  # noqa: E402, F401
from app.models.like import Like  # noqa: E402, F401
from app.models.follow import Follow  # noqa: E402, F401
from app.models.notification import Notification  # noqa: E402, F401
