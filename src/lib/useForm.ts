import { useState, type Dispatch, type SetStateAction } from "react";

export type FieldErrors<V> = Partial<Record<keyof V, string>>;

export interface Form<V> {
  values: V;
  setValues: Dispatch<SetStateAction<V>>;
  errors: FieldErrors<V>;
  isValid: boolean;
  // Show a field's error only after the field was touched or a submit was tried.
  showError: (key: keyof V & string) => string | undefined;
  touch: (key: keyof V & string) => void;
  submitting: boolean;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  formError: string | undefined;
  setFormError: (message: string | undefined) => void;
  handleSubmit: (onValid: (values: V) => void) => void;
}

// Small controlled-form helper. `validate` is a pure function of the current
// values (errors are derived every render — no effect, no stale error state).
// Field value updates are done by the caller via setValues, where V is concrete
// (so spreads are type-safe); this hook only owns touched/submit/error state.
export function useForm<V>(initial: V, validate: (values: V) => FieldErrors<V>): Form<V> {
  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  const touch = (key: keyof V & string) => setTouched((prev) => new Set(prev).add(key));

  const showError = (key: keyof V & string) =>
    submitAttempted || touched.has(key) ? errors[key] : undefined;

  const handleSubmit = (onValid: (values: V) => void) => {
    setSubmitAttempted(true);
    if (isValid) onValid(values);
  };

  return {
    values,
    setValues,
    errors,
    isValid,
    showError,
    touch,
    submitting,
    setSubmitting,
    formError,
    setFormError,
    handleSubmit,
  };
}
