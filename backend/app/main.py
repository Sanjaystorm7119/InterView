import logging
import time
import uuid

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api import auth, users, interviews, ai, resumes, job_descriptions, matching, email, notifications, analytics, payments
from app.config import get_settings
from app.utils.rate_limit import limiter

settings = get_settings()

# ── Structured logging ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("hireeva")

# ── Sentry ─────────────────────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
    logger.info("Sentry initialized")
else:
    logger.info("Sentry DSN not configured — error tracking disabled")

# ── App ─────────────────────────────────────────────────────────────────────────
app = FastAPI(title="HireEva API", version="1.0.0")

# Attach rate limiter
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait before trying again."},
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    logger.info(
        f"request_id={request_id} method={request.method} path={request.url.path} "
        f"status={response.status_code} duration_ms={duration_ms}"
    )
    response.headers["X-Request-ID"] = request_id
    return response


# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(ai.router)
app.include_router(resumes.router)
app.include_router(job_descriptions.router)
app.include_router(matching.router)
app.include_router(email.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(payments.router)


@app.get("/api/health")
def health_check():
    from app.database import engine
    try:
        with engine.connect():
            db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "HireEva API",
        "database": "connected" if db_ok else "unavailable",
    }
