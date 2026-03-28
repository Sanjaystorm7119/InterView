from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.schemas.resume import SendEmailRequest
from app.services.email_service import send_interview_email
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/send-invitation")
def send_invitation(
    body: SendEmailRequest,
    current_user: User = Depends(get_current_user),
):
    if not body.candidate_email or not body.role_title:
        raise HTTPException(
            status_code=400,
            detail="candidate_email and role_title are required",
        )

    recruiter_name = (
        f"{current_user.firstname or ''} {current_user.lastname or ''}".strip()
        or "The Hiring Team"
    )

    try:
        result = send_interview_email(
            candidate_email=body.candidate_email,
            candidate_name=body.candidate_name,
            role_title=body.role_title,
            company_name=body.company_name,
            interview_id=body.interview_id,
            recruiter_name=recruiter_name,
        )
        return {"success": True, "id": getattr(result, "id", None)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
