"""Unit tests for the matching JSON parsing helper."""
import json
import pytest
from app.api.matching import _clean_json


class TestCleanJson:
    def test_plain_json(self):
        raw = '{"confidence_score": 85, "matched_skills": ["Python"]}'
        result = _clean_json(raw)
        assert result["confidence_score"] == 85
        assert result["matched_skills"] == ["Python"]

    def test_fenced_json(self):
        raw = "```json\n{\"confidence_score\": 70}\n```"
        result = _clean_json(raw)
        assert result["confidence_score"] == 70

    def test_plain_fence_json(self):
        raw = "```\n{\"confidence_score\": 60}\n```"
        result = _clean_json(raw)
        assert result["confidence_score"] == 60

    def test_whitespace_trimmed(self):
        raw = "  \n  {\"score\": 50}  \n  "
        result = _clean_json(raw)
        assert result["score"] == 50

    def test_invalid_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _clean_json("not valid json at all")
