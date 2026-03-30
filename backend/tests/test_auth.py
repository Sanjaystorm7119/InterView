"""Integration tests for the authentication endpoints."""
import pytest


@pytest.fixture
def registered_user(client):
    resp = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "firstname": "Test",
        "lastname": "User",
    })
    assert resp.status_code == 200
    return resp.json()


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "securepass",
            "firstname": "New",
            "lastname": "User",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["credits"] == 10

    def test_register_duplicate_email(self, client, registered_user):
        resp = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "anotherpassword",
            "firstname": "Another",
            "lastname": "User",
        })
        assert resp.status_code == 409

    def test_register_missing_fields(self, client):
        resp = client.post("/api/auth/register", json={"email": "missing@example.com"})
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client, registered_user):
        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    def test_login_wrong_password(self, client, registered_user):
        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_email(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "anypassword",
        })
        assert resp.status_code == 401


class TestRefresh:
    def test_refresh_token_success(self, client, registered_user):
        resp = client.post("/api/auth/refresh", json={
            "refresh_token": registered_user["refresh_token"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    def test_refresh_with_access_token_fails(self, client, registered_user):
        # Clear cookie so the endpoint can't fall back to the valid cookie;
        # the body-provided access_token should then be rejected.
        client.cookies.clear()
        resp = client.post("/api/auth/refresh", json={
            "refresh_token": registered_user["access_token"],
        })
        assert resp.status_code == 401

    def test_refresh_with_invalid_token_fails(self, client):
        resp = client.post("/api/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert resp.status_code == 401
