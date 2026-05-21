from flask import jsonify


def ok(payload: dict | None = None, status_code: int = 200):
    body = {"status": "success"}
    if payload:
        body.update(payload)
    return jsonify(body), status_code


def fail(message: str, status_code: int = 400, errors: list[str] | None = None):
    body = {"status": "error", "message": message}
    if errors:
        body["errors"] = errors
    return jsonify(body), status_code
