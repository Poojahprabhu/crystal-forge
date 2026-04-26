from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from crystal_forge_be.users.models import User


class UserSerializer(serializers.ModelSerializer[User]):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class RegisterSerializer(serializers.ModelSerializer[User]):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "email", "password"]
        extra_kwargs = {
            "username": {"required": False},
            "first_name": {"required": True},
            "last_name": {"required": True},
            "email": {"required": True},
        }

    def create(self, validated_data):
        email = validated_data["email"]
        username = validated_data.get("username") or _username_from_email(email)
        return User.objects.create_user(
            username=username,
            email=email,
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )


def _username_from_email(email: str) -> str:
    """Generate a unique username from an email address.

    Uses the local-part as the seed; on collision, appends a numeric suffix.
    Username is constrained by Django's default validator (alphanumerics +
    @/./+/-/_), all of which are valid in email local-parts.
    """
    base = (email.split("@", 1)[0] or "user").strip()
    candidate = base
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate
