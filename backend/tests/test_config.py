import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_cookie_samesite_defaults_are_local_development_safe():
    config = Settings(_env_file=None)
    assert config.session_cookie_samesite == "lax"
    assert config.session_cookie_secure is False


def test_cookie_samesite_none_requires_secure():
    with pytest.raises(ValidationError, match="SESSION_COOKIE_SAMESITE=none requires SESSION_COOKIE_SECURE=true"):
        Settings(_env_file=None, session_cookie_samesite="None", session_cookie_secure=False)


def test_cookie_samesite_none_is_supported_with_secure():
    config = Settings(_env_file=None, session_cookie_samesite="None", session_cookie_secure=True)
    assert config.session_cookie_samesite == "none"
    assert config.session_cookie_secure is True
