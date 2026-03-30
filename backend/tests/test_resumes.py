"""Integration tests for the resume bank endpoints."""
import pytest


@pytest.fixture
def auth_headers(client):
    client.post("/api/auth/register", json={
        "email": "resume_tester@example.com",
        "password": "password123",
        "firstname": "Resume",
        "lastname": "Tester",
    })
    resp = client.post("/api/auth/login", json={
        "email": "resume_tester@example.com",
        "password": "password123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_resume(client, auth_headers):
    resp = client.post("/api/resumes/", json={
        "candidate_name": "Alice Smith",
        "candidate_email": "alice@example.com",
        "file_url": "alice_cv.pdf",
        "parsed_data": {"skills": ["Python", "FastAPI"], "years_of_experience": "3"},
    }, headers=auth_headers)
    assert resp.status_code == 200
    return resp.json()


class TestResumeCreate:
    def test_create_resume(self, client, auth_headers):
        resp = client.post("/api/resumes/", json={
            "candidate_name": "Bob Jones",
            "candidate_email": "bob@example.com",
            "file_url": "bob.pdf",
            "parsed_data": {},
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["candidate_name"] == "Bob Jones"

    def test_create_duplicate_email_rejected(self, client, auth_headers, sample_resume):
        resp = client.post("/api/resumes/", json={
            "candidate_name": "Alice Smith Duplicate",
            "candidate_email": "alice@example.com",  # same email
            "file_url": "alice_v2.pdf",
            "parsed_data": {},
        }, headers=auth_headers)
        assert resp.status_code == 409

    def test_create_requires_auth(self, client):
        resp = client.post("/api/resumes/", json={
            "candidate_name": "Unauthorized",
            "candidate_email": "unauth@example.com",
        })
        assert resp.status_code == 403


class TestResumeList:
    def test_list_resumes(self, client, auth_headers, sample_resume):
        resp = client.get("/api/resumes/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert any(r["candidate_email"] == "alice@example.com" for r in resp.json())

    def test_search_by_name(self, client, auth_headers, sample_resume):
        resp = client.get("/api/resumes/?search=Alice", headers=auth_headers)
        assert resp.status_code == 200
        results = resp.json()
        assert all("alice" in (r.get("candidate_name") or "").lower() or
                   "alice" in str(r.get("parsed_data") or "").lower()
                   for r in results)

    def test_search_no_results(self, client, auth_headers, sample_resume):
        resp = client.get("/api/resumes/?search=xyznotfound999", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []


class TestResumeDelete:
    def test_delete_resume(self, client, auth_headers, sample_resume):
        resp = client.delete(f"/api/resumes/{sample_resume['id']}", headers=auth_headers)
        assert resp.status_code == 200
        # Verify it's gone
        resp2 = client.get(f"/api/resumes/{sample_resume['id']}", headers=auth_headers)
        assert resp2.status_code == 404

    def test_delete_nonexistent(self, client, auth_headers):
        resp = client.delete("/api/resumes/999999", headers=auth_headers)
        assert resp.status_code == 404
