import pytest

from app.database.session import sqlalchemy_database_url


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("postgresql://user:pass@host/db?sslmode=require", "postgresql+psycopg://user:pass@host/db?sslmode=require"),
        ("postgres://user:pass@host/db", "postgresql+psycopg://user:pass@host/db"),
        ("sqlite:///./airbnb.db", "sqlite:///./airbnb.db"),
    ],
)
def test_database_url_driver_selection(source, expected):
    assert sqlalchemy_database_url(source) == expected
