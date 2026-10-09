"""Keep destructive seed fixtures isolated from the developer's application database."""

import os
import tempfile
from pathlib import Path

import pytest

_db_file = Path(tempfile.gettempdir()) / f"stayly-tests-{os.getpid()}.sqlite3"
os.environ["DATABASE_URL"] = f"sqlite:///{_db_file.as_posix()}"


@pytest.hookimpl(trylast=True)
def pytest_unconfigure(config):
    from app.database.session import engine

    engine.dispose()
    _db_file.unlink(missing_ok=True)
