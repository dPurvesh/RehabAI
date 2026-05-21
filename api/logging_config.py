import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app) -> None:
    log_level = logging.DEBUG if app.debug else logging.INFO
    app.logger.setLevel(log_level)

    logs_dir = Path(__file__).resolve().parent.parent / "logs"
    logs_dir.mkdir(exist_ok=True)

    file_handler = RotatingFileHandler(
        logs_dir / "app.log",
        maxBytes=2 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )

    # Avoid duplicate handlers when app is initialized multiple times.
    if not any(isinstance(h, RotatingFileHandler) for h in app.logger.handlers):
        app.logger.addHandler(file_handler)
