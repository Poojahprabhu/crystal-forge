import type {
  JdAnalysis,
  Resource,
  SkillNeed,
  StudyPlanWeek,
} from "@/lib/matcherApi";

export function JdAnalysisResultBlock({
  analysis,
  index,
  label,
}: {
  analysis: JdAnalysis;
  index?: number;
  label?: string;
}) {
  const heading =
    label ?? (typeof index === "number" ? `Job description ${index + 1}` : "");

  if (analysis.status === "failed") {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            <AlertIcon />
            Analysis failed
          </span>
          {heading && (
            <span className="text-xs text-forge-500">{heading}</span>
          )}
        </div>
        <p className="mt-3 text-sm text-forge-700">
          {analysis.error || "Something went wrong analyzing this JD."}
        </p>
      </div>
    );
  }

  const pct = analysis.matched_percentage ?? 0;
  const tier =
    pct >= 80
      ? { label: "Strong match", tone: "emerald" }
      : pct >= 60
        ? { label: "Good match", tone: "ember" }
        : pct >= 40
          ? { label: "Partial match", tone: "amber" }
          : { label: "Weak match", tone: "red" };

  const toneClass: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    ember: "border-ember-200 bg-ember-50 text-ember-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass[tier.tone]}`}
          >
            {tier.label}
          </span>
          {heading && (
            <span className="text-xs font-medium uppercase tracking-wide text-forge-500">
              {heading}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-semibold text-forge-900">
            {pct}
          </span>
          <span className="text-sm font-medium text-forge-500">% match</span>
        </div>
      </div>

      <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-forge-50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-forge-600 to-ember-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>

      {analysis.feedback && (
        <p className="mt-5 text-sm leading-relaxed text-forge-700">
          {analysis.feedback}
        </p>
      )}

      {analysis.skills_matched.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-forge-600">
            Skills matched
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.skills_matched.map((s) => (
              <span
                key={s}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {(analysis.skills_needed.addons.length > 0 ||
        analysis.skills_needed.new.length > 0) && (
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-forge-600">
            Skills to acquire
          </h4>
          <p className="mt-1 text-xs text-forge-500">
            Adjacent upskills extend what's already there. New skills are gaps
            without a related background.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {analysis.skills_needed.addons.map((s) => (
              <SkillNeedRow key={`addon-${s.skill}`} skill={s} category="addon" />
            ))}
            {analysis.skills_needed.new.map((s) => (
              <SkillNeedRow key={`new-${s.skill}`} skill={s} category="new" />
            ))}
          </ul>
        </div>
      )}

      {analysis.study_plan && analysis.study_plan.length > 0 && (
        <StudyPlanSection plan={analysis.study_plan} />
      )}
    </div>
  );
}

export function StudyPlanSection({ plan }: { plan: StudyPlanWeek[] }) {
  const sorted = [...plan].sort((a, b) => a.week - b.week);
  const totalResources = sorted.reduce((n, w) => n + w.resources.length, 0);

  return (
    <div className="mt-7 rounded-2xl border border-forge-100 bg-slate-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-forge-600">
            Study plan
          </h4>
          <p className="mt-1 text-xs text-forge-500">
            One skill per week, ordered to build on what you already know.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-forge-500">
          <span>
            {sorted.length} week{sorted.length === 1 ? "" : "s"}
          </span>
          <span aria-hidden>·</span>
          <span>
            {totalResources} resource{totalResources === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <ol className="mt-5 space-y-4">
        {sorted.map((w, i) => (
          <li
            key={`${w.week}-${i}`}
            className="relative rounded-2xl border border-forge-100 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 min-w-[3rem] items-center justify-center rounded-full bg-forge-800 px-2 text-xs font-semibold text-white">
                Wk {w.week}
              </span>
              <span className="text-sm font-semibold text-forge-900">
                {w.skill}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                  w.category === "addon"
                    ? "border-ember-200 bg-ember-50 text-ember-800"
                    : w.category === "new"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-forge-100 bg-slate-50 text-forge-700"
                }`}
              >
                {w.category}
              </span>
            </div>

            {w.goals && (
              <p className="mt-2.5 text-sm leading-relaxed text-forge-700">
                {w.goals}
              </p>
            )}

            {w.resources.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-forge-500">
                  Recommended resources
                </p>
                <ul className="mt-2 space-y-2">
                  {w.resources.map((r, j) => (
                    <ResourceCard key={`${r.url}-${j}`} resource={r} />
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SkillNeedRow({
  skill,
  category,
}: {
  skill: SkillNeed;
  category: "addon" | "new";
}) {
  const wrapperClass =
    category === "addon"
      ? "border-ember-100 bg-ember-50/40"
      : "border-amber-100 bg-amber-50/40";
  const badgeClass =
    category === "addon"
      ? "border-ember-200 bg-ember-50 text-ember-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <li className={`rounded-2xl border px-4 py-3 ${wrapperClass}`}>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-forge-900">{skill.skill}</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeClass}`}
        >
          {category === "addon" ? "addon" : "new"}
        </span>
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-forge-600">
        {skill.reason}
      </p>
    </li>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const host = (() => {
    try {
      return new URL(resource.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <li className="rounded-xl border border-forge-100 bg-slate-50/60 p-3">
      <a
        href={resource.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-start gap-2"
      >
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-forge-600 ring-1 ring-forge-100 group-hover:text-forge-800">
          <ExternalIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-forge-900 group-hover:underline">
            {resource.title || resource.url}
          </p>
          {host && (
            <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-forge-500">
              {host}
            </p>
          )}
          {resource.snippet && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-forge-600">
              {resource.snippet}
            </p>
          )}
        </div>
      </a>
    </li>
  );
}

function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function ExternalIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
