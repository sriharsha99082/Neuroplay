import os
import json
import time
import base64
import hashlib
import hmac

from fastapi import (
    FastAPI,
    HTTPException,
    Depends
)

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field

from typing import List, Optional

from predict import predict_neuroplay

from database import (
    initialize_database,
    create_user,
    authenticate_user,
    get_user_by_username,
    save_test_result,
    get_user_test_results
)

# ==========================================
# 1. CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(

    title="NeuroPlay Backend",

    description="Dyslexia Risk Screening Prediction API",

    version="1.0"

)
# Authentication Configuration

SECRET_KEY = os.getenv("SECRET_KEY", "neuroplay-development-secret-change-this")

TOKEN_EXPIRY_SECONDS = 60 * 60 * 24  # 24 hours

security = HTTPBearer()
# ==========================================
# AUTHENTICATION TOKEN FUNCTIONS
# ==========================================

def create_access_token(user_id):

    expiry = int(time.time()) + TOKEN_EXPIRY_SECONDS

    payload = {
        "user_id": user_id,
        "expiry": expiry
    }

    payload_bytes = json.dumps(payload).encode("utf-8")

    encoded_payload = base64.urlsafe_b64encode(
        payload_bytes
    ).decode("utf-8").rstrip("=")

    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return encoded_payload + "." + signature


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        encoded_payload, received_signature = token.split(".")

        expected_signature = hmac.new(
            SECRET_KEY.encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(
            received_signature,
            expected_signature
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        padded_payload = encoded_payload + "=" * (
            -len(encoded_payload) % 4
        )

        payload = json.loads(
            base64.urlsafe_b64decode(padded_payload)
        )

        if int(payload["expiry"]) < int(time.time()):
            raise HTTPException(
                status_code=401,
                detail="Session expired. Please login again."
            )

        return {
            "user_id": int(payload["user_id"])
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

# ==========================================
# 2. CORS CONFIGURATION
# ==========================================


# CORS CONFIGURATION

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://neuroplay-1.onrender.com"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# 3. INITIALIZE DATABASE
# ==========================================

@app.on_event("startup")
def startup_event():

    initialize_database()

    print("NeuroPlay database connected successfully!")


# ==========================================
# 4. SIGNUP REQUEST MODEL
# ==========================================

class SignupRequest(BaseModel):

    username: str = Field(min_length=6)

    password: str = Field(min_length=6)

    age: int = Field(ge=7, le=17)

    gender: str


# ==========================================
# 5. LOGIN REQUEST MODEL
# ==========================================

class LoginRequest(BaseModel):

    username: str

    password: str


# ==========================================
# 6. QUESTION RECORD MODEL
# ==========================================

class QuestionRecord(BaseModel):

    id: int

    game: Optional[str] = None

    clicks: int = 0

    hit: Optional[int] = 0

    hits: Optional[int] = None

    misses: Optional[int] = None

    attempts: int = 0

    score: int = 0

    completion_time_ms: int = 0

    timed_out: bool = False

    accuracy: Optional[float] = None


# ==========================================
# 7. PREDICTION REQUEST MODEL
# ==========================================

class PredictionRequest(BaseModel):

    username: str

    age: int = Field(ge=7, le=17)

    gender: Optional[str] = None

    question_records: List[QuestionRecord]


# ==========================================
# 8. HOME ROUTE
# ==========================================

@app.get("/")
def home():

    return {

        "message": "Welcome to NeuroPlay Backend",

        "status": "Running"

    }


# ==========================================
# 9. HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {

        "status": "healthy",

        "project": "NeuroPlay"

    }


# ==========================================
# 10. USER SIGNUP
# ==========================================

@app.post("/signup")
def signup(request: SignupRequest):

    result = create_user(

        username=request.username,

        password=request.password,

        age=request.age,

        gender=request.gender

    )

    if not result["success"]:

        raise HTTPException(

            status_code=400,

            detail=result["message"]

        )

    return {

        "success": True,

        "message": "Registration successful",

        "user_id": result["user_id"]

    }


# ==========================================
# 11. USER LOGIN
# ==========================================

@app.post("/login")
def login(request: LoginRequest):

    result = authenticate_user(

        username=request.username,

        password=request.password

    )

    if not result["success"]:

        raise HTTPException(

            status_code=401,

            detail=result["message"]

        )

    # Generate authentication token
    access_token = create_access_token(
        result["user"]["user_id"]
     )

    return {
        "success": True,
        "message": "Login successful",
        "user": result["user"],
        "access_token": access_token,
        "token_type": "bearer"
    }

# ==========================================
# GET LOGGED-IN USER TEST HISTORY
# ==========================================

@app.get("/results")
def get_results(current_user: dict = Depends(get_current_user)):

    user_id = current_user["user_id"]

    results = get_user_test_results(user_id)

    formatted_results = []

    for result in results:

        # Convert stored JSON strings into Python objects
        try:
            result["question_records"] = json.loads(
                result["question_records"] or "[]"
            )

            result["prediction_details"] = json.loads(
                result["prediction_details"] or "{}"
            )

        except (json.JSONDecodeError, TypeError):
            result["question_records"] = []
            result["prediction_details"] = {}

        formatted_results.append(result)

    return {
        "success": True,
        "results": formatted_results
    }
# ==========================================
# 12. RANDOM FOREST PREDICTION
# ==========================================

@app.post("/predict")
def predict(request: PredictionRequest):

    try:

        # Convert question records into dictionaries

        records = [

            record.model_dump()

            for record in request.question_records

        ]

        # Check whether the user exists

        user = get_user_by_username(request.username)

        if user is None:

            raise HTTPException(

                status_code=404,

                detail="User not found. Please register first."

            )

        # Check registered age

        if user["age"] != request.age:

            raise HTTPException(

                status_code=400,

                detail="Age does not match registered account."

            )

        # ==================================
        # RANDOM FOREST ML PREDICTION
        # ==================================

        result = predict_neuroplay(

            age=request.age,

            question_records=records

        )

        # ==================================
        # CALCULATE TEST PERFORMANCE
        # ==================================

        correct_answers = sum(

            1 for record in records

            if record.get("hit") == 1

        )

        incorrect_answers = sum(

            1 for record in records

            if record.get("hit") == 0

        )

        answered_questions = (

            correct_answers + incorrect_answers

        )

        accuracy = (

            correct_answers / answered_questions * 100

            if answered_questions > 0 else 0

        )

        total_clicks = sum(

            record.get("clicks", 0) or 0

            for record in records

        )

        total_score = sum(

            record.get("score", 0) or 0

            for record in records

        )

        completion_time = sum(

            record.get("completion_time_ms", 0) or 0

            for record in records

        ) / 1000

        # ==================================
        # PREPARE RESULT DATA
        # ==================================

        result_data = {

            "age": request.age,

            "question_count": len(records),

            "correct_answers": correct_answers,

            "incorrect_answers": incorrect_answers,

            "accuracy_percent": round(accuracy, 2),

            "total_clicks": total_clicks,

            "total_score": total_score,

            "completion_time_seconds": round(
                completion_time, 2
            ),

            "question_records": records

        }

        # ==================================
        # SAVE RESULTS IN SQLITE DATABASE
        # ==================================

        save_status = save_test_result(

            user_id=user["user_id"],

            result_data=result_data,

            prediction_data=result

        )

        if not save_status["success"]:

            raise HTTPException(

                status_code=500,

                detail=save_status["message"]

            )

        # ==================================
        # RETURN FINAL RESPONSE
        # ==================================

        return {

            "success": True,

            "username": request.username,

            "age": request.age,

            "gender": user["gender"],

            "prediction_result": result,

            "database": {

                "saved": True,

                "result_id": save_status["result_id"]

            },

            "message": (

                "This is a prototype screening indicator, "

                "not a medical diagnosis."

            )

        }

    except HTTPException:

        raise

    except ValueError as error:

        raise HTTPException(

            status_code=400,

            detail=str(error)

        )

    except Exception as error:

        raise HTTPException(

            status_code=500,

            detail=str(error)

        )
