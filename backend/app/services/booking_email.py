"""Build and send guest booking confirmation emails over configurable SMTP."""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from html import escape
from urllib.parse import urlsplit

from app.core.config import settings
from app.models import Booking

logger = logging.getLogger(__name__)


def _usable_image_url(booking: Booking) -> str | None:
    for image in booking.listing.images:
        candidate = image.url.strip()
        try:
            parsed = urlsplit(candidate)
        except ValueError:
            continue
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return candidate
    return None


def _format_date(value) -> str:
    return value.strftime("%b %d, %Y").replace(" 0", " ")


def build_booking_confirmation_email(booking: Booking, recipient_email: str) -> EmailMessage:
    listing = booking.listing
    nights = (booking.check_out - booking.check_in).days
    frontend_url = settings.frontend_base_url.rstrip("/")
    trips_url = escape(f"{frontend_url}/trips", quote=True)
    image_url = _usable_image_url(booking)
    image_content = (
        f'<img src="{escape(image_url, quote=True)}" alt="{escape(listing.title, quote=True)}" '
        'style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:14px 14px 0 0;">'
        if image_url
        else '<div style="padding:42px 20px;text-align:center;background:#fce9e6;color:#9f3e39;'
             'font:700 20px Arial,sans-serif;">A lovely Stayly home awaits</div>'
    )

    title = escape(listing.title, quote=True)
    city = escape(listing.city, quote=True)
    country = escape(listing.country, quote=True)
    check_in = _format_date(booking.check_in)
    check_out = _format_date(booking.check_out)
    reference = f"STY-{booking.id:06d}"
    nightly_price = f"${booking.nightly_price:,.2f}"
    cleaning_fee = f"${booking.cleaning_fee:,.2f}"
    service_fee = f"${booking.service_fee:,.2f}"
    total_price = f"${booking.total_price:,.2f}"

    message = EmailMessage()
    message["Subject"] = "Your Stayly booking is confirmed"
    message["From"] = f"Stayly <{settings.smtp_from_email or 'bookings@example.com'}>"
    message["To"] = recipient_email
    message.set_content(
        "Your Stayly booking is confirmed.\n\n"
        f"{listing.title} — {listing.city}, {listing.country}\n"
        f"Check-in: {booking.check_in.isoformat()}\n"
        f"Check-out: {booking.check_out.isoformat()}\n"
        f"Guests: {booking.guests}\n"
        f"Nights: {nights}\n"
        f"Nightly price: {nightly_price}\n"
        f"Cleaning fee: {cleaning_fee}\n"
        f"Service fee: {service_fee}\n"
        f"Total: {total_price}\n"
        f"Confirmation reference: {reference}\n\n"
        "Payment is simulated for this Stayly booking. No real payment was processed.\n"
        f"View your trips: {frontend_url}/trips\n"
    )
    message.add_alternative(
        f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ef;color:#252525;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f5f3ef;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:22px 28px;background:#e8564f;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-1px;">Stayly</td></tr>
        <tr><td>{image_content}</td></tr>
        <tr><td style="padding:28px 30px 10px;">
          <p style="margin:0 0 8px;color:#c8433e;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">You're all set</p>
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.2;">Your stay is confirmed</h1>
          <p style="margin:0;color:#717171;font-size:15px;line-height:1.5;">{title}<br>{city}, {country}</p>
        </td></tr>
        <tr><td style="padding:18px 30px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#faf8f6;border-radius:12px;">
            <tr><td style="padding:16px 18px;border-bottom:1px solid #e8e6e2;"><span style="color:#717171;font-size:12px;">CHECK-IN</span><br><strong style="display:inline-block;padding-top:5px;font-size:14px;">{check_in}</strong></td><td style="padding:16px 18px;border-bottom:1px solid #e8e6e2;"><span style="color:#717171;font-size:12px;">CHECK-OUT</span><br><strong style="display:inline-block;padding-top:5px;font-size:14px;">{check_out}</strong></td></tr>
            <tr><td colspan="2" style="padding:14px 18px;font-size:14px;"><strong>{booking.guests}</strong> {"guest" if booking.guests == 1 else "guests"} <span style="color:#717171;">·</span> <strong>{nights}</strong> {"night" if nights == 1 else "nights"}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:4px 30px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#717171;">Nightly price</td><td align="right" style="padding:8px 0;">{nightly_price} / night · {nights} {"night" if nights == 1 else "nights"}</td></tr>
            <tr><td style="padding:8px 0;color:#717171;">Cleaning fee</td><td align="right" style="padding:8px 0;">{cleaning_fee}</td></tr>
            <tr><td style="padding:8px 0;color:#717171;">Service fee</td><td align="right" style="padding:8px 0;">{service_fee}</td></tr>
            <tr><td style="padding:14px 0;border-top:1px solid #e8e6e2;font-size:16px;font-weight:700;">Total</td><td align="right" style="padding:14px 0;border-top:1px solid #e8e6e2;font-size:16px;font-weight:700;">{total_price}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 30px 22px;"><p style="margin:0;color:#717171;font-size:12px;line-height:1.5;">Confirmation reference: <strong style="color:#252525;">{reference}</strong></p></td></tr>
        <tr><td align="center" style="padding:0 30px 26px;"><a href="{trips_url}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#252525;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">View your trips</a></td></tr>
        <tr><td style="padding:17px 28px;background:#fff5e9;color:#79592f;font-size:12px;line-height:1.5;">Payment is simulated for this Stayly booking. No real payment was processed.</td></tr>
        <tr><td style="padding:20px 28px;color:#8a8782;text-align:center;font-size:11px;">Thanks for choosing Stayly · A better place to land</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>""",
        subtype="html",
    )
    return message


def send_booking_confirmation(booking: Booking, recipient_email: str) -> bool:
    smtp_host = (settings.smtp_host or "").strip()
    smtp_username = (settings.smtp_username or "").strip()
    smtp_password = settings.smtp_password.get_secret_value() if settings.smtp_password else ""
    if not smtp_host or not (settings.smtp_from_email or "").strip():
        logger.warning("SMTP is not configured; booking confirmation email was skipped for booking_id=%s.", booking.id)
        return False
    if bool(smtp_username) != bool(smtp_password):
        logger.warning("SMTP authentication is incomplete; booking confirmation email was skipped for booking_id=%s.", booking.id)
        return False

    message = build_booking_confirmation_email(booking, recipient_email)
    if settings.smtp_use_ssl:
        client_context = smtplib.SMTP_SSL(
            smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
            context=ssl.create_default_context(),
        )
    else:
        client_context = smtplib.SMTP(smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds)

    with client_context as smtp:
        if not settings.smtp_use_ssl and settings.smtp_use_tls:
            smtp.starttls(context=ssl.create_default_context())
        if smtp_username and smtp_password:
            smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)
    return True
