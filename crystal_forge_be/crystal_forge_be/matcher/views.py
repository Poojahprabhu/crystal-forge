from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from crystal_forge_be.parser.models import ResumeProfile

from .models import JdAnalysis
from .models import JdAnalysisBatch
from .serializers import JdAnalysisBatchSerializer
from .serializers import JdAnalysisCreateSerializer
from .tasks import analyze_jd_task


class JdAnalyzeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        batches = JdAnalysisBatch.objects.filter(
            user=request.user,
        ).prefetch_related("analyses")
        return Response(
            JdAnalysisBatchSerializer(batches, many=True).data,
        )

    def post(self, request, *args, **kwargs):
        serializer = JdAnalysisCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not ResumeProfile.objects.filter(user=request.user).exists():
            return Response(
                {
                    "detail": (
                        "Upload a resume to /api/parser/analyze/ before "
                        "running JD analysis."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            batch = JdAnalysisBatch.objects.create(user=request.user)
            analyses = JdAnalysis.objects.bulk_create(
                [
                    JdAnalysis(batch=batch, jd_text=text)
                    for text in serializer.validated_data["jds"]
                ],
            )
            # Dispatch only after the row is committed; ATOMIC_REQUESTS keeps
            # the request transaction open until the view returns, so a bare
            # .delay() here would race the worker against an unwritten row.
            analysis_ids = [a.id for a in analyses]
            transaction.on_commit(
                lambda ids=analysis_ids: [
                    analyze_jd_task.delay(aid) for aid in ids
                ],
            )

        return Response(
            JdAnalysisBatchSerializer(batch).data,
            status=status.HTTP_202_ACCEPTED,
        )


class JdAnalyzeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, batch_id: int, *args, **kwargs):
        batch = get_object_or_404(
            JdAnalysisBatch.objects.prefetch_related("analyses"),
            pk=batch_id,
            user=request.user,
        )
        return Response(JdAnalysisBatchSerializer(batch).data)
