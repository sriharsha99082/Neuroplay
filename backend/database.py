import sqlite3
import hashlib
import secrets
import json

from pathlib import Path
from datetime import datetime


# ==========================================
# 1. DATABASE LOCATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "neuroplay.db"


# ==========================================
# 2. DATABASE CONNECTION
# ==========================================

def get_connection():

    connection = sqlite3.connect(DATABASE_PATH)

    connection.row_factory = sqlite3.Row

    # Enable foreign key support
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


# ==========================================
# 3. PASSWORD HASHING
# ==========================================

def hash_password(password):

    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        600000
    ).hex()

    return salt + "$" + password_hash


def verify_password(password, stored_password):

    try:

        salt, original_hash = stored_password.split("$")

        new_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            600000
        ).hex()

        return secrets.compare_digest(
            new_hash,
            original_hash
        )

    except (ValueError, AttributeError):

        return False


# ==========================================
# 4. CREATE DATABASE TABLES
# ==========================================

def initialize_database():

    connection = get_connection()

    cursor = connection.cursor()

    # USERS TABLE
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (

            user_id INTEGER PRIMARY KEY AUTOINCREMENT,

            username TEXT NOT NULL UNIQUE,

            password_hash TEXT NOT NULL,

            age INTEGER NOT NULL
                CHECK(age BETWEEN 7 AND 17),

            gender TEXT NOT NULL,

            created_at TEXT DEFAULT CURRENT_TIMESTAMP

        )
    """)

    # TEST RESULTS TABLE
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_results (

            result_id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            age INTEGER NOT NULL,

            question_count INTEGER,

            correct_answers INTEGER,

            incorrect_answers INTEGER,

            accuracy_percent REAL,

            total_clicks INTEGER,

            total_score REAL,

            completion_time_seconds REAL,

            risk_status TEXT,

            risk_probability REAL,

            model_used TEXT,

            question_records TEXT,

            prediction_details TEXT,

            created_at TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
            REFERENCES users(user_id)

            ON DELETE CASCADE

        )
    """)

    connection.commit()

    connection.close()

    print("NeuroPlay database initialized successfully!")


# ==========================================
# 5. CREATE NEW USER
# ==========================================

def create_user(username, password, age, gender):

    connection = get_connection()

    cursor = connection.cursor()

    try:

        password_hash = hash_password(password)

        cursor.execute("""
            INSERT INTO users (
                username,
                password_hash,
                age,
                gender
            )

            VALUES (?, ?, ?, ?)
        """, (
            username,
            password_hash,
            age,
            gender
        ))

        connection.commit()

        user_id = cursor.lastrowid

        return {
            "success": True,
            "message": "User registered successfully",
            "user_id": user_id
        }

    except sqlite3.IntegrityError:

        return {
            "success": False,
            "message": "Username already exists"
        }

    except Exception as error:

        return {
            "success": False,
            "message": str(error)
        }

    finally:

        connection.close()


# ==========================================
# 6. AUTHENTICATE USER LOGIN
# ==========================================

def authenticate_user(username, password):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM users
        WHERE username = ?
    """, (username,))

    user = cursor.fetchone()

    connection.close()

    if user is None:

        return {
            "success": False,
            "message": "Username not found"
        }

    if verify_password(password, user["password_hash"]):

        return {
            "success": True,
            "message": "Login successful",

            "user": {
                "user_id": user["user_id"],
                "username": user["username"],
                "age": user["age"],
                "gender": user["gender"]
            }
        }

    return {
        "success": False,
        "message": "Incorrect password"
    }


# ==========================================
# 7. SAVE TEST RESULTS
# ==========================================

def save_test_result(user_id, result_data, prediction_data=None):

    connection = get_connection()

    cursor = connection.cursor()

    try:

        prediction_data = prediction_data or {}

        # Extract prediction details
        prediction = prediction_data.get(
            "prediction_result",
            prediction_data
        )

        # Convert question records into JSON
        question_records = json.dumps(
            result_data.get("question_records", [])
        )

        # Convert prediction details into JSON
        prediction_details = json.dumps(prediction)

        cursor.execute("""
            INSERT INTO test_results (

                user_id,
                age,
                question_count,
                correct_answers,
                incorrect_answers,
                accuracy_percent,
                total_clicks,
                total_score,
                completion_time_seconds,
                risk_status,
                risk_probability,
                model_used,
                question_records,
                prediction_details

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

        """, (

            user_id,

            result_data.get("age"),

            result_data.get("question_count"),

            result_data.get("correct_answers"),

            result_data.get("incorrect_answers"),

            result_data.get("accuracy_percent"),

            result_data.get("total_clicks"),

            result_data.get("total_score"),

            result_data.get("completion_time_seconds"),

            prediction.get("risk_status"),

            prediction.get("risk_probability"),

            prediction.get("model_used"),

            question_records,

            prediction_details

        ))

        connection.commit()

        result_id = cursor.lastrowid

        return {
            "success": True,
            "message": "Test result saved successfully",
            "result_id": result_id
        }

    except Exception as error:

        connection.rollback()

        return {
            "success": False,
            "message": str(error)
        }

    finally:

        connection.close()


# ==========================================
# 8. GET USER TEST HISTORY
# ==========================================

def get_user_test_results(user_id):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM test_results
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))

    results = cursor.fetchall()

    connection.close()

    return [dict(row) for row in results]


# ==========================================
# 9. GET ALL USERS
# ==========================================

def get_all_users():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            user_id,
            username,
            age,
            gender,
            created_at
        FROM users
        ORDER BY user_id
    """)

    users = cursor.fetchall()

    connection.close()

    return [dict(row) for row in users]

# ==========================================
# GET USER BY USERNAME
# ==========================================

def get_user_by_username(username):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT user_id, username, age, gender
        FROM users
        WHERE username = ?
    """, (username,))

    user = cursor.fetchone()

    connection.close()

    if user:
        return dict(user)

    return None
# ==========================================
# 10. TEST DATABASE
# ==========================================

if __name__ == "__main__":

    initialize_database()

    print("\nDatabase location:")
    print(DATABASE_PATH)

    print("\nRegistered users:")

    users = get_all_users()


    for user in users:

        print(user)
