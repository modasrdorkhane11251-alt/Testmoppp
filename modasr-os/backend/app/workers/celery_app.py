from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

celery = Celery("modasr", broker=get_settings().redis_url, backend=get_settings().redis_url, include=["app.workers.tasks"])
celery.conf.update(timezone="Asia/Tehran", task_acks_late=True, worker_prefetch_multiplier=1, task_time_limit=120)
celery.conf.beat_schedule = {
    "rates":            {"task": "app.workers.tasks.refresh_rates", "schedule": 30.0},
    "reprice":          {"task": "app.workers.tasks.reprice_all", "schedule": 120.0},
    "suppliers":        {"task": "app.workers.tasks.sync_suppliers", "schedule": 600.0},
    "outbox":           {"task": "app.workers.tasks.deliver_events", "schedule": 10.0},
    "scheduled-posts":  {"task": "app.workers.tasks.publish_due_posts", "schedule": 60.0},
    "abandoned-carts":  {"task": "app.workers.tasks.recover_carts", "schedule": crontab(minute="*/30")},
    "crm-segments":     {"task": "app.workers.tasks.segment_customers", "schedule": crontab(hour=4, minute=0)},
    "daily-report":     {"task": "app.workers.tasks.daily_report", "schedule": crontab(hour=21, minute=0)},
    "weekly-report":    {"task": "app.workers.tasks.periodic_report", "schedule": crontab(day_of_week=5, hour=20, minute=0), "args": ("week",)},
    "monthly-report":   {"task": "app.workers.tasks.periodic_report", "schedule": crontab(day_of_month=1, hour=9, minute=0), "args": ("month",)},
}
