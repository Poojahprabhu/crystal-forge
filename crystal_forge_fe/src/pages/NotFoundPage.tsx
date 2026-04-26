import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-ember-600">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-forge-900">
          Off the path
        </h1>
        <p className="mt-2 text-sm text-forge-600">
          That page isn't part of the workflow yet.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    </div>
  );
}
