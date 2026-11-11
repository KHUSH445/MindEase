import os
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import Request, HTTPException, Depends, status
from bson import ObjectId
import hashlib
import hmac

try:
    import bcrypt
except ImportError:
    bcrypt = None

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    pwd_context = None

from database.mongodb import db_manager

# Secret Configuration
_DEFAULT_JWT_SECRET = "mindease_secure_jwt_secret_key_2026_production_safe_default"
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or _DEFAULT_JWT_SECRET
if not os.environ.get("JWT_SECRET_KEY"):
    print("WARNING: JWT_SECRET_KEY is not set in backend/.env. Using default key for development.")
elif len(JWT_SECRET_KEY) < 32:
    print(f"SECURITY WARNING: JWT_SECRET_KEY is only {len(JWT_SECRET_KEY)} characters. RFC 7518 requires at least 32 characters (256 bits) to prevent brute-force cracking.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    """Hash plaintext password securely using bcrypt or cryptographically salted PBKDF2."""
    if bcrypt:
        try:
            return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
        except Exception:
            pass
    if pwd_context:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    # Pure Python PBKDF2-SHA256 fallback with random 16-byte cryptographic salt
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"pbkdf2:{salt.hex()}:{derived.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against stored hash."""
    if not hashed_password:
        return False
    # Check bcrypt hashes ($2b$, $2a$, $2y$)
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        if bcrypt:
            try:
                return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
            except Exception:
                pass
        if pwd_context:
            try:
                return pwd_context.verify(plain_password, hashed_password)
            except Exception:
                pass
    # Check PBKDF2 hashes
    if hashed_password.startswith("pbkdf2:"):
        parts = hashed_password.split(":")
        if len(parts) == 3:
            try:
                salt = bytes.fromhex(parts[1])
                expected = parts[2]
                derived = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
                return hmac.compare_digest(derived.hex(), expected)
            except Exception:
                return False
        elif len(parts) == 2:
            # Legacy static salt backward compatibility
            salt = os.environ.get("JWT_SECRET_KEY", "mindease_salt").encode('utf-8')
            derived = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
            return hmac.compare_digest("pbkdf2:" + derived.hex(), hashed_password)
    return False


def create_access_token(user_id: str, token_version: int = 1, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token containing the user's MongoDB _id and token_version."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": str(user_id),
        "token_version": token_version,
        "exp": expire,
        "iat": now
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a signed JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def extract_token_from_request(request: Request) -> Optional[str]:
    """Extract JWT token from HttpOnly cookie or Authorization header."""
    # 1. HttpOnly Cookie
    token = request.cookies.get("mindease_token")
    if token:
        return token
    # 2. Authorization Header (Bearer <token>)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def get_current_user(request: Request) -> Dict[str, Any]:
    """FastAPI Dependency: Extract authenticated user from request. Raises HTTP 401 if unauthenticated/revoked."""
    token = extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = payload["sub"]
    if not ObjectId.is_valid(user_id_str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    users_col = db_manager.users
    if not db_manager.is_connected() or users_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    
    user = users_col.find_one({"_id": ObjectId(user_id_str)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Token Revocation Check: Compare JWT token_version with DB token_version
    jwt_token_version = payload.get("token_version")
    db_token_version = user.get("token_version", 1)
    
    if jwt_token_version is None or jwt_token_version != db_token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or logged out",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_optional_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """FastAPI Dependency: Extract authenticated user if available, otherwise return None."""
    try:
        return get_current_user(request)
    except HTTPException:
        return None
