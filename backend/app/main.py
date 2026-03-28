from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, users, interviews, ai, resumes, job_descriptions, matching, email
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="HireEva API", version="1.0.0")

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(ai.router)
app.include_router(resumes.router)
app.include_router(job_descriptions.router)
app.include_router(matching.router)
app.include_router(email.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "HireEva API"}
