import html as html_mod
import resend
from app.config import get_settings

settings = get_settings()


def _esc(value: str) -> str:
    """HTML-escape a user-supplied string for safe interpolation."""
    return html_mod.escape(value, quote=True)


def send_interview_email(
    candidate_email: str,
    candidate_name: str,
    role_title: str,
    company_name: str,
    interview_id: str,
    recruiter_name: str = "The Hiring Team",
):
    resend.api_key = settings.RESEND_API_KEY
    from_email = settings.RESEND_FROM_EMAIL
    # Escape all user-supplied values before HTML interpolation
    candidate_name = _esc(candidate_name)
    role_title = _esc(role_title)
    recruiter_name = _esc(recruiter_name)
    company_label = _esc(company_name or "our company")
    host_url = settings.HOST_URL
    interview_link = f"{host_url}/{interview_id}" if interview_id else None

    if interview_link:
        cta_block = f"""
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7;">
              Click the button below to begin your interview at your convenience.
            </p>
            <a href="{interview_link}"
               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
              Start Your Interview
            </a>
            <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">
              Or copy this link: <a href="{interview_link}" style="color:#6366f1;">{interview_link}</a>
            </p>
          </td>
        </tr>"""
    else:
        cta_block = f"""
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="mailto:{from_email}?subject=Interview%20for%20{role_title}"
               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
              Reply to Schedule Interview
            </a>
          </td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Interview Invitation</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">HireEva</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AI-Powered Recruitment</p>
        </td></tr>
        <tr><td style="padding:36px 40px 24px;">
          <h2 style="margin:0 0 12px;color:#1e1b4b;font-size:22px;font-weight:700;">Hi {candidate_name or 'there'}, you've been selected!</h2>
          <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7;">
            We've reviewed your profile and would like to invite you to interview for the
            <strong>{role_title}</strong> position at <strong>{company_label}</strong>.
          </p>
          <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.7;">
            The interview is conducted by our AI interviewer, <strong>Eva</strong>, and takes
            place entirely online — you can complete it whenever you're ready.
          </p>
        </td></tr>
        {cta_block}
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
            This invitation was sent by {recruiter_name} via HireEva.<br/>
            If you believe you received this in error, please disregard this message.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    result = resend.Emails.send(
        {
            "from": from_email,
            "to": [candidate_email],
            "subject": f"Interview Invitation — {role_title} at {company_label}",
            "html": html.strip(),
        }
    )
    return result
