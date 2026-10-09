from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.core.config import settings
from app.services.booking_email import build_booking_confirmation_email, send_booking_confirmation


def make_booking(image_url):
    return SimpleNamespace(
        id=42,
        check_in=date(2026, 10, 6),
        check_out=date(2026, 10, 8),
        guests=2,
        nightly_price=Decimal("123.45"),
        cleaning_fee=Decimal("30.00"),
        service_fee=Decimal("29.63"),
        total_price=Decimal("306.53"),
        listing=SimpleNamespace(
            title='<img src=x onerror="alert(1)"> Cozy <suite>',
            city="Goa <script>",
            country="India",
            images=[SimpleNamespace(url=image_url)],
        ),
    )


def test_confirmation_email_has_both_parts_saved_details_and_escaped_html(monkeypatch):
    monkeypatch.setattr(settings, "frontend_base_url", "https://stayly.example/")
    monkeypatch.setattr(settings, "smtp_from_email", "bookings@stayly.example")
    message = build_booking_confirmation_email(
        make_booking("https://images.example/stay.jpg?width=1200&crop=1"),
        "guest@example.com",
    )

    html = message.get_body(preferencelist=("html",)).get_content()
    plain = message.get_body(preferencelist=("plain",)).get_content()
    assert message["To"] == "guest@example.com"
    assert message["Subject"] == "Your Stayly booking is confirmed"
    content_types = [part.get_content_type() for part in message.walk()]
    assert "text/plain" in content_types
    assert "text/html" in content_types
    assert "src=\"https://images.example/stay.jpg?width=1200&amp;crop=1\"" in html
    assert "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; Cozy &lt;suite&gt;" in html
    assert "Goa &lt;script&gt;" in html
    assert "Oct 6, 2026" in html and "Oct 8, 2026" in html
    assert ">2</strong> guests" in html and ">2</strong> nights" in html
    assert "$123.45 / night" in html
    assert "$30.00" in html and "$29.63" in html and "$306.53" in html
    assert "STY-000042" in html
    assert "https://stayly.example/trips" in html
    assert "No real payment was processed" in html
    assert "<script>" not in html
    assert "STY-000042" in plain and "$306.53" in plain


def test_confirmation_email_uses_fallback_for_unsafe_or_missing_images():
    message = build_booking_confirmation_email(make_booking("javascript:alert(1)"), "guest@example.com")
    html = message.get_body(preferencelist=("html",)).get_content()
    assert "A lovely Stayly home awaits" in html
    assert "javascript:alert(1)" not in html


def test_unconfigured_smtp_warns_without_attempting_delivery(monkeypatch, caplog):
    monkeypatch.setattr(settings, "smtp_host", None)
    monkeypatch.setattr(settings, "smtp_from_email", None)
    sent = send_booking_confirmation(make_booking("https://images.example/stay.jpg"), "guest@example.com")
    assert sent is False
    assert "SMTP is not configured" in caplog.text
    assert "guest@example.com" not in caplog.text
