import datetime
import logging

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.utils import timezone

from crystal_forge_be.parser.models import ResumeProfile

from .agent import analyze_jd
from .models import JdAnalysis

logger = logging.getLogger(__name__)

# Soft limit must leave room for the task to mark itself FAILED before the
# hard limit kills the worker process. analyze_jd is LLM + Tavily heavy.
ANALYZE_HARD_LIMIT = 6 * 60
ANALYZE_SOFT_LIMIT = ANALYZE_HARD_LIMIT - 30
# Beat janitor cutoff: anything older than this in PENDING/RUNNING is dead.
STUCK_AFTER_SECONDS = ANALYZE_HARD_LIMIT + 60


def _mark_failed(analysis: JdAnalysis, message: str) -> None:
    analysis.status = JdAnalysis.Status.FAILED
    analysis.error = message
    analysis.save(update_fields=["status", "error", "updated_at"])


@shared_task(
    name="matcher.analyze_jd",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    soft_time_limit=ANALYZE_SOFT_LIMIT,
    time_limit=ANALYZE_HARD_LIMIT,
)
def analyze_jd_task(self, analysis_id: int) -> None:
    try:
        analysis = JdAnalysis.objects.select_related(
            "batch__user__resume_profile",
        ).get(pk=analysis_id)
    except JdAnalysis.DoesNotExist:
        logger.warning("analyze_jd_task: analysis %s missing; dropping", analysis_id)
        return

    # Idempotent: a redelivered message after a successful run must not clobber.
    if analysis.status == JdAnalysis.Status.DONE:
        return

    analysis.status = JdAnalysis.Status.RUNNING
    analysis.error = ""
    analysis.save(update_fields=["status", "error", "updated_at"])

    try:
        profile = analysis.batch.user.resume_profile
    except ResumeProfile.DoesNotExist:
        _mark_failed(analysis, "Resume profile no longer exists for this user.")
        return

    try:
        result = analyze_jd(
            jd_text=analysis.jd_text,
            user_skills=profile.claimed_skills or [],
            evidence=profile.evidence or [],
            qa=profile.qa or [],
        )
    except SoftTimeLimitExceeded:
        logger.warning("analyze_jd_task: %s exceeded soft time limit", analysis_id)
        _mark_failed(analysis, "Analysis exceeded the time limit.")
        return
    except Exception as exc:  # noqa: BLE001
        logger.exception("JD analysis %s failed", analysis_id)
        _mark_failed(analysis, str(exc) or exc.__class__.__name__)
        return

    analysis.matched_percentage = result["matched_percentage"]
    analysis.skills_matched = result["skills_matched"]
    analysis.skills_needed_addons = result["skills_needed_addons"]
    analysis.skills_needed_new = result["skills_needed_new"]
    analysis.feedback = result["feedback"]
    analysis.resources = result["resources"]
    analysis.study_plan = result["study_plan"]
    analysis.status = JdAnalysis.Status.DONE
    analysis.error = ""
    analysis.save(
        update_fields=[
            "matched_percentage",
            "skills_matched",
            "skills_needed_addons",
            "skills_needed_new",
            "feedback",
            "resources",
            "study_plan",
            "status",
            "error",
            "updated_at",
        ],
    )


@shared_task(name="matcher.requeue_stuck_jd_analyses")
def requeue_stuck_jd_analyses() -> int:
    """Mark analyses stuck in PENDING/RUNNING past the hard time-limit as FAILED.

    Catches the rare case where a worker is SIGKILLed before its except
    block runs (hard time-limit, OOM-killer, container eviction).
    """
    cutoff = timezone.now() - datetime.timedelta(seconds=STUCK_AFTER_SECONDS)
    count = JdAnalysis.objects.filter(
        status__in=[JdAnalysis.Status.PENDING, JdAnalysis.Status.RUNNING],
        updated_at__lt=cutoff,
    ).update(
        status=JdAnalysis.Status.FAILED,
        error="Worker died or task exceeded the hard time limit.",
        updated_at=timezone.now(),
    )
    if count:
        logger.warning("requeue_stuck_jd_analyses: marked %s as FAILED", count)
    return count
