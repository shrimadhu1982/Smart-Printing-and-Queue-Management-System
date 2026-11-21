import hmac
import hashlib
import json
import base64
import time
from functools import wraps
from flask import request, jsonify
from config import Config

def _base64_url_encode(data_bytes):
    return base64.urlsafe_b64encode(data_bytes).decode('utf-8').rstrip('=')

def _base64_url_decode(str_data):
    padding = '=' * (4 - len(str_data) % 4) if len(str_data) % 4 != 0 else ''
    return base64.urlsafe_b64decode(str_data + padding)

def generate_token(payload, expires_in_seconds=86400): # 24 hours
    payload_copy = payload.copy()
    payload_copy['exp'] = int(time.time()) + expires_in_seconds
    header = {"alg": "HS256", "typ": "JWT"}
    
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_json = json.dumps(payload_copy, separators=(',', ':')).encode('utf-8')

    part1 = _base64_url_encode(header_json)
    part2 = _base64_url_encode(payload_json)

    signature = hmac.new(
        Config.SECRET_KEY.encode('utf-8'),
        f"{part1}.{part2}".encode('utf-8'),
        hashlib.sha256
    ).digest()

    part3 = _base64_url_encode(signature)
    return f"{part1}.{part2}.{part3}"

def decode_token(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        part1, part2, part3 = parts
        expected_sig = hmac.new(
            Config.SECRET_KEY.encode('utf-8'),
            f"{part1}.{part2}".encode('utf-8'),
            hashlib.sha256
        ).digest()

        if not hmac.compare_digest(_base64_url_encode(expected_sig), part3):
            return None

        payload_bytes = _base64_url_decode(part2)
        payload = json.loads(payload_bytes.decode('utf-8'))

        if payload.get('exp', 0) < time.time():
            return None # Expired

        return payload
    except Exception:
        return None

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    return decode_token(token)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "Authentication required. Invalid or expired token."}), 401
        return f(current_user=user, *args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"success": False, "message": "Authentication required."}), 401
            if user.get('role') not in allowed_roles:
                return jsonify({"success": False, "message": "Access forbidden: insufficient role permissions."}), 403
            return f(current_user=user, *args, **kwargs)
        return decorated
    return decorator
