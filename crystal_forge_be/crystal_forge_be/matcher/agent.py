"""JD-fit agent.

Pipeline:
1. ``ChatMistralAI`` produces matched_percentage, skills_matched,
   skills_needed_{addons,new}, and a short feedback verdict.
2. For each missing skill, Tavily searches for free beginner courses
   (top 3 results).
3. A second ``ChatMistralAI`` call synthesizes a week-by-week study plan
   that references those resources.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any
from typing import TypedDict

from django.conf import settings
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI

logger = logging.getLogger(__name__)

# TODO: tighten the prompt once the real product copy is finalized.
SYSTEM_PROMPT = """You are a job-fit analyzer.

You are given:
- A candidate's claimed skills (list of strings).
- The candidate's resume evidence (skill -> evidence pairs) backing those
  skills (may be empty).
- Optionally, the candidate's answers to a follow-up skills questionnaire
  (list of {{id, skill, type, question, answer}}). Treat a non-empty list as
  additional first-person evidence for the listed skills — judge each answer
  on accuracy and depth; vague or wrong answers do NOT count. If the list is
  empty, ignore it entirely.
- A single job description.

Do the following:

1. Extract the required skills from the JD (must-haves and nice-to-haves;
   include both).
2. Match candidate skills against required skills (case-insensitive,
   accept obvious synonyms — e.g. "JS" == "JavaScript", "k8s" == "Kubernetes").
   A skill counts as matched only if backed by resume evidence OR a
   demonstrably correct questionnaire answer.
3. Compute matched_percentage = round(matched / total_required * 100).
4. For each required skill the candidate does NOT have, classify it:
   - "addon": a small extension of an existing candidate skill
     (e.g. FastAPI for someone who knows Django; PyTorch for someone who
     knows TensorFlow). Include a short reason naming the related skill.
   - "new": no related background in the candidate's profile.
5. Write a 1-3 sentence verdict on whether this is a good match overall.
   If questionnaire answers materially changed the verdict, briefly say so.

Return ONLY valid JSON, no markdown:
{{
  "matched_percentage": <int 0-100>,
  "skills_matched": ["..."],
  "skills_needed_addons": [
    {{"skill": "...", "reason": "extension of <existing skill>"}}
  ],
  "skills_needed_new": [
    {{"skill": "...", "reason": "no related skill in profile"}}
  ],
  "feedback": "..."
}}
"""

USER_PROMPT = """Candidate skills:
{skills}

Candidate evidence:
{evidence}

Candidate questionnaire answers (empty list = none, ignore):
{qa}

Job description:
---
{jd_text}
---
"""

STUDY_PLAN_SYSTEM_PROMPT = """You are a learning coach.

Given a list of skills the candidate needs to acquire and curated learning
resources (free beginner courses) for each, produce a realistic week-by-week
study plan. Sequence skills so addon skills (extensions of what the candidate
already knows) come before completely new skills. Each week should target one
skill with concrete goals and 1-3 picked resource URLs from the provided list.

Return ONLY valid JSON:
[
  {{
    "week": 1,
    "skill": "...",
    "category": "addon" | "new",
    "goals": "<concrete deliverable for the week>",
    "resources": ["<url>", "<url>"]
  }}
]
"""

STUDY_PLAN_USER_PROMPT = """Missing skills (with category):
{skills_with_category}

Available resources per skill (title, url, snippet):
{resources}
"""

TAVILY_RESULTS_PER_SKILL = 3
TAVILY_QUERY = "best free course to learn {skill} for beginners"
SNIPPET_MAX_SENTENCES = 2


def _short_snippet(text: str) -> str:
    if not text:
        return ""
    # Collapse whitespace, then keep up to the first SNIPPET_MAX_SENTENCES sentences.
    cleaned = " ".join(text.split())
    parts: list[str] = []
    buf = ""
    for ch in cleaned:
        buf += ch
        if ch in ".!?":
            parts.append(buf.strip())
            buf = ""
            if len(parts) >= SNIPPET_MAX_SENTENCES:
                break
    if not parts:
        return buf.strip()
    return " ".join(parts)


class Resource(TypedDict):
    title: str
    url: str
    snippet: str


class StudyPlanStep(TypedDict):
    week: int
    skill: str
    category: str
    goals: str
    resources: list[str]


class AgentResult(TypedDict):
    matched_percentage: int
    skills_matched: list[str]
    skills_needed_addons: list[dict[str, Any]]
    skills_needed_new: list[dict[str, Any]]
    feedback: str
    resources: dict[str, list[Resource]]
    study_plan: list[StudyPlanStep]


def _llm() -> ChatMistralAI:
    return ChatMistralAI(
        model=settings.MISTRAL_CHAT_MODEL,
        api_key=settings.MISTRAL_API_KEY,
        temperature=0,
    )


def _fit_chain():
    prompt = ChatPromptTemplate.from_messages(
        [("system", SYSTEM_PROMPT), ("user", USER_PROMPT)],
    )
    return prompt | _llm() | JsonOutputParser()


def _study_plan_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", STUDY_PLAN_SYSTEM_PROMPT),
            ("user", STUDY_PLAN_USER_PROMPT),
        ],
    )
    return prompt | _llm() | JsonOutputParser()


def _search_resources(skills: list[str]) -> dict[str, list[Resource]]:
    """Tavily-search for free beginner courses for each skill."""
    if not skills:
        return {}
    if not settings.TAVILY_API_KEY:
        logger.warning("TAVILY_API_KEY not set; skipping resource lookup")
        return {}

    # langchain-community's TavilySearchResults reads TAVILY_API_KEY from env.
    os.environ.setdefault("TAVILY_API_KEY", settings.TAVILY_API_KEY)
    search = TavilySearchResults(max_results=TAVILY_RESULTS_PER_SKILL)

    out: dict[str, list[Resource]] = {}
    for skill in skills:
        try:
            raw = search.invoke(TAVILY_QUERY.format(skill=skill))
        except Exception:  # noqa: BLE001
            logger.exception("Tavily search failed for skill=%s", skill)
            out[skill] = []
            continue
        out[skill] = [
            Resource(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=_short_snippet(
                    item.get("content", "") or item.get("snippet", ""),
                ),
            )
            for item in (raw or [])
            if isinstance(item, dict)
        ]
    return out


def _build_study_plan(
    addons: list[dict[str, Any]],
    new_skills: list[dict[str, Any]],
    resources: dict[str, list[Resource]],
) -> list[StudyPlanStep]:
    skills_with_category = [
        {"skill": item["skill"], "category": "addon"}
        for item in addons
        if item.get("skill")
    ] + [
        {"skill": item["skill"], "category": "new"}
        for item in new_skills
        if item.get("skill")
    ]
    if not skills_with_category or not resources:
        return []

    chain = _study_plan_chain()
    try:
        plan = chain.invoke(
            {
                "skills_with_category": json.dumps(skills_with_category),
                "resources": json.dumps(resources),
            },
        )
    except Exception:  # noqa: BLE001
        logger.exception("Study-plan synthesis failed")
        return []

    if not isinstance(plan, list):
        return []
    return plan


def analyze_jd(
    *,
    jd_text: str,
    user_skills: list[str],
    evidence: list[dict[str, Any]] | None = None,
    qa: list[dict[str, Any]] | None = None,
) -> AgentResult:
    if not settings.MISTRAL_API_KEY:
        msg = "MISTRAL_API_KEY is not configured."
        raise RuntimeError(msg)

    parsed = _fit_chain().invoke(
        {
            "skills": json.dumps(user_skills or []),
            "evidence": json.dumps(evidence or []),
            "qa": json.dumps(qa or []),
            "jd_text": jd_text,
        },
    )

    pct = int(parsed.get("matched_percentage", 0))
    pct = max(0, min(100, pct))
    addons = parsed.get("skills_needed_addons", []) or []
    new_skills = parsed.get("skills_needed_new", []) or []

    missing_skill_names = [s["skill"] for s in addons + new_skills if s.get("skill")]
    resources = _search_resources(missing_skill_names)
    study_plan = _build_study_plan(addons, new_skills, resources)

    return AgentResult(
        matched_percentage=pct,
        skills_matched=parsed.get("skills_matched", []) or [],
        skills_needed_addons=addons,
        skills_needed_new=new_skills,
        feedback=parsed.get("feedback", "") or "",
        resources=resources,
        study_plan=study_plan,
    )
