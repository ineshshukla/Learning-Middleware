from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from schemas import LearnerCreate, LearnerResponse, LearnerLogin, Token
from crud import LearnerCRUD
from auth import create_access_token, verify_token
from config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_str}/auth/login")


def get_current_learner(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated learner."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token, credentials_exception)
    learner = LearnerCRUD.get_learner_by_id(db, learner_id=token_data.learner_id)
    if learner is None:
        raise credentials_exception
    return learner


@router.post("/signup", response_model=LearnerResponse, status_code=status.HTTP_201_CREATED)
def signup(learner: LearnerCreate, db: Session = Depends(get_db)):
    """Register a new learner."""
    # Check if learner already exists
    existing_learner = LearnerCRUD.get_learner_by_email(db, email=learner.email)
    if existing_learner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new learner
    db_learner = LearnerCRUD.create_learner(db=db, learner=learner)
    return db_learner


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login learner and return access token."""
    learner = LearnerCRUD.authenticate_learner(db, email=form_data.username, password=form_data.password)
    if not learner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": learner.learnerid}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
def login_json(learner_login: LearnerLogin, db: Session = Depends(get_db)):
    """Login learner with JSON payload and return access token."""
    learner = LearnerCRUD.authenticate_learner(db, email=learner_login.email, password=learner_login.password)
    if not learner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": learner.learnerid}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=LearnerResponse)
def get_current_learner_info(current_learner = Depends(get_current_learner)):
    """Get current learner information."""
    return current_learner