from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        firstname=current_user.firstname,
        lastname=current_user.lastname,
        picture=current_user.picture,
        credits=current_user.credits,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserResponse)
def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.firstname is not None:
        current_user.firstname = body.firstname
    if body.lastname is not None:
        current_user.lastname = body.lastname
    if body.name is not None:
        current_user.name = body.name
    if body.picture is not None:
        current_user.picture = body.picture

    db.commit()
    db.refresh(current_user)

    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        firstname=current_user.firstname,
        lastname=current_user.lastname,
        picture=current_user.picture,
        credits=current_user.credits,
        created_at=current_user.created_at,
    )
