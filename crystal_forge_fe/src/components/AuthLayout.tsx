import type { ReactNode } from "react";
import { Logo } from "./Logo";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const storyPoints = [
  {
    title: "Beyond the resume",
    body: "We probe each required skill conversationally — not with quizzes, but the kind of follow-ups that reveal real depth.",
  },
  {
    title: "Honest gap analysis",
    body: "Compare actual proficiency against the role's requirements, not what's listed on paper.",
  },
  {
    title: "A plan you can act on",
    body: "Adjacent skills you can realistically acquire — with curated resources and time estimates.",
  },
];

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-full grid lg:grid-cols-2">
      {/* Marketing / story panel */}
      <aside className="relative hidden overflow-hidden bg-forge-radial p-10 text-white lg:flex lg:flex-col lg:justify-between">
        {/* decorative facets */}
        <div
          aria-hidden
          className="absolute inset-0 bg-facet opacity-60 mix-blend-screen"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-ember-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-10 h-72 w-72 rounded-full bg-forge-400/10 blur-3xl"
        />

        <div className="relative">
          <Logo withWordmark tone="light" size={36} />
        </div>

        <div className="relative max-w-md">
          <span className="pill border-white/15 bg-white/5 text-ember-200">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-400" />
            AI-powered skill assessment
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-white">
            A resume tells you what they{" "}
            <span className="text-ember-300">claim</span> to know.
            <br />
            We find out what they{" "}
            <span className="text-ember-300">actually</span> know.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-forge-200">
            Crystal Forge takes a job description and a candidate resume,
            conversationally assesses real proficiency on each required skill,
            and forges a personalised learning plan for the gaps.
          </p>

          <ul className="mt-8 space-y-5">
            {storyPoints.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-ember-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-forge-200">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-forge-300">
          © {new Date().getFullYear()} Crystal Forge — turning raw potential
          into a refined plan.
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo withWordmark size={28} />
          </div>
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-forge-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-forge-600">{subtitle}</p>
            )}
          </div>
          <div className="card">{children}</div>
          {footer && (
            <div className="mt-5 text-center text-sm text-forge-600">
              {footer}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
