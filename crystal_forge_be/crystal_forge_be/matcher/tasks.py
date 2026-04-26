import datetime
import logging

from celery import shared_task
from django.utils import timezone

from crystal_forge_be.parser.models import ResumeProfile

from .agent import analyze_jd
from .models import JdAnalysis

logger = logging.getLogger(__name__)

# Beat janitor cutoff: anything older than this in PENDING/RUNNING is dead.
# Sync execution shouldn't leave anything stuck, but a server crash mid-request
# could; the janitor still runs as a safety net.
STUCK_AFTER_SECONDS = 7 * 60


def _mark_failed(analysis: JdAnalysis, message: str) -> None:
    analysis.status = JdAnalysis.Status.FAILED
    analysis.error = message
    analysis.save(update_fields=["status", "error", "updated_at"])


def run_jd_analysis(analysis_id: int) -> None:
    try:
        analysis = JdAnalysis.objects.select_related(
            "batch__user__resume_profile",
        ).get(pk=analysis_id)
    except JdAnalysis.DoesNotExist:
        logger.warning("run_jd_analysis: analysis %s missing; dropping", analysis_id)
        return

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
    """Mark analyses stuck in PENDING/RUNNING past the cutoff as FAILED.

    With sync execution this only catches server crashes mid-request.
    """
    cutoff = timezone.now() - datetime.timedelta(seconds=STUCK_AFTER_SECONDS)
    count = JdAnalysis.objects.filter(
        status__in=[JdAnalysis.Status.PENDING, JdAnalysis.Status.RUNNING],
        updated_at__lt=cutoff,
    ).update(
        status=JdAnalysis.Status.FAILED,
        error="Server crashed mid-analysis or task exceeded the time limit.",
        updated_at=timezone.now(),
    )
    if count:
        logger.warning("requeue_stuck_jd_analyses: marked %s as FAILED", count)
    return count
