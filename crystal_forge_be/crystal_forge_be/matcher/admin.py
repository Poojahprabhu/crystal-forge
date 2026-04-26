from django.contrib import admin

from .models import JdAnalysis
from .models import JdAnalysisBatch


class JdAnalysisInline(admin.TabularInline):
    model = JdAnalysis
    extra = 0
    readonly_fields = (
        "status",
        "matched_percentage",
        "skills_matched",
        "skills_needed_addons",
        "skills_needed_new",
        "feedback",
        "error",
        "created_at",
        "updated_at",
    )


@admin.register(JdAnalysisBatch)
class JdAnalysisBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "created_at")
    readonly_fields = ("created_at", "updated_at")
    inlines = [JdAnalysisInline]


@admin.register(JdAnalysis)
class JdAnalysisAdmin(admin.ModelAdmin):
    list_display = ("id", "batch", "status", "matched_percentage", "updated_at")
    list_filter = ("status",)
    readonly_fields = ("created_at", "updated_at")
