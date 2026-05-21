import time
from collections import defaultdict, deque
from flask import request
from api.config import AppConfig


_request_tracker = defaultdict(deque)


def validate_request_limits():
    content_length = request.content_length or 0
    if content_length > AppConfig.MAX_JSON_BODY_BYTES:
        return {
            "blocked": True,
            "message": "Request body too large",
            "status_code": 413,
        }

    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    route_key = f"{client_ip}:{request.path}"
    now = time.time()
    window_start = now - AppConfig.RATE_LIMIT_WINDOW_SECONDS

    queue = _request_tracker[route_key]
    while queue and queue[0] < window_start:
        queue.popleft()

    if len(queue) >= AppConfig.RATE_LIMIT_MAX_REQUESTS:
        return {
            "blocked": True,
            "message": "Rate limit exceeded. Please retry shortly.",
            "status_code": 429,
        }

    queue.append(now)
    return {"blocked": False}
