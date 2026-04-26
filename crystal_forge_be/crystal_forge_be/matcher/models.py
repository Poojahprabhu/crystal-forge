from django.conf import settings
from django.db import models


class JdAnalysisBatch(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="jd_batches",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"JdAnalysisBatch<{self.pk}>"

    @property
    def status(self) -> str:
        statuses = list(self.analyses.values_list("status", flat=True))
        if not statuses:
            return JdAnalysis.Status.PENDING
        if any(s in (JdAnalysis.Status.PENDING, JdAnalysis.Status.RUNNING) for s in statuses):
            return JdAnalysis.Status.RUNNING
        if all(s == JdAnalysis.Status.FAILED for s in statuses):
            return JdAnalysis.Status.FAILED
        return JdAnalysis.Status.DONE


class JdAnalysis(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    batch = models.ForeignKey(
        JdAnalysisBatch,
        on_delete=models.CASCADE,
        related_name="analyses",
    )
    jd_text = models.TextField()
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    matched_percentage = models.PositiveSmallIntegerField(null=True, blank=True)
    skills_matched = models.JSONField(default=list, blank=True)
    skills_needed_addons = models.JSONField(default=list, blank=True)
    skills_needed_new = models.JSONField(default=list, blank=True)
    feedback = models.TextField(blank=True, default="")
    resources = models.JSONField(default=dict, blank=True)
    study_plan = models.JSONField(default=list, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"JdAnalysis<{self.pk} status={self.status}>"
