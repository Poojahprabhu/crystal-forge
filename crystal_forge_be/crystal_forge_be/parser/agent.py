"""Resume-verification agent.

Pipeline:
1. Mistral OCR turns the uploaded document into markdown text.
2. A LangChain `ChatMistralAI` runnable evaluates whether the resume's
   evidence (projects, work experience, education, etc.) is enough to back
   the claimed skills. If not, it produces a 55-question questionnaire.
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI
from mistralai import Mistral

QUESTIONNAIRE_SIZE = 5

# TODO: replace with the real verification prompt once finalized.
SYSTEM_PROMPT = """You are a resume-evidence auditor.

You are given the full text of a candidate's resume. Your job:

1. Extract the list of skills the candidate claims (explicit skills section,
   plus skills strongly implied by job titles).
2. For each claimed skill, look for supporting evidence elsewhere in the
   resume — concrete projects, measurable outcomes, prior work experience,
   certifications, publications, or open-source contributions.
3. Decide whether the evidence is sufficient to trust the candidate's
   skill claims overall.

ALWAYS return both a verdict and a questionnaire — even when the evidence
looks sufficient, the candidate still gets quizzed to confirm depth.

Generate exactly {questionnaire_size} targeted questions:
- If evidence is weak, probe the weakest-evidenced skills more heavily.
- If evidence is strong, focus on confirming depth (probe nuanced/edge-case
  knowledge) so a glib resume can't pass without real understanding.
Mix conceptual, applied/scenario, and short-coding questions.

Return ONLY valid JSON, no markdown:
{{
  "sufficient": <bool — your initial verdict from the resume alone>,
  "summary": "<1-3 sentence justification of the verdict>",
  "claimed_skills": ["..."],
  "weak_skills": ["..."],
  "evidence": [
    {{"skill": "...", "evidence": "..."}}
  ],
  "questionnaire": [
    {{"id": 1, "skill": "...", "type": "conceptual|applied|coding", "question": "..."}}
  ]
}}
"""

USER_PROMPT = """Resume text (Mistral OCR output, markdown):

---
{resume_text}
---
"""

REEVAL_SYSTEM_PROMPT = """You are a resume-evidence auditor re-evaluating a
candidate after they have answered a skills questionnaire. The original
resume evidence was insufficient, so a questionnaire was generated. The
candidate has now answered those questions.

Your job: decide whether the answers, combined with the original resume
evidence, are sufficient to trust the candidate's skill claims.

Judge each answer on accuracy, depth, and whether it actually demonstrates
the skill (correct concept, plausible applied reasoning, working code if
asked, etc.). Vague, generic, or wrong answers do NOT count as evidence.

If the candidate now passes, return:
{{
  "sufficient": true,
  "summary": "<1-3 sentence justification referencing key answers>",
  "claimed_skills": ["..."],
  "evidence": [
    {{"skill": "...", "evidence": "<resume evidence and/or answer to Q#>"}}
  ]
}}

If still insufficient, return:
{{
  "sufficient": false,
  "summary": "<1-3 sentences naming which skills are still unproven and why>",
  "claimed_skills": ["..."],
  "weak_skills": ["..."]
}}

Return ONLY valid JSON. Do not wrap it in markdown fences.
"""

REEVAL_USER_PROMPT = """Claimed skills:
{claimed_skills}

Resume evidence (from initial analysis):
{evidence}

Questionnaire with the candidate's answers:
{qa}
"""


@dataclass
class AgentResult:
    sufficient: bool
    summary: str
    claimed_skills: list[str]
    weak_skills: list[str]
    evidence: list[dict[str, Any]]
    questionnaire: list[dict[str, Any]]
    raw_text: str


def _ocr_document(file_bytes: bytes, filename: str, mime_type: str) -> str:
    """Run Mistral OCR on the uploaded document and return markdown text."""
    if not settings.MISTRAL_API_KEY:
        msg = "MISTRAL_API_KEY is not configured."
        raise RuntimeError(msg)

    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    document: dict[str, str]
    if mime_type.startswith("image/"):
        document = {
            "type": "image_url",
            "image_url": f"data:{mime_type};base64,{encoded}",
        }
    else:
        document = {
            "type": "document_url",
            "document_url": f"data:{mime_type};base64,{encoded}",
            "document_name": filename,
        }

    response = client.ocr.process(
        model=settings.MISTRAL_OCR_MODEL,
        document=document,
    )
    pages = getattr(response, "pages", []) or []
    return "\n\n".join(p.markdown for p in pages if getattr(p, "markdown", None))


def _build_chain():
    llm = ChatMistralAI(
        model=settings.MISTRAL_CHAT_MODEL,
        api_key=settings.MISTRAL_API_KEY,
        temperature=0,
    )
    prompt = ChatPromptTemplate.from_messages(
        [("system", SYSTEM_PROMPT), ("user", USER_PROMPT)],
    ).partial(questionnaire_size=str(QUESTIONNAIRE_SIZE))
    return prompt | llm | JsonOutputParser()


def analyze_resume(file_bytes: bytes, filename: str, mime_type: str) -> AgentResult:
    resume_text = _ocr_document(file_bytes, filename, mime_type)
    if not resume_text.strip():
        msg = "OCR returned empty text; the document could not be parsed."
        raise RuntimeError(msg)

    chain = _build_chain()
    parsed = chain.invoke({"resume_text": resume_text})

    sufficient = bool(parsed.get("sufficient"))
    questionnaire = parsed.get("questionnaire") or []
    if len(questionnaire) != QUESTIONNAIRE_SIZE:
        msg = (
            f"Agent returned {len(questionnaire)} questions; "
            f"expected {QUESTIONNAIRE_SIZE}."
        )
        raise RuntimeError(msg)

    return AgentResult(
        sufficient=sufficient,
        summary=parsed.get("summary", ""),
        claimed_skills=parsed.get("claimed_skills", []) or [],
        weak_skills=parsed.get("weak_skills", []) or [],
        evidence=parsed.get("evidence", []) or [],
        questionnaire=questionnaire,
        raw_text=json.dumps(parsed),
    )


def reevaluate_with_answers(
    *,
    claimed_skills: list[str],
    evidence: list[dict[str, Any]],
    qa: list[dict[str, Any]],
) -> AgentResult:
    """Re-run the auditor over the candidate's questionnaire answers."""
    if not settings.MISTRAL_API_KEY:
        msg = "MISTRAL_API_KEY is not configured."
        raise RuntimeError(msg)

    llm = ChatMistralAI(
        model=settings.MISTRAL_CHAT_MODEL,
        api_key=settings.MISTRAL_API_KEY,
        temperature=0,
    )
    prompt = ChatPromptTemplate.from_messages(
        [("system", REEVAL_SYSTEM_PROMPT), ("user", REEVAL_USER_PROMPT)],
    )
    chain = prompt | llm | JsonOutputParser()
    parsed = chain.invoke(
        {
            "claimed_skills": json.dumps(claimed_skills or []),
            "evidence": json.dumps(evidence or []),
            "qa": json.dumps(qa or []),
        },
    )

    return AgentResult(
        sufficient=bool(parsed.get("sufficient")),
        summary=parsed.get("summary", ""),
        claimed_skills=parsed.get("claimed_skills", []) or claimed_skills or [],
        weak_skills=parsed.get("weak_skills", []) or [],
        evidence=parsed.get("evidence", []) or [],
        questionnaire=[],
        raw_text=json.dumps(parsed),
    )
