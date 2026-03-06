import os
import logging
from loguru import logger


class InterceptHandler(logging.Handler):
    """Redirect stdlib logging to loguru so uvicorn logs also hit the JSON sink."""
    def emit(self, record):
        level = logger.level(record.levelname).name if record.levelname in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL") else record.levelno
        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())


def setup_json_logging():
    log_dir = "/app/logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "sme.jsonl")

    logger.add(log_file, serialize=True, level="INFO")

    # Intercept uvicorn's stdlib loggers into loguru
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uv_logger = logging.getLogger(name)
        uv_logger.handlers = [InterceptHandler()]
