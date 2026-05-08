import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health

API_SECRET_KEY = os.environ.get("API_SECRET_KEY", "")

app = FastAPI(title="LifeOrg API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
        return await call_next(request)
    key = request.headers.get("X-API-Key", "")
    if key != API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return await call_next(request)


app.include_router(health.router)
