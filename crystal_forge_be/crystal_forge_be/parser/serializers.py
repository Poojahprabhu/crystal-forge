from rest_framework import serializers


class AnswerItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    answer = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=10_000)


class AnswerSubmitSerializer(serializers.Serializer):
    answers = AnswerItemSerializer(many=True, allow_empty=False)


class ChatAnswerSerializer(serializers.Serializer):
    answer = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=10_000)


ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


class ResumeUploadSerializer(serializers.Serializer):
    document = serializers.FileField()

    def validate_document(self, value):
        if value.size > MAX_UPLOAD_BYTES:
            msg = "File too large; max 10 MB."
            raise serializers.ValidationError(msg)
        if value.content_type not in ALLOWED_CONTENT_TYPES:
            msg = f"Unsupported content type: {value.content_type}"
            raise serializers.ValidationError(msg)
        return value
