"""Stripe payment endpoints for purchasing credits."""
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.utils.deps import get_current_user

settings = get_settings()
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Credit bundles available for purchase
CREDIT_PACKAGES = [
    {"id": "credits_10", "credits": 10, "price_usd": 9, "label": "Starter"},
    {"id": "credits_30", "credits": 30, "price_usd": 24, "label": "Growth"},
    {"id": "credits_100", "credits": 100, "price_usd": 69, "label": "Scale"},
]


class CheckoutRequest(BaseModel):
    package_id: str


@router.get("/packages")
def list_packages():
    return CREDIT_PACKAGES


@router.post("/create-checkout")
def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment service not configured")

    package = next((p for p in CREDIT_PACKAGES if p["id"] == body.package_id), None)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package ID")

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"HireEva {package['label']} — {package['credits']} Credits",
                        },
                        "unit_amount": package["price_usd"] * 100,  # cents
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=f"{settings.FRONTEND_URL}/settings?payment=success&credits={package['credits']}",
            cancel_url=f"{settings.FRONTEND_URL}/settings?payment=cancelled",
            client_reference_id=current_user.email,
            metadata={
                "user_email": current_user.email,
                "credits": str(package["credits"]),
                "package_id": package["id"],
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        user_email = session_data.get("metadata", {}).get("user_email")
        credits_str = session_data.get("metadata", {}).get("credits", "0")

        if user_email and credits_str.isdigit():
            credits_to_add = int(credits_str)
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                user.credits = (user.credits or 0) + credits_to_add
                db.commit()

    return {"received": True}
