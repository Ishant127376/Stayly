from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database.session import init_db
from app.routers.bookings import router as bookings_router
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.listings import router as listings_router
from app.routers.users import router as users_router
from app.routers.wishlist import router as wishlist_router

app = FastAPI(title="Airbnb Marketplace API", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=[settings.frontend_origin],
	allow_credentials=True,
	allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allow_headers=["Content-Type"],
)


@app.middleware("http")
async def enforce_api_origin(request: Request, call_next):
	if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
		if request.headers.get("origin") != settings.frontend_origin:
			return JSONResponse(status_code=403, content={"detail": "Request origin is not allowed."})
	return await call_next(request)

init_db()

app.include_router(health_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(listings_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(wishlist_router, prefix="/api")
