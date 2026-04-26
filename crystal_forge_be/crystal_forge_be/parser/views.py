import logging
from dataclasses import asdict

from mistralai.models import SDKError
from rest_framework import status
from rest_framework.parsers import FormParser
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .agent import analyze_resume
from .agent import reevaluate_with_answers
from .models import ResumeProfile
from .serializers import AnswerSubmitSerializer
from .serializers import ChatAnswerSerializer
from .serializers import ResumeUploadSerializer

logger = logging.getLogger(__name__)


def _profile_payload(profile: ResumeProfile) -> dict:
    return {
        "sufficient": profile.sufficient,
        "summary": profile.summary,
        "claimed_skills": profile.claimed_skills or [],
        "evidence": profile.evidence or [],
        "weak_skills": profile.weak_skills or [],
        "questionnaire": profile.questionnaire or [],
    }


class ResumeAnalyzeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, *args, **kwargs):
        try:
            profile = ResumeProfile.objects.get(user=request.user)
        except ResumeProfile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(_profile_payload(profile), status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        serializer = ResumeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["document"]

        try:
            result = analyze_resume(
                file_bytes=upload.read(),
                filename=upload.name,
                mime_type=upload.content_type,
            )
        except (RuntimeError, SDKError) as exc:
            logger.exception("Resume analysis failed")
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payload = asdict(result)
        payload.pop("raw_text", None)

        ResumeProfile.objects.update_or_create(
            user=request.user,
            defaults={
                "sufficient": result.sufficient,
                "summary": result.summary,
                "claimed_skills": result.claimed_skills,
                "evidence": result.evidence,
                "weak_skills": result.weak_skills,
                "questionnaire": result.questionnaire,
                "qa": [],
            },
        )

        return Response(payload, status=status.HTTP_200_OK)


class AnswerSubmitView(APIView):
    """Re-evaluate a candidate after they answer the generated questionnaire."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AnswerSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            profile = ResumeProfile.objects.get(user=request.user)
        except ResumeProfile.DoesNotExist:
            return Response(
                {"detail": "Upload a resume first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if profile.sufficient:
            return Response(
                {"detail": "Profile is already sufficient; nothing to re-evaluate."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not profile.questionnaire:
            return Response(
                {"detail": "No questionnaire on file to answer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions_by_id = {q.get("id"): q for q in profile.questionnaire}
        qa = []
        for item in serializer.validated_data["answers"]:
            q = questions_by_id.get(item["id"])
            if q is None:
                return Response(
                    {"detail": f"Unknown question id {item['id']}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qa.append(
                {
                    "id": item["id"],
                    "skill": q.get("skill", ""),
                    "type": q.get("type", ""),
                    "question": q.get("question", ""),
                    "answer": item["answer"],
                },
            )

        try:
            result = reevaluate_with_answers(
                claimed_skills=profile.claimed_skills or [],
                evidence=profile.evidence or [],
                qa=qa,
            )
        except (RuntimeError, SDKError) as exc:
            logger.exception("Re-evaluation failed")
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        profile.sufficient = result.sufficient
        profile.summary = result.summary
        profile.claimed_skills = result.claimed_skills
        profile.evidence = result.evidence
        profile.weak_skills = result.weak_skills
        profile.qa = qa
        if result.sufficient:
            profile.questionnaire = []
        profile.save()

        payload = asdict(result)
        payload.pop("raw_text", None)
        return Response(payload, status=status.HTTP_200_OK)


class ChatView(APIView):
    """Conversational quiz over the questionnaire — one question per turn.

    State lives on `ResumeProfile.qa` (the answered transcript). Length of
    `qa` is the cursor: next question is `questionnaire[len(qa)]`.

    GET  /api/parser/chat/  — returns the next question, or the verdict if
                              all questions have been answered.
    POST /api/parser/chat/  — body {"answer": "..."} appends to qa and
                              returns the next question; on the last answer
                              it triggers re-evaluation and returns the
                              verdict.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        profile = self._profile_or_400(request)
        if isinstance(profile, Response):
            return profile
        return self._step_response(profile)

    def post(self, request, *args, **kwargs):
        profile = self._profile_or_400(request)
        if isinstance(profile, Response):
            return profile

        serializer = ChatAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        questionnaire = profile.questionnaire or []
        qa = list(profile.qa or [])
        if len(qa) >= len(questionnaire):
            return Response(
                {"detail": "All questions already answered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        q = questionnaire[len(qa)]
        qa.append(
            {
                "id": q.get("id", len(qa) + 1),
                "skill": q.get("skill", ""),
                "type": q.get("type", ""),
                "question": q.get("question", ""),
                "answer": serializer.validated_data["answer"],
            },
        )
        profile.qa = qa
        profile.save(update_fields=["qa", "updated_at"])

        if len(qa) < len(questionnaire):
            return self._step_response(profile)
        return self._finalize(profile, qa)

    def _profile_or_400(self, request):
        try:
            return ResumeProfile.objects.get(user=request.user)
        except ResumeProfile.DoesNotExist:
            return Response(
                {"detail": "Upload a resume first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _step_response(self, profile: ResumeProfile) -> Response:
        questionnaire = profile.questionnaire or []
        qa = profile.qa or []
        idx = len(qa)
        if idx >= len(questionnaire):
            return Response(
                {
                    "done": True,
                    "verdict": {
                        "sufficient": profile.sufficient,
                        "summary": profile.summary,
                        "claimed_skills": profile.claimed_skills or [],
                        "evidence": profile.evidence or [],
                        "weak_skills": profile.weak_skills or [],
                    },
                    "history": qa,
                },
            )
        return Response(
            {
                "done": False,
                "step": idx + 1,
                "total": len(questionnaire),
                "question": questionnaire[idx],
                "history": qa,
            },
        )

    def _finalize(self, profile: ResumeProfile, qa: list) -> Response:
        try:
            result = reevaluate_with_answers(
                claimed_skills=profile.claimed_skills or [],
                evidence=profile.evidence or [],
                qa=qa,
            )
        except (RuntimeError, SDKError) as exc:
            logger.exception("Re-evaluation failed")
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        profile.sufficient = result.sufficient
        profile.summary = result.summary
        profile.claimed_skills = result.claimed_skills
        profile.evidence = result.evidence
        profile.weak_skills = result.weak_skills
        profile.save()

        return Response(
            {
                "done": True,
                "verdict": {
                    "sufficient": result.sufficient,
                    "summary": result.summary,
                    "claimed_skills": result.claimed_skills,
                    "evidence": result.evidence,
                    "weak_skills": result.weak_skills,
                },
                "history": qa,
            },
            status=status.HTTP_200_OK,
        )
