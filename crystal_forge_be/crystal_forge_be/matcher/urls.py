from django.urls import path

from .views import JdAnalyzeDetailView
from .views import JdAnalyzeView

app_name = "matcher"

urlpatterns = [
    path("analyze/", JdAnalyzeView.as_view(), name="jd-analyze"),
    path(
        "analyze/<int:batch_id>/",
        JdAnalyzeDetailView.as_view(),
        name="jd-analyze-detail",
    ),
]
