import hashlib
import secrets
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.core.dependencies import SESSION_COOKIE_NAME, utc_now
from app.database.session import SessionLocal
from app.main import app
from app.models import AuthSession
from app.services import bookings as booking_service
from app.seed import seed_database


@pytest.fixture(autouse=True)
def seeded_database():
    seed_database()
    yield


@pytest.fixture
def client():
    with TestClient(app, headers={"Origin": settings.frontend_origin}) as test_client:
        raw_token = authenticate_as(test_client, 5)
        yield test_client


def authenticate_as(client, user_id):
    raw_token = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        db.add(AuthSession(
            user_id=user_id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=utc_now() + timedelta(days=1),
        ))
        db.commit()
    client.cookies.set(SESSION_COOKIE_NAME, raw_token)
    return raw_token


def listing_payload(title="New Coastal Home"):
    return {
        "title": title,
        "description": "A comfortable home with enough space for a relaxed stay.",
        "location": "North Goa",
        "city": "Goa",
        "country": "India",
        "property_type": "villa",
        "price_per_night": "250.00",
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": "2.0",
        "images": ["https://example.com/one.jpg"],
        "amenities": ["WiFi", "Pool"],
    }


def test_listing_search_filters_pagination_and_detail(client):
    response = client.get("/api/listings")
    assert response.status_code == 200
    assert response.json()["limit"] == 12
    assert response.json()["total"] == 15
    assert response.json()["pages"] == 2

    assert client.get("/api/listings?location=Goa").json()["total"] == 2
    assert client.get("/api/listings?property_type=villa").json()["total"] == 2
    assert client.get("/api/listings?min_price=200&max_price=230").json()["total"] == 2
    assert client.get("/api/listings?guests=8").json()["total"] == 1
    assert client.get("/api/listings?minimum_rating=4.9").json()["total"] == 4
    assert client.get("/api/listings?amenities=WiFi,Pool").json()["total"] == 2
    assert client.get("/api/listings?page=2&limit=5").json()["items"]

    detail = client.get("/api/listings/1")
    assert detail.status_code == 200
    assert len(detail.json()["images"]) == 3
    assert detail.json()["host"]["name"] == "Ananya Rao"
    assert client.get("/api/listings/999").status_code == 404


def test_availability_and_invalid_search_dates(client):
    availability = client.get("/api/listings/1/availability")
    assert availability.status_code == 200
    assert availability.json()["blocked_ranges"] == [{"check_in": "2026-10-16", "check_out": "2026-10-19"}]
    assert client.get("/api/listings?check_in=2026-10-20").status_code == 400
    assert client.get("/api/listings?check_in=2026-10-25&check_out=2026-10-20").status_code == 400
    assert client.get("/api/listings?check_in=2026-10-17&check_out=2026-10-18").json()["total"] == 14


def test_booking_success_overlap_cancelled_and_my_trips(client):
    successful = client.post("/api/bookings", json={
        "listing_id": 3,
        "check_in": "2026-10-26",
        "check_out": "2026-10-28",
        "guests": 2,
    })
    assert successful.status_code == 201
    booking = successful.json()
    assert booking["guest_id"] == 5
    assert booking["nightly_price"] == "76.00"
    assert booking["total_price"] == "195.24"

    overlap = client.post("/api/bookings", json={
        "listing_id": 1,
        "check_in": "2026-10-17",
        "check_out": "2026-10-18",
        "guests": 2,
    })
    assert overlap.status_code == 409

    cancelled_range = client.post("/api/bookings", json={
        "listing_id": 3,
        "check_in": "2026-10-22",
        "check_out": "2026-10-25",
        "guests": 2,
    })
    assert cancelled_range.status_code == 201
    assert len(client.get("/api/bookings/my-trips").json()) == 4

    assert client.post("/api/bookings", json={
        "listing_id": 1,
        "check_in": "2026-10-20",
        "check_out": "2026-10-20",
        "guests": 1,
    }).status_code == 400
    assert client.post("/api/bookings", json={
        "listing_id": 1,
        "check_in": "2026-10-20",
        "check_out": "2026-10-21",
        "guests": 7,
    }).status_code == 400


def test_new_confirmed_booking_sends_one_confirmation_from_saved_data(monkeypatch, client):
    sent = []

    def mock_sender(booking, recipient_email):
        with SessionLocal() as db:
            persisted = db.get(booking.__class__, booking.id)
            assert persisted is not None
            assert persisted.status == "confirmed"
            assert persisted.total_price == booking.total_price
        sent.append((booking, recipient_email))

    monkeypatch.setattr(booking_service, "send_booking_confirmation", mock_sender)
    response = client.post("/api/bookings", json={
        "listing_id": 3,
        "check_in": "2026-10-26",
        "check_out": "2026-10-28",
        "guests": 2,
    })
    assert response.status_code == 201
    assert len(sent) == 1
    saved_booking, recipient = sent[0]
    assert recipient == "rohan.guest@example.com"
    assert saved_booking.status == "confirmed"
    assert saved_booking.listing.title == "Pink City Courtyard Home"
    assert str(saved_booking.nightly_price) == "76.00"
    assert str(saved_booking.cleaning_fee) == "25.00"
    assert str(saved_booking.service_fee) == "18.24"
    assert str(saved_booking.total_price) == "195.24"

    booking_id = response.json()["id"]
    assert client.get(f"/api/bookings/{booking_id}").status_code == 200
    assert client.delete(f"/api/bookings/{booking_id}").status_code == 200
    assert client.get(f"/api/bookings/{booking_id}").json()["status"] == "cancelled"
    assert len(sent) == 1


def test_email_failure_does_not_fail_or_duplicate_booking(monkeypatch, client, caplog):
    calls = []

    def failing_sender(booking, recipient_email):
        calls.append(booking.id)
        raise RuntimeError("SMTP delivery failed")

    monkeypatch.setattr(booking_service, "send_booking_confirmation", failing_sender)
    payload = {"listing_id": 3, "check_in": "2026-10-26", "check_out": "2026-10-28", "guests": 2}
    response = client.post("/api/bookings", json=payload)
    assert response.status_code == 201
    assert client.get(f"/api/bookings/{response.json()['id']}").json()["status"] == "confirmed"
    assert client.post("/api/bookings", json=payload).status_code == 409
    assert len(calls) == 1
    assert "delivery failed" in caplog.text
    assert "SMTP delivery failed" not in caplog.text


def test_rejected_booking_does_not_send_email(monkeypatch, client):
    calls = []
    monkeypatch.setattr(booking_service, "send_booking_confirmation", lambda *args: calls.append(args))
    overlapping = client.post("/api/bookings", json={
        "listing_id": 1,
        "check_in": "2026-10-17",
        "check_out": "2026-10-18",
        "guests": 2,
    })
    missing_listing = client.post("/api/bookings", json={
        "listing_id": 999,
        "check_in": "2026-10-26",
        "check_out": "2026-10-28",
        "guests": 2,
    })
    assert overlapping.status_code == 409
    assert missing_listing.status_code == 404
    assert calls == []


def test_host_authorization_and_listing_crud(client):
    authenticate_as(client, 6)
    assert client.post("/api/listings", json=listing_payload()).status_code == 403

    authenticate_as(client, 1)
    created = client.post("/api/listings", json=listing_payload())
    assert created.status_code == 201
    listing_id = created.json()["id"]
    assert created.json()["host_id"] == 1

    updated = client.put(f"/api/listings/{listing_id}", json={"title": "Updated Coastal Home"})
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated Coastal Home"
    assert client.get(f"/api/listings/{listing_id}/bookings").status_code == 200

    authenticate_as(client, 2)
    assert client.put(f"/api/listings/{listing_id}", json={"title": "Nope"}).status_code == 403
    assert client.delete(f"/api/listings/{listing_id}").status_code == 403

    authenticate_as(client, 1)
    assert client.delete(f"/api/listings/{listing_id}").status_code == 204
    assert client.delete("/api/listings/1").status_code == 409


def test_reviews_wishlist_and_current_user(client):
    current_user = client.get("/api/users/me")
    assert current_user.status_code == 200
    assert current_user.json()["id"] == 5

    reviews = client.get("/api/listings/1/reviews")
    assert reviews.status_code == 200
    assert reviews.json()[0]["user"]["name"]

    wishlist = client.post("/api/wishlist/2")
    assert wishlist.status_code == 201
    assert client.post("/api/wishlist/2").status_code == 409
    assert len(client.get("/api/wishlist").json()) == 3
    assert client.delete("/api/wishlist/2").status_code == 204
    assert client.delete("/api/wishlist/2").status_code == 404


def test_signup_login_session_logout_and_legacy_user(client):
    client.cookies.clear()
    assert client.get("/api/users/me").status_code == 401

    signup = client.post("/api/auth/signup", json={"name": "New Guest", "email": "New.User@example.com", "password": "correct horse battery 7"})
    assert signup.status_code == 201
    assert signup.json()["role"] == "guest"
    assert client.get("/api/users/me").json()["id"] == signup.json()["id"]
    raw_token = client.cookies.get(SESSION_COOKIE_NAME)
    assert raw_token
    cookie_header = signup.headers["set-cookie"].lower()
    assert "httponly" in cookie_header
    assert "samesite=lax" in cookie_header
    assert "max-age=604800" in cookie_header
    assert "secure" not in cookie_header
    with SessionLocal() as db:
        stored_session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()))
        assert stored_session is not None
        assert stored_session.token_hash != raw_token
        session_id = stored_session.id
    assert client.post("/api/auth/signup", json={"name": "Duplicate", "email": "new.user@EXAMPLE.com", "password": "correct horse battery 8"}).status_code == 409
    assert client.post("/api/auth/signup", json={"name": "Bad role", "email": "role@example.com", "password": "correct horse battery 8", "role": "host"}).status_code == 422

    client.cookies.clear()
    invalid = client.post("/api/auth/login", json={"email": "new.user@example.com", "password": "wrong password"})
    assert invalid.status_code == 401
    login = client.post("/api/auth/login", json={"email": "NEW.USER@example.com", "password": "correct horse battery 7"})
    assert login.status_code == 200
    assert client.get("/api/users/me").json()["id"] == signup.json()["id"]
    login_token = client.cookies.get(SESSION_COOKIE_NAME)
    with SessionLocal() as db:
        session_id = db.scalar(select(AuthSession.id).where(AuthSession.token_hash == hashlib.sha256(login_token.encode()).hexdigest()))
    assert client.post("/api/auth/logout").status_code == 204
    with SessionLocal() as db:
        assert db.get(AuthSession, session_id).revoked_at is not None
    assert client.get("/api/users/me").status_code == 401


def test_session_cookie_secure_setting_is_honored(monkeypatch, client):
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    monkeypatch.setattr(settings, "session_cookie_samesite", "none")
    response = client.post("/api/auth/signup", json={"name": "Secure Guest", "email": "secure@example.com", "password": "correct horse battery 7"})
    assert response.status_code == 201
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "secure" in cookie
    assert "samesite=none" in cookie
    logout = client.post("/api/auth/logout")
    deleted_cookie = logout.headers["set-cookie"].lower()
    assert "secure" in deleted_cookie
    assert "samesite=none" in deleted_cookie


def test_session_authentication_and_origin_protection(client):
    raw = authenticate_as(client, 5)
    allowed_preflight = client.options("/api/auth/login", headers={
        "Origin": settings.frontend_origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert allowed_preflight.status_code == 200
    assert allowed_preflight.headers["access-control-allow-origin"] == settings.frontend_origin
    assert allowed_preflight.headers["access-control-allow-credentials"] == "true"
    rejected_preflight = client.options("/api/auth/login", headers={
        "Origin": "https://attacker.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert rejected_preflight.headers.get("access-control-allow-origin") != "https://attacker.example"
    with TestClient(app) as other_client:
        other_client.cookies.set(SESSION_COOKIE_NAME, raw)
        assert other_client.get("/api/users/me").status_code == 200
    assert client.post("/api/wishlist/2", headers={"Origin": "https://attacker.example"}).status_code == 403
    assert client.post("/api/bookings", json={"listing_id": 3, "check_in": "2026-10-26", "check_out": "2026-10-28", "guests": 2}, headers={"Origin": ""}).status_code == 403
    assert client.get("/api/listings").status_code == 200


def test_booking_wishlist_and_review_ownership(client):
    authenticate_as(client, 6)
    assert client.get("/api/bookings/1").status_code == 403
    assert client.delete("/api/bookings/1").status_code == 403
    guest_wishlist = client.get("/api/wishlist").json()
    assert guest_wishlist
    assert all(item["user_id"] == 6 for item in guest_wishlist)
    assert client.post("/api/listings/1/reviews", json={"rating": 5, "comment": "Not my stay"}).status_code == 403
