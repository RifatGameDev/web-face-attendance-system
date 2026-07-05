# Local Development Setup

## 1. Create Conda Environment

```bash
conda create -n webbaseface python=3.11 -y
```

## 2. Activate Environment

```bash
conda activate webbaseface
```

## 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## 4. Create Environment File

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

## 5. Run Backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 6. Test Backend

```text
http://127.0.0.1:8000/api/health
```

## 7. Open Frontend Locally

```text
http://127.0.0.1:8000/frontend/index.html
```

## 8. VS Code Interpreter

```text
Ctrl + Shift + P
Python: Select Interpreter
Choose Python 3.11.x ('webbaseface': conda)
```
