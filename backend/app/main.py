import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import health

API_SECRET_KEY = os.environ["API_SECRET_KEY"]

app = FastAPI(title="LifeOrg API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3030", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


EXEMPT_PATHS = ("/health", "/docs", "/openapi.json", "/redoc")
EXEMPT_PREFIXES = ("/api/auth/google",)


@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    path = request.url.path
    if path in EXEMPT_PATHS or any(path.startswith(p) for p in EXEMPT_PREFIXES):
        return await call_next(request)
    key = request.headers.get("X-API-Key", "")
    if key != API_SECRET_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid API key"})
    return await call_next(request)


app.include_router(health.router)

from app.routers import categories as categories_router
from app.routers import columns as columns_router
from app.routers import cards as cards_router
from app.routers import blocks as blocks_router
from app.routers import sessions as sessions_router
from app.routers import auth_google as auth_google_router
from app.routers import google_sync as google_sync_router

app.include_router(categories_router.router)
app.include_router(columns_router.router)
app.include_router(cards_router.router)
app.include_router(blocks_router.router)
app.include_router(sessions_router.router)
app.include_router(auth_google_router.router)
app.include_router(google_sync_router.router)
