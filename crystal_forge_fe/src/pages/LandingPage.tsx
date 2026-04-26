import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/auth/AuthContext";

const steps = [
  {
    n: "01",
    title: "Define the role",
    body: "Bring the job description. We extract the required skills and the level expected for each.",
  },
  {
    n: "02",
    title: "Bring the resume",
    body: "Drop in the candidate's resume. We line up claimed skills against the role.",
  },
  {
    n: "03",
    title: "Assess conversationally",
    body: "A guided conversation probes each skill — depth, edge cases, applied experience.",
  },
  {
    n: "04",
    title: "Get the learning plan",
    body: "A personalised plan of adjacent skills with curated resources and time estimates.",
  },
];

const pillars = [
  {
    title: "Beyond the resume",
    body: "Resumes show what people claim. Conversational probing reveals real depth.",
  },
  {
    title: "Honest gap analysis",
    body: "Compare actual proficiency to the role's requirements — not what's listed on paper.",
  },
  {
    title: "Realistic upskilling",
    body: "Plans focus on adjacent skills the candidate can actually acquire, with time estimates.",
  },
];

export default function LandingPage() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <header className="border-b border-forge-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo withWordmark size={28} />
          </Link>
          <nav className="flex items-center gap-2">
            {isAuthed ? (
              <Link to="/dashboard" className="btn-primary">
                Open workspace
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-10%] h-[480px] w-[480px] rounded-full bg-forge-100 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 left-[-10%] h-[360px] w-[360px] rounded-full bg-ember-100 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="pill-ember">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
              AI-Powered Skill Assessment
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-forge-900 sm:text-5xl md:text-6xl">
              A resume tells you what they{" "}
              <span className="text-forge-500">claim</span> to know.
              <br className="hidden sm:block" />{" "}
              We find out what they{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-ember-700">actually</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-ember-200/70"
                />
              </span>{" "}
              know.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-forge-600 sm:text-lg">
              Crystal Forge takes a job description and a candidate resume,
              conversationally assesses real proficiency on each required
              skill, identifies the gaps, and generates a personalised
              learning plan — focused on adjacent skills the candidate can
              realistically acquire, with curated resources and time
              estimates.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isAuthed ? (
                <Link to="/dashboard" className="btn-primary px-6 py-3 text-base">
                  Open workspace
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary px-6 py-3 text-base"
                  >
                    Get started — it's free
                  </Link>
                  <Link
                    to="/login"
                    className="btn-outline px-6 py-3 text-base"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-forge-500">
              No credit card required · Built for hiring teams and learners.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-forge-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-ember-700">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forge-900 sm:text-4xl">
              Four steps from raw inputs to a plan you can act on.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-forge-600 sm:text-base">
              No quizzes. No multiple choice. A guided conversation that
              measures real proficiency, then turns the gaps into curated next
              steps.
            </p>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li
                key={s.n}
                className="relative flex flex-col gap-3 rounded-2xl border border-forge-100 bg-slate-50/50 p-5"
              >
                <span className="font-display text-sm font-semibold text-ember-700">
                  {s.n}
                </span>
                <h3 className="font-display text-base font-semibold text-forge-900">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-forge-600">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-forge-100">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
            {pillars.map((p) => (
              <div key={p.title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember-50 text-ember-700">
                  <Spark />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-forge-900">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-forge-600">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-forge-100">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-forge-radial p-10 text-center text-white sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full bg-ember-500/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-forge-400/15 blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to forge a plan?
              </h2>
              <p className="mt-3 text-sm text-forge-200 sm:text-base">
                Sign up, bring a job description and a resume, and let
                Crystal Forge do the rest.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isAuthed ? (
                  <Link
                    to="/dashboard"
                    className="btn-accent px-6 py-3 text-base"
                  >
                    Open workspace
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="btn-accent px-6 py-3 text-base"
                    >
                      Create your account
                    </Link>
                    <Link
                      to="/login"
                      className="btn px-6 py-3 text-base text-white hover:bg-white/10"
                    >
                      I already have one
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forge-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="text-sm font-semibold text-forge-900">
              Crystal Forge
            </span>
          </div>
          <p className="text-xs text-forge-500">
            © {new Date().getFullYear()} Crystal Forge. Turning raw potential
            into a refined plan.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Spark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M4.2 4.2l2.1 2.1" />
      <path d="M17.7 17.7l2.1 2.1" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="M4.2 19.8l2.1-2.1" />
      <path d="M17.7 6.3l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
