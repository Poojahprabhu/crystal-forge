from django.urls import path

from .profile import ProfileJdAnalysesView
from .profile import ProfileJdAnalysisDetailView
from .profile import ProfileOverviewView
from .profile import ProfileResumeView
from .profile import ProfileStudyPlanDetailView
from .profile import ProfileStudyPlansView

app_name = "profile"

urlpatterns = [
    path("", ProfileOverviewView.as_view(), name="overview"),
    path("resume/", ProfileResumeView.as_view(), name="resume"),
    path(
        "jd-analyses/",
        ProfileJdAnalysesView.as_view(),
        name="jd-analyses",
    ),
    path(
        "jd-analyses/<int:pk>/",
        ProfileJdAnalysisDetailView.as_view(),
        name="jd-analysis-detail",
    ),
    path(
        "study-plans/",
        ProfileStudyPlansView.as_view(),
        name="study-plans",
    ),
    path(
        "study-plans/<int:analysis_id>/",
        ProfileStudyPlanDetailView.as_view(),
        name="study-plan-detail",
    ),
]
