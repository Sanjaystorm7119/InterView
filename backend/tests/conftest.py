"""
Pytest configuration — in-memory SQLite database for all tests.
No external services (PostgreSQL, OpenRouter, Vapi) are required.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point at SQLite before any app imports that trigger get_settings()
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-tests-32chars")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")

# SQLite doesn't support JSONB — patch it to plain JSON before any model imports
from sqlalchemy.dialects import postgresql as _pg
from sqlalchemy import JSON as _JSON
_pg.JSONB = _JSON  # type: ignore[assignment]

# SQLite requires BIGINT → INTEGER so autoincrement works on primary keys
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
SQLiteTypeCompiler.visit_BIGINT = lambda self, type_, **kwargs: "INTEGER"  # type: ignore[assignment]

from app.database import Base, get_db  # noqa: E402 — must come after env setup
from app.main import app  # noqa: E402

# Use a single in-memory SQLite engine shared across the test session
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset slowapi in-memory counters before every test."""
    try:
        app.state.limiter._storage.reset()
    except Exception:
        pass
    yield


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
