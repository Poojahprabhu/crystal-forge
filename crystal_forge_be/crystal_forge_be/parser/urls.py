from django.urls import path

from .views import AnswerSubmitView
from .views import ChatView
from .views import ResumeAnalyzeView

app_name = "parser"

urlpatterns = [
    path("analyze/", ResumeAnalyzeView.as_view(), name="resume-analyze"),
    path("answers/", AnswerSubmitView.as_view(), name="answer-submit"),
    path("chat/", ChatView.as_view(), name="chat"),
]
