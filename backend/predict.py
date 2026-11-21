import joblib
import pandas as pd
import numpy as np
from pathlib import Path


# ==========================================
# 1. LOAD TRAINED MODELS
# ==========================================

MODEL_PATH = Path(__file__).resolve().parent.parent / "neuroplay_models.joblib"

trained_models = joblib.load(MODEL_PATH)


# ==========================================
# 2. QUESTION COUNTS
# ==========================================

QUESTION_COUNTS = {
    "7-8": 27,
    "9-12": 30,
    "13-17": 32
}


# ==========================================
# 3. GET AGE GROUP
# ==========================================

def get_age_group(age):

    if 7 <= age <= 8:
        return "7-8"

    elif 9 <= age <= 12:
        return "9-12"

    elif 13 <= age <= 17:
        return "13-17"

    else:
        raise ValueError("Age must be between 7 and 17.")


# ==========================================
# 4. PREPARE MODEL FEATURES
# ==========================================

def prepare_features(age, question_records, question_count):

    records_by_id = {}

    for record in question_records:

        question_id = int(record["id"])

        if question_id < 1 or question_id > question_count:
            raise ValueError(
                f"Invalid question ID: {question_id}"
            )

        if question_id in records_by_id:
            raise ValueError(
                f"Duplicate question ID: {question_id}"
            )

        records_by_id[question_id] = record

    # Create one row of model input

    X = pd.DataFrame(index=[0])

    X["age"] = age

    total_hits = 0
    total_misses = 0
    total_attempts = 0
    total_clicks = 0
    total_time = 0
    total_timeouts = 0

    # Q10 is excluded from ML features

    for i in range(1, question_count + 1):

        if i == 10:
            continue

        record = records_by_id.get(i, {})

        clicks = int(record.get("clicks", 0) or 0)

        attempts = int(record.get("attempts", 0) or 0)

        hits_value = record.get("hits")

        if hits_value is None:
            hits = int(record.get("hit", 0) or 0)
        else:
            hits = int(hits_value or 0)

        misses_value = record.get("misses")

        if misses_value is None:
            misses = max(attempts - hits, 0)
        else:
            misses = int(misses_value or 0)

        completion_time = int(
            record.get("completion_time_ms", 0) or 0
        )

        timed_out = int(bool(record.get("timed_out", False)))

        # Individual question features

        X[f"Q{i}_clicks"] = clicks
        X[f"Q{i}_hits"] = hits
        X[f"Q{i}_misses"] = misses
        X[f"Q{i}_attempts"] = attempts

        X[f"Q{i}_completion_time_ms"] = completion_time
        X[f"Q{i}_timed_out"] = timed_out

        X[f"Q{i}_accuracy"] = (
            hits / attempts if attempts > 0 else 0
        )

        X[f"Q{i}_time_per_attempt"] = (
            completion_time / attempts if attempts > 0 else 0
        )

        # Overall totals

        total_hits += hits
        total_misses += misses
        total_attempts += attempts
        total_clicks += clicks
        total_time += completion_time
        total_timeouts += timed_out

    # Overall performance features

    X["total_hits"] = total_hits
    X["total_misses"] = total_misses
    X["total_attempts"] = total_attempts
    X["total_clicks"] = total_clicks

    X["overall_accuracy"] = (
        total_hits / total_attempts
        if total_attempts > 0 else 0
    )

    X["miss_rate"] = (
        total_misses / total_attempts
        if total_attempts > 0 else 0
    )

    X["total_completion_time_ms"] = total_time
    X["total_timeouts"] = total_timeouts

    return X


# ==========================================
# 5. CALCULATE PERFORMANCE-BASED RISK
# ==========================================

def calculate_risk(
    age_group,
    question_records,
    prediction,
    probability,
    model_key
):

    question_count = QUESTION_COUNTS[age_group]

    # Q10 is excluded from scored questions

    scored_questions = question_count - 1

    # Count correctly answered questions.
    # The "hit" field represents the question result.

    correct_answers = sum(
        1
        for record in question_records
        if int(record.get("id", 0)) != 10
        and int(record.get("hit", 0) or 0) == 1
    )

    screening_accuracy = (
        correct_answers / scored_questions
    ) * 100

    # Prototype performance indicator

    if screening_accuracy <= 30:
        status = "High Risk"

    elif screening_accuracy <= 60:
        status = "Moderate Risk"

    else:
        status = "Low Risk"

    return {

        "age_group": age_group,

        "prediction": int(prediction),

        "risk_status": status,

        "risk_probability": round(float(probability), 4),

        "screening_accuracy": round(screening_accuracy, 2),

        "model_used": str(model_key),

        "q10_used_for_prediction": False

    }


# ==========================================
# 6. MAIN NEUROPLAY PREDICTION FUNCTION
# ==========================================

def predict_neuroplay(age, question_records):

    # Select age group

    age_group = get_age_group(age)

    question_count = QUESTION_COUNTS[age_group]

    # Select corresponding trained model

    model_data = trained_models[age_group]

    model = model_data["model"]

    model_features = model_data["features"]

    # Prepare input features

    X = prepare_features(
        age=age,
        question_records=question_records,
        question_count=question_count
    )

    # Arrange columns in the exact order used during training

    X = X.reindex(
        columns=model_features,
        fill_value=0
    )

    # ML prediction

    prediction = model.predict(X)[0]

    # Prediction probability for class 1

    probabilities = model.predict_proba(X)[0]

    classes = list(model.classes_)

    if 1 in classes:
        probability = probabilities[classes.index(1)]
    else:
        probability = 0.0

    # Calculate performance-based risk indicator

    result = calculate_risk(
        age_group=age_group,
        question_records=question_records,
        prediction=prediction,
        probability=probability,
        model_key=age_group
    )

    return result