import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/lib/apiClient";
import {
  profileApi,
  type ProfileOverview,
  type ProfileJdAnalysis,
  type StudyPlanRecord,
} from "@/lib/profileApi";
import { AppShell } from "@/components/AppShell";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [analyses, setAnalyses] = useState<ProfileJdAnalysis[] | null>(null);
  const [plans, setPlans] = useState<StudyPlanRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initials = (user?.first_name?.[0] ?? user?.username?.[0] ?? "?")
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, an, pl] = await Promise.all([
          profileApi.overview(),
          profileApi.listJdAnalyses(),
          profileApi.listStudyPlans(),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setAnalyses(an);
        setPlans(pl);
      } catch (e) {
        if (cancelled) return;
        setError(extractErrorMessage(e, "Couldn't load your profile."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell back={{ to: "/dashboard", label: "Dashboard" }}>
      <main className="flex-1 pb-16 pt-6 sm:pt-8">
          {loading && <ProfileSkeleton />}
          {!loading && error && <ErrorBanner message={error} />}
          {!loading && !error && overview && (
            <div className="space-y-6">
              <ProfileHero
                user={overview.user}
                initials={initials}
                counts={overview.jd_analyses}
                studyPlansCount={overview.study_plans_count}
              />

              {overview.resume ? (
                <ResumeSnapshotCard resume={overview.resume} />
              ) : (
                <NoResumeCard />
              )}

              <div className="grid gap-6 lg:grid-cols-5">
                <section className="lg:col-span-3">
                  <SectionHeader
                    title="Previous JD analyses"
                    count={analyses?.length ?? 0}
                  />
                  <div className="mt-4 space-y-3">
                    {analyses && analyses.length === 0 && (
                      <EmptyState
                        title="No analyses yet"
                        body="Run a JD analysis from the dashboard — it'll show up here."
                        ctaLabel="Go to dashboard"
                        onCta={() => navigate("/dashboard")}
                      />
                    )}
                    {analyses?.map((a, i) => (
                      <AnalysisListItem
                        key={a.id}
                        analysis={a}
                        ordinal={analyses.length - i}
                        onOpen={() =>
                          navigate(`/profile/analyses/${a.id}`)
                        }
                      />
                    ))}
                  </div>
                </section>

                <section className="lg:col-span-2">
                  <SectionHeader
                    title="Study plans"
                    count={plans?.length ?? 0}
                  />
                  <div className="mt-4 space-y-3">
                    {plans && plans.length === 0 && (
                      <EmptyState
                        title="No study plans yet"
                        body="Completed analyses with learning gaps generate a plan automatically."
                      />
                    )}
                    {plans?.map((p) => (
                      <StudyPlanListItem
                        key={p.analysis_id}
                        plan={p}
                        onOpen={() =>
                          navigate(`/profile/analyses/${p.analysis_id}`)
                        }
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
      </main>
    </AppShell>
  );
}

/* ---------- Hero ---------- */

function ProfileHero({
  user,
  initials,
  counts,
  studyPlansCount,
}: {
  user: ProfileOverview["user"];
  initials: string;
  counts: ProfileOverview["jd_analyses"];
  studyPlansCount: number;
}) {
  return (
    <section className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forge-800 text-base font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-forge-900">
              {user.first_name} {user.last_name}
            </h1>
            <p className="truncate text-sm text-forge-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={counts.total} />
          <Stat label="Completed" value={counts.completed} tone="emerald" />
          <Stat label="In progress" value={counts.in_progress} tone="ember" />
          <Stat label="Plans" value={studyPlansCount} tone="forge" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "ember" | "forge";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "ember"
        ? "text-ember-700"
        : tone === "forge"
          ? "text-forge-800"
          : "text-forge-900";
  return (
    <div className="rounded-2xl border border-forge-100 bg-slate-50/60 px-3 py-2.5 text-center">
      <p className={`font-display text-xl font-semibold ${valueClass}`}>
        {value}
      </p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-forge-500">
        {label}
      </p>
    </div>
  );
}

/* ---------- Resume snapshot ---------- */

function ResumeSnapshotCard({
  resume,
}: {
  resume: NonNullable<ProfileOverview["resume"]>;
}) {
  return (
    <section className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        {resume.sufficient ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <CheckIcon />
            Resume verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <InfoIcon />
            Awaiting clarification
          </span>
        )}
        <span className="pill">
          {resume.claimed_skills_count} claimed skill
          {resume.claimed_skills_count === 1 ? "" : "s"}
        </span>
        {resume.weak_skills_count > 0 && (
          <span className="pill border-amber-200 bg-amber-50 text-amber-800">
            {resume.weak_skills_count} weak
          </span>
        )}
        {resume.has_pending_questionnaire && (
          <Link
            to="/dashboard"
            className="pill border-ember-200 bg-ember-50 text-ember-800 hover:bg-ember-100"
          >
            Pending questionnaire →
          </Link>
        )}
        <span className="ml-auto text-xs text-forge-500">
          Updated {formatDate(resume.updated_at)}
        </span>
      </div>

      {resume.summary && (
        <p className="mt-4 text-sm leading-relaxed text-forge-700">
          {resume.summary}
        </p>
      )}
    </section>
  );
}

function NoResumeCard() {
  return (
    <section className="rounded-3xl border border-dashed border-forge-200 bg-white/60 p-6 text-center sm:p-8">
      <p className="font-display text-base font-semibold text-forge-900">
        No resume on file yet
      </p>
      <p className="mt-1 text-sm text-forge-600">
        Upload one from the dashboard to start tracking your skill profile.
      </p>
      <Link to="/dashboard" className="btn-primary mt-5 inline-flex">
        Upload resume
      </Link>
    </section>
  );
}

/* ---------- Sections ---------- */

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-lg font-semibold text-forge-900">
        {title}
      </h2>
      <span className="text-xs font-medium uppercase tracking-wider text-forge-500">
        {count} item{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function AnalysisListItem({
  analysis,
  ordinal,
  onOpen,
}: {
  analysis: ProfileJdAnalysis;
  ordinal: number;
  onOpen: () => void;
}) {
  const pct = analysis.matched_percentage ?? 0;
  const tone = matchTone(pct, analysis.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-2xl border border-forge-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-forge-200 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-forge-500">
            JD #{ordinal}
          </span>
          <StatusBadge status={analysis.status} />
        </div>
        <span className="text-xs text-forge-500">
          {formatDate(analysis.created_at)}
        </span>
      </div>

      {analysis.status !== "failed" ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`font-display text-2xl font-semibold ${tone.text}`}>
              {pct}%
            </span>
            <span className="text-xs font-medium text-forge-500">
              {tone.label}
            </span>
          </div>
          <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-forge-50">
            <div
              className={`h-full rounded-full ${tone.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-forge-500">
            <span>
              {analysis.skills_matched.length} matched
            </span>
            <span>
              {analysis.skills_needed.addons.length +
                analysis.skills_needed.new.length}{" "}
              gaps
            </span>
            {analysis.study_plan && analysis.study_plan.length > 0 && (
              <span>
                {analysis.study_plan.length}-week plan
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-red-700">
          {analysis.error || "Analysis failed."}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end text-xs font-medium text-forge-600 group-hover:text-forge-900">
        View details
        <span className="ml-1 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </button>
  );
}

function StudyPlanListItem({
  plan,
  onOpen,
}: {
  plan: StudyPlanRecord;
  onOpen: () => void;
}) {
  const skills = Array.from(
    new Set(plan.study_plan.map((w) => w.skill).filter(Boolean)),
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-2xl border border-forge-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-forge-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ember-700">
          {plan.study_plan.length}-week plan
        </span>
        <span className="text-xs text-forge-500">
          {formatDate(plan.created_at)}
        </span>
      </div>

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-full border border-forge-100 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-forge-700"
            >
              {s}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="text-[11px] text-forge-500">
              +{skills.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-forge-500">
        <span>
          {plan.skills_needed_addons.length} addon ·{" "}
          {plan.skills_needed_new.length} new
        </span>
        <span className="font-medium text-forge-600 group-hover:text-forge-900">
          Open plan →
        </span>
      </div>
    </button>
  );
}

/* ---------- Helpers ---------- */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: "border-emerald-200 bg-emerald-50 text-emerald-800",
    running: "border-ember-200 bg-ember-50 text-ember-800",
    pending: "border-forge-200 bg-slate-50 text-forge-700",
    failed: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        map[status] ?? "border-forge-100 bg-slate-50 text-forge-700"
      }`}
    >
      {status}
    </span>
  );
}

function matchTone(pct: number, status: string) {
  if (status !== "done") {
    return {
      label: "—",
      text: "text-forge-500",
      bar: "bg-forge-200",
    };
  }
  if (pct >= 80)
    return {
      label: "Strong match",
      text: "text-emerald-700",
      bar: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    };
  if (pct >= 60)
    return {
      label: "Good match",
      text: "text-ember-700",
      bar: "bg-gradient-to-r from-forge-600 to-ember-500",
    };
  if (pct >= 40)
    return {
      label: "Partial match",
      text: "text-amber-700",
      bar: "bg-gradient-to-r from-amber-400 to-amber-500",
    };
  return {
    label: "Weak match",
    text: "text-red-700",
    bar: "bg-gradient-to-r from-red-400 to-red-500",
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function EmptyState({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-forge-200 bg-white/60 p-5 text-center">
      <p className="font-display text-sm font-semibold text-forge-900">
        {title}
      </p>
      <p className="mt-1 text-xs text-forge-600">{body}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="btn-outline mt-3"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
      <div className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
        <div className="space-y-3 lg:col-span-2">
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-100 bg-white p-6 text-center shadow-sm">
      <p className="font-display text-base font-semibold text-forge-900">
        Couldn't load your profile
      </p>
      <p className="mt-1 text-sm text-forge-600">{message}</p>
    </div>
  );
}

/* ---------- Icons ---------- */

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
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
      width="12"
      height="12"
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
