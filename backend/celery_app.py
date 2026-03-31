import os
from celery import Celery

REDIS_URL = os.environ["REDIS_URL"]

celery_app = Celery(
    "joblens",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)
