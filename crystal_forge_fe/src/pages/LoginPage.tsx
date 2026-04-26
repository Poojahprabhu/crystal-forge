import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/lib/apiClient";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

type LocationState = { from?: { pathname?: string } } | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const redirectTo =
    (location.state as LocationState)?.from?.pathname ?? "/dashboard";

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setSubmitError(extractErrorMessage(err, "Invalid credentials"));
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue forging your career path."
      footer={
        <>
          New to Crystal Forge?{" "}
          <Link
            to="/register"
            className="font-semibold text-forge-800 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {submitError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            {submitError}
          </div>
        )}
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
