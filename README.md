# Web Face Verification System

A browser-based face registration and verification system built with **face-api.js**, **FastAPI**, **Supabase pgvector**, **Render**, and **Netlify**.

This project allows users to register their face using a webcam or mobile camera, generate face vectors directly inside the browser, store those vectors in a Supabase database, and verify users later using vector similarity matching.

## Live Links

Frontend: https://face-verification-system.netlify.app/  
Backend Health Check: https://web-face-attendance-system.onrender.com/api/health

---

## Project Overview

This system is designed for browser-based face verification and attendance-style use cases.

The main goal of the project is to avoid uploading raw face images to the backend. Instead, the browser processes the face locally, generates a 128-dimensional face vector, and sends only that vector to the backend.

The backend stores and verifies vector data using Supabase PostgreSQL with the pgvector extension.

---

## Key Features

- Browser-based face detection and recognition
- Mobile camera and desktop webcam support
- Automatic 5-pose face registration:
  - Front face
  - Left face
  - Right face
  - Up face
  - Down face
- Automatic face verification
- 65% similarity threshold for verification
- Face vectors generated in the browser
- No raw face image upload to backend
- Supabase PostgreSQL database with pgvector
- FastAPI backend API
- Netlify frontend deployment
- Render backend deployment
- Responsive mobile-first camera interface
- Public live deployment support

---

## Why This Version Is Different

This project is an improved version of the previous `face-attendance-web` prototype.

The previous version mainly focused on frontend camera capture and basic face detection behavior. This improved version adds a complete production-ready flow with frontend, backend, database, and public deployment.

| Previous Version | Improved Version |
|---|---|
| Basic camera and face detection flow | Full face registration and verification system |
| Mostly frontend-focused | Frontend + backend + database connected |
| Manual or limited capture flow | Automatic 5-pose guided registration |
| Local or ngrok-only testing | Public deployment with Netlify and Render |
| No real database storage | Supabase PostgreSQL with pgvector |
| Basic verification logic | Backend vector similarity matching |
| Image/camera focused | Privacy-focused vector-only architecture |

---

## Privacy-Focused Design

This project does not send raw face images to the backend.

The face processing happens in the browser using `face-api.js`.

Only face vectors are sent to the backend.

```text
Camera Image
↓
Browser face-api.js processing
↓
128-value face vector
↓
FastAPI backend
↓
Supabase pgvector database
```

This helps reduce backend processing cost and improves privacy by avoiding raw image uploads.

---

## Tech Stack

### Frontend

- HTML
- CSS
- JavaScript
- face-api.js
- Netlify hosting

### Backend

- Python 3.11
- FastAPI
- Supabase Python client
- Render hosting

### Database

- Supabase PostgreSQL
- pgvector extension
- Cosine similarity matching

---

## Project Structure

```text
face-attendance-system/
│
├── README.md
├── .gitignore
├── netlify.toml
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .env              # Local only. Do not commit.
│
└── frontend/
    ├── index.html
    ├── register.html
    ├── verify.html
    │
    ├── css/
    │   ├── styles.css
    │   └── verify.css
    │
    ├── js/
    │   ├── config.js
    │   ├── camera.js
    │   ├── face.js
    │   ├── storage.js
    │   ├── api.js
    │   ├── register.js
    │   └── verify.js
    │
    └── models/
```

---

## System Flow

### Face Registration Flow

```text
User opens Register page
↓
User enters name
↓
Camera starts
↓
System captures 5 face poses automatically
↓
Browser generates face vectors
↓
Frontend sends vectors to FastAPI backend
↓
Backend stores user and vectors in Supabase
```

### Face Verification Flow

```text
User opens Verify page
↓
Camera starts
↓
Browser generates live face vector
↓
Frontend sends vector to FastAPI backend
↓
Backend compares vector with Supabase stored vectors
↓
System returns verified or not verified result
```

---

## Backend API Endpoints

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "running",
  "message": "Face Attendance Backend is running"
}
```

### Register Face

```http
POST /register-face
```

Request body:

```json
{
  "full_name": "User Name",
  "vectors": [
    {
      "pose": "front",
      "vector": [0.01, 0.02, 0.03]
    }
  ]
}
```

### Verify Face

```http
POST /verify-face
```

Request body:

```json
{
  "vector": [0.01, 0.02, 0.03],
  "threshold": 0.65
}
```

---

## Supabase Database

The project uses two main tables:

### `registered_users`

Stores registered user information.

```text
id
full_name
created_at
```

### `face_vectors`

Stores 128-dimensional face vectors for each registered user.

```text
id
user_id
pose
descriptor
created_at
```

The `descriptor` column uses the pgvector `vector(128)` type.

---

## Local Development Setup

### Python Version

This project uses **Python 3.11** for the FastAPI backend.

### Create Conda Environment

```bash
conda create -n webbaseface python=3.11 -y
conda activate webbaseface
```

### Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file inside the `backend` folder.

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
ALLOWED_ORIGINS=*
```

Do not commit `.env` to GitHub. Use `.env.example` for reference.

### Run Backend Locally

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Test Backend Health

```text
http://127.0.0.1:8000/api/health
```

### Open Local Frontend Through FastAPI

```text
http://127.0.0.1:8000/frontend/index.html
http://127.0.0.1:8000/frontend/register.html
http://127.0.0.1:8000/frontend/verify.html
```

---

## VS Code Interpreter Setup

In VS Code:

```text
Ctrl + Shift + P
↓
Python: Select Interpreter
↓
Choose Python 3.11.x ('webbaseface': conda)
```

Then reload VS Code:

```text
Ctrl + Shift + P
↓
Developer: Reload Window
```

---

## Backend Environment Variables

Create:

```text
backend/.env
```

Use:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
ALLOWED_ORIGINS=*
```

For production, set:

```env
ALLOWED_ORIGINS=https://face-verification-system.netlify.app
```

Important: never commit the real `.env` file.

---

## Frontend Configuration

The frontend API URL is configured in:

```text
frontend/js/config.js
```

For live deployment, the backend URL is:

```javascript
const LIVE_BACKEND_URL = "https://web-face-attendance-system.onrender.com";
```

---

## Deployment

### Frontend

Frontend is deployed on Netlify.

```text
https://face-verification-system.netlify.app/
```

### Backend

Backend is deployed on Render.

```text
https://web-face-attendance-system.onrender.com
```

### Database

Database is hosted on Supabase.

---

## Security Notes

- Do not upload `.env` to GitHub.
- Do not expose the Supabase secret key in frontend JavaScript.
- Only the backend should use the Supabase secret key.
- Raw face images are not sent to the backend.
- Only 128-dimensional face vectors are stored.
- CORS should be restricted to the frontend domain in production.

---

## Future Improvements

- Add admin dashboard
- Add employee ID or user ID during registration
- Add attendance logs
- Add verification history
- Add delete user API
- Add duplicate user detection
- Add stronger liveness detection
- Add better security for production API access
- Add role-based dashboard for HR/admin users
- Improve face matching threshold based on real testing data

---

## Author

Developed by **Md. Rifat Hossain Chowdhury**.

Project focus: browser-based AI face registration and verification with low-cost deployment and privacy-friendly vector storage.
