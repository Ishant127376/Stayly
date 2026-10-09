"""Set or reset credentials for an existing account from a trusted local shell."""

import argparse
from getpass import getpass

from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models import User, UserCredential


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user-id", type=int, required=True, help="Existing user ID to credential")
    args = parser.parse_args()

    password = getpass("New password (at least 12 characters): ")
    confirmation = getpass("Confirm password: ")
    if len(password) < 12 or len(password) > 128:
        parser.error("Password must contain between 12 and 128 characters.")
    if password != confirmation:
        parser.error("Passwords do not match.")

    db: Session = SessionLocal()
    try:
        user = db.get(User, args.user_id)
        if user is None:
            parser.error(f"User ID {args.user_id} does not exist.")
        credential = db.get(UserCredential, user.id)
        if credential is None:
            credential = UserCredential(user_id=user.id, password_hash="")
            db.add(credential)
        credential.password_hash = PasswordHash.recommended().hash(password)
        db.commit()
        print(f"Password credentials saved for user {user.id} ({user.email}).")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
