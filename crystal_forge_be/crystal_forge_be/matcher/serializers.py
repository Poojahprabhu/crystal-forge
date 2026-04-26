from rest_framework import serializers

from .models import JdAnalysis
from .models import JdAnalysisBatch

MAX_JDS_PER_BATCH = 20
MAX_JD_LENGTH = 50_000


class JdAnalysisCreateSerializer(serializers.Serializer):
    jds = serializers.ListField(
        child=serializers.CharField(
            allow_blank=False,
            trim_whitespace=True,
            max_length=MAX_JD_LENGTH,
        ),
        min_length=1,
        max_length=MAX_JDS_PER_BATCH,
    )


class JdAnalysisSerializer(serializers.ModelSerializer):
    skills_needed = serializers.SerializerMethodField()
    study_plan = serializers.SerializerMethodField()

    class Meta:
        model = JdAnalysis
        fields = [
            "id",
            "status",
            "matched_percentage",
            "skills_matched",
            "skills_needed",
            "feedback",
            "resources",
            "study_plan",
            "error",
        ]

    def get_skills_needed(self, obj: JdAnalysis):
        return {
            "addons": obj.skills_needed_addons,
            "new": obj.skills_needed_new,
        }

    def get_study_plan(self, obj: JdAnalysis):
        """Enrich each plan step's resource URLs into full {title, url, snippet}.

        Joins against the top-level `resources` dict so the UI can render
        resources cohesively inside the plan instead of as bare links.
        """
        plan = obj.study_plan or []
        if not plan:
            return []

        url_to_resource: dict[str, dict] = {}
        for items in (obj.resources or {}).values():
            for r in items or []:
                url = (r or {}).get("url")
                if url:
                    url_to_resource[url] = r

        enriched = []
        for step in plan:
            urls = step.get("resources") or []
            resources = []
            for u in urls:
                if isinstance(u, dict):
                    resources.append(u)
                    continue
                resources.append(
                    url_to_resource.get(u, {"title": u, "url": u, "snippet": ""}),
                )
            enriched.append({**step, "resources": resources})
        return enriched


class JdAnalysisBatchSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    analyses = JdAnalysisSerializer(many=True, read_only=True)

    class Meta:
        model = JdAnalysisBatch
        fields = ["id", "status", "created_at", "analyses"]
