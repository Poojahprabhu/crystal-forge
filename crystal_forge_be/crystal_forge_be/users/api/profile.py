from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from crystal_forge_be.matcher.models import JdAnalysis
from crystal_forge_be.matcher.serializers import JdAnalysisSerializer
from crystal_forge_be.parser.models import ResumeProfile

from .serializers import UserSerializer


def _resume_summary(resume: ResumeProfile | None) -> dict | None:
    if resume is None:
        return None
    return {
        "sufficient": resume.sufficient,
        "summary": resume.summary,
        "claimed_skills_count": len(resume.claimed_skills or []),
        "weak_skills_count": len(resume.weak_skills or []),
        "has_pending_questionnaire": bool(resume.questionnaire),
        "updated_at": resume.updated_at,
    }


class ProfileOverviewView(APIView):
    """Aggregated profile snapshot for the dashboard."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        resume = ResumeProfile.objects.filter(user=user).first()
        analyses = JdAnalysis.objects.filter(batch__user=user)

        completed = analyses.filter(status=JdAnalysis.Status.DONE)
        in_progress = analyses.filter(
            status__in=[JdAnalysis.Status.PENDING, JdAnalysis.Status.RUNNING],
        )
        failed = analyses.filter(status=JdAnalysis.Status.FAILED)
        with_plan = completed.exclude(study_plan=[])

        return Response(
            {
                "user": UserSerializer(user, context={"request": request}).data,
                "resume": _resume_summary(resume),
                "jd_analyses": {
                    "total": analyses.count(),
                    "completed": completed.count(),
                    "in_progress": in_progress.count(),
                    "failed": failed.count(),
                },
                "study_plans_count": with_plan.count(),
            },
        )


class ProfileResumeView(APIView):
    """Latest resume snapshot on file for the user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            profile = ResumeProfile.objects.get(user=request.user)
        except ResumeProfile.DoesNotExist:
            return Response(
                {"detail": "No resume on file."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "sufficient": profile.sufficient,
                "summary": profile.summary,
                "claimed_skills": profile.claimed_skills or [],
                "evidence": profile.evidence or [],
                "weak_skills": profile.weak_skills or [],
                "questionnaire": profile.questionnaire or [],
                "qa": profile.qa or [],
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
            },
        )


def _serialize_analysis(analysis: JdAnalysis, *, include_jd_text: bool) -> dict:
    data = JdAnalysisSerializer(analysis).data
    data["batch_id"] = analysis.batch_id
    data["created_at"] = analysis.created_at
    data["updated_at"] = analysis.updated_at
    if include_jd_text:
        data["jd_text"] = analysis.jd_text
    return data


class ProfileJdAnalysesView(APIView):
    """Flat list of every JD analysis the user has run, newest first."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        analyses = (
            JdAnalysis.objects.filter(batch__user=request.user)
            .select_related("batch")
            .order_by("-batch__created_at", "id")
        )
        return Response(
            [_serialize_analysis(a, include_jd_text=False) for a in analyses],
        )


class ProfileJdAnalysisDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int, *args, **kwargs):
        analysis = get_object_or_404(
            JdAnalysis.objects.select_related("batch"),
            pk=pk,
            batch__user=request.user,
        )
        return Response(_serialize_analysis(analysis, include_jd_text=True))


def _study_plan_payload(analysis: JdAnalysis) -> dict:
    return {
        "analysis_id": analysis.id,
        "batch_id": analysis.batch_id,
        "created_at": analysis.created_at,
        "matched_percentage": analysis.matched_percentage,
        "skills_needed_addons": analysis.skills_needed_addons or [],
        "skills_needed_new": analysis.skills_needed_new or [],
        "study_plan": analysis.study_plan or [],
        "resources": analysis.resources or {},
    }


class ProfileStudyPlansView(APIView):
    """List of study plans across the user's completed JD analyses."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        analyses = (
            JdAnalysis.objects.filter(
                batch__user=request.user,
                status=JdAnalysis.Status.DONE,
            )
            .exclude(study_plan=[])
            .select_related("batch")
            .order_by("-batch__created_at", "id")
        )
        return Response([_study_plan_payload(a) for a in analyses])


class ProfileStudyPlanDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, analysis_id: int, *args, **kwargs):
        analysis = get_object_or_404(
            JdAnalysis.objects.select_related("batch"),
            pk=analysis_id,
            batch__user=request.user,
        )
        return Response(_study_plan_payload(analysis))
