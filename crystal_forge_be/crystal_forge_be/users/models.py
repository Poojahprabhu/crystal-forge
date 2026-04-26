from django.contrib.auth.models import AbstractUser
from django.db.models import CharField
from django.db.models import EmailField
from django.urls import reverse
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Default custom user model for crystal-forge-be.
    """

    first_name = CharField(_("First name"), max_length=150, blank=True)
    last_name = CharField(_("Last name"), max_length=150, blank=True)
    email = EmailField(_("Email address"), unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def get_absolute_url(self) -> str:
        return reverse("users:detail", kwargs={"username": self.username})
