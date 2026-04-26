import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  parserApi,
  type ChatHistoryItem,
  type ChatStep,
} from "@/lib/parserApi";
import {
  matcherApi,
  type JdAnalysisBatch,
} from "@/lib/matcherApi";
import { extractErrorMessage } from "@/lib/apiClient";
import { JdAnalysisResultBlock } from "@/components/JdAnalysisResult";
import { AppShell } from "@/components/AppShell";

type Stage =
  | "hydrating"
  | "idle"
  | "analyzing"
  | "chat"
  | "answering"
  | "jd-entry"
  | "jd-analyzing"
  | "jd-result"
  | "error";

const ACCEPT = ".pdf,.doc,.docx,application/pdf";
const MAX_JDS = 2;
const POLL_INTERVAL_MS = 2500;

export default function ResumeAnalyzePage() {
  const [stage, setStage] = useState<Stage>("hydrating");
  const [file, setFile] = useState<File | null>(null);
  const [chat, setChat] = useState<ChatStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [jdBatch, setJdBatch] = useState<JdAnalysisBatch | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await parserApi.getProfile();
        if (cancelled) return;
        if (!profile) {
          setStage("idle");
          return;
        }

        // The chat endpoint is the source of truth for "where is the user
        // in the quiz". If still answering, resume there. If done, fall
        // through to the JD flow.
        const step = await parserApi.getChat();
        if (cancelled) return;
        if (!step.done) {
          setChat(step);
          setStage("chat");
          return;
        }

        const batches = await matcherApi.listBatches();
        if (cancelled) return;
        const latest = batches[0];
        if (!latest) {
          setChat(step);
          setStage("chat");
          return;
        }
        setJdBatch(latest);
        if (latest.status === "pending" || latest.status === "running") {
          setStage("jd-analyzing");
        } else {
          setStage("jd-result");
        }
      } catch (e) {
        if (cancelled) return;
        setError(extractErrorMessage(e, "Couldn't restore your previous session."));
        setStage("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(f: File) {
    setFile(f);
    setError(null);
    setChat(null);
    setStage("analyzing");
    try {
      await parserApi.analyze(f);
      // Always quiz immediately after upload — fetch the first chat step.
      const step = await parserApi.getChat();
      setChat(step);
      setStage("chat");
    } catch (e) {
      setError(extractErrorMessage(e, "Couldn't analyze that resume."));
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setChat(null);
    setError(null);
    setJdBatch(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function sendChatAnswer(answer: string) {
    try {
      const next = await parserApi.sendChatAnswer(answer);
      setChat(next);
    } catch (e) {
      setError(extractErrorMessage(e, "Couldn't submit that answer."));
      setStage("error");
    }
  }

  async function startJdAnalysis(jds: string[]) {
    setError(null);
    setStage("jd-analyzing");
    try {
      const batch = await matcherApi.createBatch(jds);
      setJdBatch(batch);
    } catch (e) {
      setError(extractErrorMessage(e, "Couldn't start JD analysis."));
      setStage("error");
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  return (
    <AppShell>
      <main className="flex flex-1 items-start justify-center pb-16 pt-6 sm:pt-10">
          {stage === "hydrating" && <HydratingCard />}
          {stage === "idle" && (
            <UploadCard
              isDragging={isDragging}
              setDragging={setDragging}
              inputRef={inputRef}
              onDrop={onDrop}
              onFile={handleFile}
            />
          )}
          {stage === "analyzing" && <AnalyzingCard filename={file?.name} />}
          {stage === "chat" && chat && (
            <ChatCard
              chat={chat}
              onSend={(answer) => void sendChatAnswer(answer)}
              onContinue={() => setStage("jd-entry")}
              onReset={reset}
            />
          )}
          {stage === "answering" && <AnsweringCard />}
          {stage === "jd-entry" && (
            <JdEntryCard
              onBack={() => setStage("chat")}
              onSubmit={(jds) => void startJdAnalysis(jds)}
            />
          )}
          {stage === "jd-analyzing" && (
            <JdAnalyzingCard
              batch={jdBatch}
              onBatchUpdate={setJdBatch}
              onDone={(b) => {
                setJdBatch(b);
                setStage("jd-result");
              }}
              onError={(msg) => {
                setError(msg);
                setStage("error");
              }}
            />
          )}
          {stage === "jd-result" && jdBatch && (
            <JdResultCard
              batch={jdBatch}
              onAnotherBatch={() => {
                setJdBatch(null);
                setStage("jd-entry");
              }}
              onReset={reset}
            />
          )}
          {stage === "error" && (
            <ErrorCard message={error} onRetry={reset} />
          )}
      </main>
    </AppShell>
  );
}

/* ---------- Upload (idle) ---------- */

function UploadCard({
  isDragging,
  setDragging,
  inputRef,
  onDrop,
  onFile,
}: {
  isDragging: boolean;
  setDragging: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onDrop: (e: DragEvent<HTMLLabelElement>) => void;
  onFile: (f: File) => void;
}) {
  return (
    <section className="w-full max-w-2xl">
      <div className="mb-6 text-center">
        <span className="pill-ember">
          <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
          Step 1 of 3
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forge-900 sm:text-4xl">
          Bring in the resume.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-forge-600 sm:text-base">
          Drop a PDF and we'll start the conversation — extracting claimed
          skills and checking the evidence behind each one.
        </p>
      </div>

      <div className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            isDragging
              ? "border-ember-400 bg-ember-50/60"
              : "border-forge-200 bg-slate-50/60 hover:border-forge-300 hover:bg-slate-50"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forge-50 text-forge-700">
            <UploadIcon />
          </span>
          <p className="mt-4 font-display text-base font-semibold text-forge-900">
            Drop your resume here
          </p>
          <p className="mt-1 text-sm text-forge-600">
            or{" "}
            <span className="font-semibold text-forge-800 underline-offset-4 hover:underline">
              click to browse
            </span>
          </p>
          <p className="mt-3 text-xs text-forge-500">
            PDF, DOC or DOCX · Max ~10 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-forge-100 bg-slate-50/70 p-3 text-xs text-forge-600">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forge-100 text-forge-700">
            <LockIcon />
          </span>
          <p>
            Your resume is processed only to extract skills and evidence for
            your assessment. It isn't shared.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Analyzing ---------- */

const ANALYZE_STEPS = [
  "Reading the document",
  "Identifying claimed skills",
  "Cross-checking the evidence",
  "Drafting the assessment",
];

const ANALYZE_TIPS = [
  "Crystal Forge probes each skill conversationally — not with quizzes.",
  "We line up claimed skills against evidence in the resume itself.",
  "Adjacent skills are upskills you can realistically achieve in weeks.",
  "Your plan will include curated resources and time estimates.",
];

function AnalyzingCard({ filename }: { filename?: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Auto-advance step indicator. The last step stays "active" until unmount.
  useEffect(() => {
    const offsets = [2400, 5000, 8200];
    const timeouts = offsets.map((ms, i) =>
      window.setTimeout(() => setStepIndex(i + 1), ms),
    );
    return () => timeouts.forEach((t) => window.clearTimeout(t));
  }, []);

  // Rotate tips.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % ANALYZE_TIPS.length);
    }, 3800);
    return () => window.clearInterval(id);
  }, []);

  // Elapsed timer (subtle, helps pace the wait).
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="w-full max-w-xl">
      <div className="rounded-3xl border border-forge-100 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-center gap-4">
          <ScanningTile />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-forge-900">
              {filename || "Analyzing your resume"}
            </p>
            <p className="text-xs text-forge-500">
              Working on it · {formatElapsed(elapsed)}
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-ember-200 bg-ember-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ember-800 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ember-500" />
            </span>
            Live
          </span>
        </div>

        {/* Indeterminate progress bar */}
        <div className="relative mt-6 h-1.5 w-full overflow-hidden rounded-full bg-forge-50">
          <div className="absolute inset-y-0 left-0 w-1/3 animate-shimmer-bar rounded-full bg-gradient-to-r from-forge-500/0 via-forge-500 to-ember-400/80" />
        </div>

        <ul className="mt-7 space-y-3">
          {ANALYZE_STEPS.map((label, i) => (
            <StepRow
              key={label}
              label={label}
              status={
                i < stepIndex
                  ? "done"
                  : i === stepIndex
                    ? "active"
                    : "pending"
              }
            />
          ))}
        </ul>

        <div className="mt-7 rounded-xl border border-forge-100 bg-slate-50/70 p-3.5 text-xs leading-relaxed text-forge-600">
          <p
            key={tipIndex}
            className="animate-fade-in-soft"
            aria-live="polite"
          >
            <span className="font-semibold uppercase tracking-wider text-ember-700">
              Tip ·{" "}
            </span>
            {ANALYZE_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </section>
  );
}

function StepRow({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "done";
}) {
  const indicator =
    status === "done" ? (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon />
      </span>
    ) : status === "active" ? (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ember-50">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember-500" />
        </span>
      </span>
    ) : (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-forge-200">
        <span className="h-1.5 w-1.5 rounded-full bg-forge-200" />
      </span>
    );

  const labelClass =
    status === "pending"
      ? "text-forge-400"
      : status === "active"
        ? "font-semibold text-forge-900"
        : "text-forge-700";

  return (
    <li className="flex items-center gap-3 text-sm">
      {indicator}
      <span className={labelClass}>{label}</span>
    </li>
  );
}

function ScanningTile() {
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-forge-50 to-forge-100 text-forge-700">
      <DocIconLarge />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1.5 h-[2px] animate-scan-vertical bg-gradient-to-r from-transparent via-ember-500 to-transparent shadow-[0_0_8px_2px_rgba(249,144,8,0.55)]"
      />
    </span>
  );
}

function DocIconLarge() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function formatElapsed(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

/* ---------- Chat (conversational quiz) ---------- */

function ChatCard({
  chat,
  onSend,
  onContinue,
  onReset,
}: {
  chat: ChatStep;
  onSend: (answer: string) => void;
  onContinue: () => void;
  onReset: () => void;
}) {
  if (chat.done) {
    return (
      <ChatDoneCard
        verdict={chat.verdict}
        history={chat.history}
        onContinue={onContinue}
        onReset={onReset}
      />
    );
  }
  return <ChatStepCard step={chat} onSend={onSend} />;
}

function ChatStepCard({
  step,
  onSend,
}: {
  step: Extract<ChatStep, { done: false }>;
  onSend: (answer: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Whenever the question advances, reset local state, scroll the new
  // question card to the top of the viewport (just under the sticky
  // header), and focus the textarea so the user can start typing without
  // having to scroll past prior answers.
  useEffect(() => {
    setDraft("");
    setSubmitting(false);

    // Skip the scroll on the very first question (step 1) — the page is
    // already at the top, and forcing a scroll feels jumpy.
    if (step.step > 1) {
      cardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    // Focus after the scroll kicks off; the browser handles caret placement.
    textareaRef.current?.focus({ preventScroll: true });
  }, [step.step]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    onSend(trimmed);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <section className="w-full max-w-3xl">
      {/* Hide the marketing intro after the first question so subsequent
          steps don't push the active card off-screen. */}
      {step.step === 1 && step.history.length === 0 && (
        <div className="mb-6 text-center">
          <span className="pill-ember">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
            Skills check · question {step.step} of {step.total}
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forge-900 sm:text-4xl">
            A few quick questions.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-forge-600 sm:text-base">
            Answer in your own words — a sentence or two each is enough.
          </p>
        </div>
      )}

      {/* Conversation history */}
      {step.history.length > 0 && (
        <div className="mb-4 space-y-3">
          {step.history.map((h) => (
            <ChatTurn key={h.id} item={h} />
          ))}
        </div>
      )}

      {/* Current question — scroll-mt offsets the sticky header so the
          card lands fully visible after scrollIntoView. */}
      <div
        ref={cardRef}
        className="scroll-mt-24 rounded-3xl border border-ember-200 bg-white p-5 shadow-sm ring-1 ring-ember-100 sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ember-700">
            Question {step.step} of {step.total}
          </span>
          <span className="rounded-full border border-forge-100 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-forge-700">
            {step.question.skill}
          </span>
          <span className="rounded-full border border-forge-100 bg-white px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-forge-500">
            {step.question.type}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-forge-800">
          {step.question.question}
        </p>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your answer here…  (⌘/Ctrl + Enter to send)"
          rows={5}
          className="input mt-4 min-h-[120px] resize-y leading-relaxed"
          disabled={submitting}
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-forge-500">
            {step.step} / {step.total}
          </span>
          <button
            type="button"
            className="btn-primary px-6 py-3 text-base"
            disabled={!draft.trim() || submitting}
            onClick={() => void handleSend()}
          >
            {submitting
              ? "Sending…"
              : step.step === step.total
                ? "Submit final answer"
                : "Send & next"}
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}

function ChatTurn({ item }: { item: ChatHistoryItem }) {
  return (
    <div className="rounded-2xl border border-forge-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-forge-100 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-forge-700">
          {item.skill}
        </span>
        <span className="rounded-full border border-forge-100 bg-white px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-forge-500">
          {item.type}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium leading-relaxed text-forge-800">
        Q: {item.question}
      </p>
      <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50/70 p-3 text-sm leading-relaxed text-forge-700">
        {item.answer}
      </p>
    </div>
  );
}

function ChatDoneCard({
  verdict,
  history,
  onContinue,
  onReset,
}: {
  verdict: Extract<ChatStep, { done: true }>["verdict"];
  history: ChatHistoryItem[];
  onContinue: () => void;
  onReset: () => void;
}) {
  return (
    <section className="w-full max-w-3xl space-y-5">
      <div className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {verdict.sufficient ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckIcon />
              Skills verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <InfoIcon />
              Some skills still unproven
            </span>
          )}
          <span className="pill">
            {verdict.claimed_skills.length} claimed skills
          </span>
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-forge-900">
          Verdict after the skills check
        </h2>
        <p className="mt-3 leading-relaxed text-forge-700">{verdict.summary}</p>
      </div>

      {verdict.weak_skills.length > 0 && (
        <div className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="font-display text-base font-semibold text-forge-900">
            Still weak
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {verdict.weak_skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <details className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
          <summary className="cursor-pointer font-display text-base font-semibold text-forge-900">
            Your answers ({history.length})
          </summary>
          <div className="mt-4 space-y-3">
            {history.map((h) => (
              <ChatTurn key={h.id} item={h} />
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        <button type="button" className="btn-ghost" onClick={onReset}>
          Upload a different resume
        </button>
        <button
          type="button"
          className="btn-primary px-6 py-3 text-base"
          onClick={onContinue}
        >
          Continue to JD analysis
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

/* ---------- Answering (re-eval loading) ---------- */

function AnsweringCard() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="w-full max-w-xl">
      <div className="rounded-3xl border border-forge-100 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-center gap-4">
          <ScanningTile />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-forge-900">
              Re-evaluating with your answers
            </p>
            <p className="text-xs text-forge-500">
              Working on it · {formatElapsed(elapsed)}
            </p>
          </div>
        </div>

        <div className="relative mt-6 h-1.5 w-full overflow-hidden rounded-full bg-forge-50">
          <div className="absolute inset-y-0 left-0 w-1/3 animate-shimmer-bar rounded-full bg-gradient-to-r from-forge-500/0 via-forge-500 to-ember-400/80" />
        </div>

        <div className="mt-7 rounded-xl border border-forge-100 bg-slate-50/70 p-3.5 text-xs leading-relaxed text-forge-600">
          <span className="font-semibold uppercase tracking-wider text-ember-700">
            Tip ·{" "}
          </span>
          We're combining your answers with the resume evidence to refine the
          assessment.
        </div>
      </div>
    </section>
  );
}

/* ---------- JD Entry ---------- */

function JdEntryCard({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (jds: string[]) => void;
}) {
  const [jds, setJds] = useState<string[]>([""]);

  const trimmed = jds.map((j) => j.trim());
  const filled = trimmed.filter((j) => j.length > 0);
  const canSubmit = filled.length > 0 && filled.length === trimmed.length;

  function update(i: number, value: string) {
    setJds((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function add() {
    if (jds.length >= MAX_JDS) return;
    setJds((prev) => [...prev, ""]);
  }

  function remove(i: number) {
    setJds((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i),
    );
  }

  return (
    <section className="w-full max-w-3xl">
      <div className="mb-6 text-center">
        <span className="pill-ember">
          <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
          Step 2 of 3
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forge-900 sm:text-4xl">
          Bring in the job descriptions.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-forge-600 sm:text-base">
          Paste each JD into its own box. We'll match every one of them against
          the resume in parallel.
        </p>
      </div>

      <div className="space-y-4">
        {jds.map((value, i) => (
          <div
            key={i}
            className="rounded-3xl border border-forge-100 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ember-700">
                Job description {i + 1}
              </span>
              {jds.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs font-medium text-forge-500 transition-colors hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={value}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Paste the full job description here…"
              rows={7}
              className="input min-h-[160px] resize-y leading-relaxed"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-outline"
          onClick={add}
          disabled={jds.length >= MAX_JDS}
        >
          <PlusIcon />
          Add another JD
        </button>
        <p className="text-xs text-forge-500">
          {filled.length} of {jds.length} filled · max {MAX_JDS}
        </p>
      </div>

      <div className="mt-8 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary px-6 py-3 text-base"
          disabled={!canSubmit}
          onClick={() => onSubmit(filled)}
        >
          Run JD analysis
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}

/* ---------- JD Analyzing (polling) ---------- */

function JdAnalyzingCard({
  batch,
  onBatchUpdate,
  onDone,
  onError,
}: {
  batch: JdAnalysisBatch | null;
  onBatchUpdate: (b: JdAnalysisBatch) => void;
  onDone: (b: JdAnalysisBatch) => void;
  onError: (msg: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!batch) return;
    if (batch.status === "done" || batch.status === "failed") {
      onDone(batch);
      return;
    }
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const next = await matcherApi.getBatch(batch.id);
        if (cancelled) return;
        onBatchUpdate(next);
        if (next.status === "done" || next.status === "failed") {
          window.clearInterval(id);
          onDone(next);
        }
      } catch (e) {
        if (cancelled) return;
        window.clearInterval(id);
        onError(extractErrorMessage(e, "Lost connection while polling."));
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [batch, onBatchUpdate, onDone, onError]);

  const analyses = batch?.analyses ?? [];
  const total = analyses.length;
  const done = analyses.filter(
    (a) => a.status === "done" || a.status === "failed",
  ).length;

  return (
    <section className="w-full max-w-2xl">
      <div className="rounded-3xl border border-forge-100 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-center gap-4">
          <ScanningTile />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-forge-900">
              Matching against {total || "your"} job description
              {total === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-forge-500">
              {done} of {total || "?"} complete · {formatElapsed(elapsed)}
            </p>
          </div>
        </div>

        <div className="relative mt-6 h-1.5 w-full overflow-hidden rounded-full bg-forge-50">
          <div className="absolute inset-y-0 left-0 w-1/3 animate-shimmer-bar rounded-full bg-gradient-to-r from-forge-500/0 via-forge-500 to-ember-400/80" />
        </div>

        {total > 0 && (
          <ul className="mt-7 space-y-3">
            {analyses.map((a, i) => (
              <StepRow
                key={a.id}
                label={`Job description ${i + 1}`}
                status={
                  a.status === "done"
                    ? "done"
                    : a.status === "failed"
                      ? "done"
                      : a.status === "running"
                        ? "active"
                        : "pending"
                }
              />
            ))}
          </ul>
        )}

        <div className="mt-7 rounded-xl border border-forge-100 bg-slate-50/70 p-3.5 text-xs leading-relaxed text-forge-600">
          <span className="font-semibold uppercase tracking-wider text-ember-700">
            Tip ·{" "}
          </span>
          We score evidence against requirements, then split gaps into adjacent
          upskills versus genuinely new skills.
        </div>
      </div>
    </section>
  );
}

/* ---------- JD Result ---------- */

function JdResultCard({
  batch,
  onAnotherBatch,
  onReset,
}: {
  batch: JdAnalysisBatch;
  onAnotherBatch: () => void;
  onReset: () => void;
}) {
  return (
    <section className="w-full max-w-3xl space-y-5">
      <div className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill-ember">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
            Step 3 of 3
          </span>
          <span className="pill">
            {batch.analyses.length} JD
            {batch.analyses.length === 1 ? "" : "s"} analyzed
          </span>
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-forge-900">
          JD match results
        </h2>
        <p className="mt-2 leading-relaxed text-forge-700">
          Each job description was scored against the resume. Addon skills are
          natural extensions of what's already there; new skills are gaps that
          need fresh learning.
        </p>
      </div>

      {batch.analyses.map((a, i) => (
        <JdAnalysisResultBlock key={a.id} analysis={a} index={i} />
      ))}

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        <button type="button" className="btn-ghost" onClick={onReset}>
          Start over with a new resume
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={onAnotherBatch}
        >
          Analyze more JDs
        </button>
      </div>
    </section>
  );
}

/* ---------- Hydrating ---------- */

function HydratingCard() {
  return (
    <section className="w-full max-w-md">
      <div className="rounded-3xl border border-forge-100 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forge-50 text-forge-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember-500" />
          </span>
        </span>
        <p className="mt-4 font-display text-base font-semibold text-forge-900">
          Restoring your session
        </p>
        <p className="mt-1 text-xs text-forge-500">
          Pulling your latest resume and JD analyses…
        </p>
      </div>
    </section>
  );
}

/* ---------- Error ---------- */

function ErrorCard({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="w-full max-w-xl">
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertIcon />
        </span>
        <h2 className="mt-5 font-display text-xl font-semibold text-forge-900">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-forge-600">
          {message ?? "Please try uploading your resume again."}
        </p>
        <button type="button" className="btn-primary mt-6" onClick={onRetry}>
          Try again
        </button>
      </div>
    </section>
  );
}

/* ---------- Icons ---------- */

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
