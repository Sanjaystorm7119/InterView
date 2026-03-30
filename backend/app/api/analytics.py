from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.interview import Interview
from app.models.feedback import InterviewFeedback
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate analytics for the recruiter's dashboard."""
    interviews = (
        db.query(Interview)
        .filter(Interview.user_email == current_user.email)
        .all()
    )

    interview_ids = [iv.interview_id for iv in interviews]

    feedbacks = (
        db.query(InterviewFeedback)
        .filter(InterviewFeedback.interview_id.in_(interview_ids))
        .all()
        if interview_ids else []
    )

    # Overall stats
    total_interviews = len(interviews)
    total_completions = len(feedbacks)

    scores = []
    recommended_count = 0
    for fb in feedbacks:
        rating = (fb.feedback or {}).get("feedback", {}).get("rating", {})
        overall = rating.get("OverallRating")
        if overall is not None:
            try:
                scores.append(float(overall))
            except (TypeError, ValueError):
                pass
        rec = (fb.feedback or {}).get("feedback", {}).get("Recommendation", "")
        if isinstance(rec, str) and rec.lower() in ("yes", "recommended", "true"):
            recommended_count += 1

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    recommendation_rate = round((recommended_count / total_completions) * 100) if total_completions > 0 else 0

    # Funnel data
    funnel = [
        {"stage": "Interviews Created", "count": total_interviews},
        {"stage": "Candidates Completed", "count": total_completions},
        {"stage": "Recommended", "count": recommended_count},
    ]

    # Scores by job role (top 8)
    role_scores: dict[str, list[float]] = {}
    for iv in interviews:
        role = iv.job_position or "Unknown"
        iv_feedbacks = [fb for fb in feedbacks if fb.interview_id == iv.interview_id]
        for fb in iv_feedbacks:
            rating = (fb.feedback or {}).get("feedback", {}).get("rating", {})
            overall = rating.get("OverallRating")
            if overall is not None:
                try:
                    role_scores.setdefault(role, []).append(float(overall))
                except (TypeError, ValueError):
                    pass

    role_avg = [
        {"role": role[:30], "avg_score": round(sum(vals) / len(vals), 1), "count": len(vals)}
        for role, vals in role_scores.items()
    ]
    role_avg.sort(key=lambda x: -x["avg_score"])
    role_avg = role_avg[:8]

    # Recent activity (last 6 completions)
    recent_feedbacks = sorted(feedbacks, key=lambda fb: fb.created_at or "", reverse=True)[:6]
    recent = []
    for fb in recent_feedbacks:
        iv = next((i for i in interviews if i.interview_id == fb.interview_id), None)
        rating = (fb.feedback or {}).get("feedback", {}).get("rating", {})
        recent.append({
            "candidate_name": fb.user_name or fb.user_email,
            "job_position": iv.job_position if iv else "Unknown",
            "overall_score": rating.get("OverallRating"),
            "recommendation": (fb.feedback or {}).get("feedback", {}).get("Recommendation", ""),
            "created_at": str(fb.created_at),
        })

    return {
        "total_interviews": total_interviews,
        "total_completions": total_completions,
        "avg_score": avg_score,
        "recommendation_rate": recommendation_rate,
        "funnel": funnel,
        "role_scores": role_avg,
        "recent_completions": recent,
    }
