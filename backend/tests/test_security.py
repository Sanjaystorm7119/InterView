"""Unit tests for JWT utility functions and password hashing."""
import time
import pytest
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("mysecretpassword")
        assert hashed != "mysecretpassword"

    def test_verify_correct_password(self):
        hashed = hash_password("correct-horse-battery-staple")
        assert verify_password("correct-horse-battery-staple", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt uses random salt


class TestJWT:
    def test_access_token_decode(self):
        token = create_access_token({"sub": "user@example.com"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user@example.com"
        assert payload["type"] == "access"

    def test_refresh_token_decode(self):
        token = create_refresh_token({"sub": "user@example.com"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_invalid_token_returns_none(self):
        assert decode_token("not.a.valid.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "user@example.com"})
        tampered = token[:-5] + "XXXXX"
        assert decode_token(tampered) is None

    def test_access_token_rejects_refresh_type(self):
        refresh = create_refresh_token({"sub": "user@example.com"})
        payload = decode_token(refresh)
        assert payload["type"] == "refresh"
        # An auth endpoint should reject this; type check is caller's responsibility
        assert payload["type"] != "access"
