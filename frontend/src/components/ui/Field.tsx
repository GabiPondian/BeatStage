import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";

interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = ""
}: FieldProps) {
  return (
    <div className={`field ${error ? "field--invalid" : ""} ${className}`.trim()}>
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="field__required">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  invalid?: boolean;
}

export function Input({ icon, invalid, className = "", ...rest }: InputProps) {
  return (
    <div className={`input-wrap ${invalid ? "is-invalid" : ""}`.trim()}>
      {icon ? <span className="input-wrap__icon">{icon}</span> : null}
      <input
        className={`input ${icon ? "input--with-icon" : ""} ${className}`.trim()}
        {...rest}
      />
    </div>
  );
}

export function PasswordInput({
  icon,
  invalid,
  className = "",
  ...rest
}: InputProps) {
  return (
    <div className={`input-wrap ${invalid ? "is-invalid" : ""}`.trim()}>
      {icon ? <span className="input-wrap__icon">{icon}</span> : null}
      <input
        type="password"
        className={`input ${icon ? "input--with-icon" : ""} ${className}`.trim()}
        {...rest}
      />
    </div>
  );
}

export function Select({
  className = "",
  children,
  invalid,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className={`select-wrap ${invalid ? "is-invalid" : ""}`.trim()}>
      <select className={`select ${className}`.trim()} {...rest}>
        {children}
      </select>
      <span className="select-wrap__chevron" aria-hidden="true">
        ▾
      </span>
    </div>
  );
}

export function Textarea({
  className = "",
  invalid,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={`textarea ${invalid ? "is-invalid" : ""} ${className}`.trim()}
      {...rest}
    />
  );
}

export function useFieldId(provided?: string): string {
  const generated = useId();
  return provided ?? generated;
}
