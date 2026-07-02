import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from supabase import create_client, Client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# For development, "*" is okay.
# For production later, we will replace this with your Netlify domain.
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")


if not SUPABASE_URL:
    raise RuntimeError("Missing SUPABASE_URL in backend/.env")

if not SUPABASE_URL.startswith("https://") or not SUPABASE_URL.endswith(".supabase.co"):
    raise RuntimeError(
        "Invalid SUPABASE_URL. It should look like: https://your-project-id.supabase.co"
    )

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY in backend/.env")


supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="Face Attendance Backend")


# CORS setup
if ALLOWED_ORIGINS == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [
        origin.strip()
        for origin in ALLOWED_ORIGINS.split(",")
        if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Optional local frontend serving
# This helps you test locally/ngrok using:
# http://127.0.0.1:8000/frontend/index.html
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

if FRONTEND_DIR.exists():
    app.mount(
        "/frontend",
        StaticFiles(directory=str(FRONTEND_DIR), html=True),
        name="frontend"
    )


class FaceVectorItem(BaseModel):
    pose: str
    vector: List[float] = Field(..., min_length=128, max_length=128)


class RegisterFaceRequest(BaseModel):
    full_name: str
    vectors: List[FaceVectorItem]


class VerifyFaceRequest(BaseModel):
    vector: List[float] = Field(..., min_length=128, max_length=128)
    threshold: Optional[float] = 0.65


def to_pgvector(vector: List[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in vector) + "]"


@app.get("/", include_in_schema=False)
def home():
    """
    Local/ngrok helper route.
    If frontend folder exists, open frontend home.
    On Render backend, this still works if the frontend folder exists in repo.
    """
    if FRONTEND_DIR.exists():
        return RedirectResponse(url="/frontend/index.html")

    return {
        "status": "running",
        "message": "Face Attendance Backend is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "running",
        "message": "Face Attendance Backend is running"
    }


@app.post("/register-face")
def register_face(payload: RegisterFaceRequest):
    full_name = payload.full_name.strip()

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")

    if len(payload.vectors) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one face vector is required"
        )

    try:
        user_response = (
            supabase
            .table("registered_users")
            .insert({"full_name": full_name})
            .execute()
        )

        if not user_response.data:
            raise HTTPException(
                status_code=500,
                detail="Could not create user"
            )

        user = user_response.data[0]
        user_id = user["id"]

        vector_rows = []

        for item in payload.vectors:
            vector_rows.append({
                "user_id": user_id,
                "pose": item.pose,
                "descriptor": to_pgvector(item.vector)
            })

        vector_response = (
            supabase
            .table("face_vectors")
            .insert(vector_rows)
            .execute()
        )

        return {
            "success": True,
            "message": "Face registered successfully",
            "user": {
                "id": user_id,
                "full_name": full_name
            },
            "stored_vectors": len(vector_response.data or [])
        }

    except Exception as error:
        print("Register error:", error)
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/verify-face")
def verify_face(payload: VerifyFaceRequest):
    try:
        query_embedding = to_pgvector(payload.vector)
        threshold = payload.threshold or 0.65

        response = (
            supabase
            .rpc(
                "match_face",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.0,
                    "match_count": 1
                }
            )
            .execute()
        )

        matches = response.data or []

        if len(matches) == 0:
            return {
                "verified": False,
                "message": "No registered face data found",
                "threshold": threshold,
                "best_match": None
            }

        best_match = matches[0]
        similarity = float(best_match["similarity"])
        verified = similarity >= threshold

        return {
            "verified": verified,
            "message": "Face verified successfully" if verified else "Face not verified",
            "threshold": threshold,
            "best_match": {
                "user_id": best_match["user_id"],
                "full_name": best_match["full_name"],
                "matched_pose": best_match["pose"],
                "similarity": similarity
            }
        }

    except Exception as error:
        print("Verify error:", error)
        raise HTTPException(status_code=500, detail=str(error))
