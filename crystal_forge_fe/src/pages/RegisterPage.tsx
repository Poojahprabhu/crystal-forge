import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/lib/apiClient";

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setSubmitError(null);
    try {
      await registerUser(values);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setSubmitError(extractErrorMessage(err, "Could not create account"));
    }
  };

  return (
    <AuthLayout
      title="Forge your account"
      subtitle="Set up Crystal Forge — then bring in a job description and resume to begin."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-forge-800 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <FormField
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
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
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
