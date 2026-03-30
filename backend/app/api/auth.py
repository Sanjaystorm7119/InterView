from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.utils.rate_limit import limiter
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_KWARGS = {
    "httponly": True,
    "samesite": "none",
    "secure": False,  # Set True in production behind HTTPS
}


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **COOKIE_KWARGS,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        **COOKIE_KWARGS,
    )


@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/minute")
def register(request: Request, req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        firstname=req.firstname,
        lastname=req.lastname,
        name=f"{req.firstname} {req.lastname}".strip(),
        credits=10,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "name": user.name,
            "credits": user.credits,
        },
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "name": user.name,
            "credits": user.credits,
            "picture": user.picture,
        },
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, req: RefreshRequest, db: Session = Depends(get_db)):
    # Accept refresh token from cookie OR request body (backward compatible)
    token = request.cookies.get("refresh_token") or req.refresh_token
    payload = decode_token(token) if token else None
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(data={"sub": user.email})
    new_refresh_token = create_refresh_token(data={"sub": user.email})
    _set_auth_cookies(response, access_token, new_refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "name": user.name,
            "credits": user.credits,
            "picture": user.picture,
        },
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", **{k: v for k, v in COOKIE_KWARGS.items()})
    response.delete_cookie(key="refresh_token", **{k: v for k, v in COOKIE_KWARGS.items()})
    return {"success": True}
