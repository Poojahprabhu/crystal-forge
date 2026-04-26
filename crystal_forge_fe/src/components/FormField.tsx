import { forwardRef, type InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div>
        <label htmlFor={fieldId} className="label">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`input ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""} ${className ?? ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${fieldId}-error`} className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";
