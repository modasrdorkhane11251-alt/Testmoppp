import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import admin, auth, catalog, commerce, internal, support
from app.core.config import get_settings

s = get_settings()
if s.sentry_dsn:
    sentry_sdk.init(dsn=s.sentry_dsn, traces_sample_rate=0.1, send_default_pii=False)

app = FastAPI(title="MODASR HUB API", version="1.0.0", docs_url="/docs" if s.app_env != "production" else None)
app.add_middleware(CORSMiddleware, allow_origins=s.cors_list, allow_credentials=True,
                   allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.update({"X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin",
                         "X-Frame-Options": "SAMEORIGIN", "Strict-Transport-Security": "max-age=31536000; includeSubDomains"})
    resp.headers.pop("server", None)
    return resp


for r in (auth.router, catalog.router, commerce.router, support.router, admin.router, internal.router):
    app.include_router(r)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/health")
async def health():
    return {"ok": True, "service": "MODASR HUB"}
