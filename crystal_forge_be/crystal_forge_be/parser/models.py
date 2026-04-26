from django.conf import settings
from django.db import models


class ResumeProfile(models.Model):
    """Latest resume-analysis snapshot for a user.

    Updated each time the user re-uploads a resume to /api/parser/analyze/.
    The matcher app reads `claimed_skills` and `evidence` from here.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resume_profile",
    )
    sufficient = models.BooleanField(default=False)
    summary = models.TextField(blank=True, default="")
    claimed_skills = models.JSONField(default=list, blank=True)
    evidence = models.JSONField(default=list, blank=True)
    weak_skills = models.JSONField(default=list, blank=True)
    questionnaire = models.JSONField(default=list, blank=True)
    qa = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"ResumeProfile<{self.user_id}>"
