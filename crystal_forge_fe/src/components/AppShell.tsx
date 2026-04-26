import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/auth/AuthContext";

type BackLink = { to: string; label: string };

export function AppShell({
  children,
  back,
  maxWidth = "max-w-5xl",
  contentClassName = "",
}: {
  children: ReactNode;
  back?: BackLink;
  maxWidth?: string;
  contentClassName?: string;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const onProfile = location.pathname.startsWith("/profile");

  const initials = (user?.first_name?.[0] ?? user?.username?.[0] ?? "?")
    .toUpperCase();

  return (
    <div className="relative min-h-full overflow-x-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-gradient-to-b from-forge-50/80 via-white to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-10%] -z-0 h-[420px] w-[420px] rounded-full bg-forge-100 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 left-[-12%] -z-0 h-[360px] w-[360px] rounded-full bg-ember-100/70 blur-3xl"
      />

      <header className="sticky top-0 z-30 border-b border-forge-100/70 bg-white/75 backdrop-blur-md">
        <div
          className={`mx-auto flex items-center justify-between px-4 py-3.5 sm:px-6 ${maxWidth}`}
        >
          <div className="flex items-center gap-4">
            <Logo withWordmark size={28} />
            {back && (
              <Link
                to={back.to}
                className="hidden items-center gap-1 text-sm font-medium text-forge-600 hover:text-forge-900 sm:inline-flex"
              >
                <ArrowLeft />
                {back.label}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <Link
                to="/profile"
                aria-current={onProfile ? "page" : undefined}
                className={`hidden items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors sm:flex ${
                  onProfile
                    ? "bg-forge-50 ring-1 ring-forge-100"
                    : "hover:bg-forge-50"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forge-800 text-xs font-semibold text-white">
                  {initials}
                </span>
                <div className="text-right leading-tight">
                  <p className="text-sm font-medium text-forge-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="max-w-[160px] truncate text-xs text-forge-500">
                    {user.email}
                  </p>
                </div>
              </Link>
            )}
            <Link
              to="/profile"
              aria-current={onProfile ? "page" : undefined}
              className={`btn-ghost sm:hidden ${onProfile ? "bg-forge-50" : ""}`}
            >
              Profile
            </Link>
            <button type="button" className="btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div
        className={`relative z-10 mx-auto px-4 sm:px-6 ${maxWidth} ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

function ArrowLeft() {
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
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
