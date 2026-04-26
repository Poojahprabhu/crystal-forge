import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { extractErrorMessage } from "@/lib/apiClient";
import { profileApi, type ProfileJdAnalysis } from "@/lib/profileApi";
import { JdAnalysisResultBlock } from "@/components/JdAnalysisResult";
import { AppShell } from "@/components/AppShell";

export default function JdAnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<ProfileJdAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJd, setShowJd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError("Invalid analysis id.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await profileApi.getJdAnalysis(numericId);
        if (cancelled) return;
        setAnalysis(data);
      } catch (e) {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          setError("Analysis not found.");
        } else {
          setError(extractErrorMessage(e, "Couldn't load this analysis."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AppShell back={{ to: "/profile", label: "Profile" }} maxWidth="max-w-3xl">
      <main className="flex-1 pb-16 pt-6 sm:pt-8">
        {loading && (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
            <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-100 bg-white p-6 text-center shadow-sm">
            <p className="font-display text-base font-semibold text-forge-900">
              {error}
            </p>
            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() => navigate("/profile")}
            >
              Back to profile
            </button>
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-forge-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="font-display text-xl font-semibold tracking-tight text-forge-900">
                  JD analysis
                </h1>
                <span className="text-xs text-forge-500">
                  {formatDateTime(analysis.created_at)}
                </span>
              </div>
              {analysis.jd_text && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowJd((v) => !v)}
                    className="text-xs font-medium text-forge-600 underline-offset-2 hover:text-forge-900 hover:underline"
                  >
                    {showJd ? "Hide JD text" : "Show JD text"}
                  </button>
                  {showJd && (
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-forge-100 bg-slate-50 p-4 text-xs leading-relaxed text-forge-700">
                      {analysis.jd_text}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <JdAnalysisResultBlock analysis={analysis} label="Result" />
          </div>
        )}
      </main>
    </AppShell>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
