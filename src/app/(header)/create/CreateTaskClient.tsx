"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";

const MAX_REFERENCES = 5;

type ReferenceType = "link" | "image";

interface ReferenceItem {
  type: ReferenceType;
  url: string;
}

interface TaskFormState {
  title: string;
  categories: string[];
  shortDescription: string;
  needDetails: string;
  technicalRequirements: string;
  references: ReferenceItem[];
  price: string;
}

const INITIAL_STATE: TaskFormState = {
  title: "",
  categories: [],
  shortDescription: "",
  needDetails: "",
  technicalRequirements: "",
  references: [],
  price: "",
};

const DRAFT_STORAGE_KEY = "create_task_draft_v1";
const supabase = createClient();

type PaymentStatus = "success" | "cancel" | null;

interface CreateTaskClientProps {
  paymentStatus: PaymentStatus;
}

export default function CreateTaskClient({ paymentStatus }: CreateTaskClientProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<TaskFormState>(INITIAL_STATE);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  type StepKey = "details" | "requirements" | "price" | "review";

  const STEPS: { key: StepKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "requirements", label: "Requirements" },
    { key: "price", label: "Price" },
    { key: "review", label: "Review" },
  ];

  const currentStep = STEPS[stepIndex];

  const priceValue = useMemo(() => {
    const n = Number(form.price.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(n)) return 0;
    return n;
  }, [form.price]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: Partial<TaskFormState>;
        stepIndex?: number;
      } | null;
      if (!parsed || !parsed.form) return;
      setForm((prev) => ({ ...prev, ...parsed.form }));
      if (
        typeof parsed.stepIndex === "number" &&
        parsed.stepIndex >= 0 &&
        parsed.stepIndex < STEPS.length
      ) {
        setStepIndex(parsed.stepIndex);
      }
    } catch {
      // ignore draft load errors
    }
  }, []);

  const saveDraft = () => {
    if (typeof window === "undefined") return;
    try {
      const payload = JSON.stringify({
        form,
        stepIndex,
      });
      window.localStorage.setItem(DRAFT_STORAGE_KEY, payload);
    } catch {
      // ignore draft save errors
    }
  };

  const basicErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) {
      errors.title = "Title is required.";
    } else if (form.title.trim().length > 80) {
      errors.title = "Title must be at most 80 characters.";
    }
    if (!form.shortDescription.trim()) {
      errors.shortDescription = "Short description is required.";
    }
    return errors;
  }, [form.title, form.shortDescription]);

  const priceError = useMemo(() => {
    if (!form.price.trim()) return "";
    if (priceValue < 5) {
      return "Minimum price is $5.";
    }
    return "";
  }, [form.price, priceValue]);

  const canGoNextFromStep = (index: number) => {
    if (index === 0) {
      return Object.keys(basicErrors).length === 0;
    }
    if (index === 2) {
      if (!form.price.trim()) return false;
      if (priceValue < 5) return false;
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!canGoNextFromStep(stepIndex)) {
      setTouched((prev) => ({ ...prev, step: true }));
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = (index: number) => {
    if (index <= stepIndex) {
      setStepIndex(index);
    }
  };

  const handleChange = (field: keyof TaskFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (category: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(category);
      if (exists) {
        return {
          ...prev,
          categories: prev.categories.filter((c) => c !== category),
        };
      }
      if (prev.categories.length >= 3) {
        return prev;
      }
      return { ...prev, categories: [...prev.categories, category] };
    });
  };

  const addReference = () => {
    setForm((prev) => {
      if (prev.references.length >= MAX_REFERENCES) {
        return prev;
      }
      return {
        ...prev,
        references: [...prev.references, { type: "image", url: "" }],
      };
    });
  };

  const updateReference = (
    index: number,
    field: keyof ReferenceItem,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      references: prev.references.map((ref, i) =>
        i === index ? { ...ref, [field]: value } : ref,
      ),
    }));
  };

  const removeReference = (index: number) => {
    setForm((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!canGoNextFromStep(0) || !canGoNextFromStep(2)) {
      setStepIndex(0);
      setTouched({ step: true });
      return;
    }
    try {
      setIsSubmitting(true);
      setSubmitSuccess(false);
      setSubmitError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        saveDraft();
        setAuthError(null);
        setAuthMode("login");
        setAuthModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          categories: form.categories,
          shortDescription: form.shortDescription,
          needDetails: form.needDetails,
          technicalRequirements: form.technicalRequirements,
          references: form.references,
          price: priceValue,
        }),
      });

      let json: any = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      if (response.status === 401) {
        saveDraft();
        setAuthError(null);
        setAuthMode("login");
        setAuthModalOpen(true);
        setIsSubmitting(false);
        return;
      }
      if (!response.ok) {
        const message =
          (json && (json.error as string)) ||
          "Something went wrong while posting your task. Please try again.";
        setSubmitError(message);
        setIsSubmitting(false);
        return;
      }

      const taskId = json?.task?.id as string | number | undefined;
      if (!taskId) {
        setSubmitError(
          "Your task was created but the response was missing an id. Please check your task list on your profile.",
        );
        setIsSubmitting(false);
        return;
      }

      try {
        const checkoutResponse = await fetch("/api/tasks/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: priceValue,
            taskId,
            source: "create" as const,
          }),
        });

        let checkoutJson: any = null;
        try {
          checkoutJson = await checkoutResponse.json();
        } catch {
          checkoutJson = null;
        }

        if (!checkoutResponse.ok || !checkoutJson?.url) {
          setSubmitError(
            "Your task was created but there was an issue starting checkout. Please try again from your task page.",
          );
          router.push(`/listing/${taskId}`);
          return;
        }

        setSubmitSuccess(true);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        }

        window.location.href = checkoutJson.url as string;
      } catch (error) {
        setSubmitError(
          "Your task was created but we couldn't start checkout. Please try again from your task page.",
        );
        router.push(`/listing/${taskId}`);
      }
    } catch (error) {
      setSubmitError(
        "Something went wrong while posting your task. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid credentials")
        ) {
          setAuthError("Invalid email or password");
        } else {
          setAuthError("An error occurred. Please try again.");
        }
        setAuthLoading(false);
        return;
      }
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      setAuthError("An error occurred. Please try again.");
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    if (signupPassword !== signupConfirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }
    if (signupPassword.length < 8) {
      setAuthError("Password must be at least 8 characters");
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            display_name: signupDisplayName,
          },
        },
      });
      if (error) {
        if (
          error.message.includes("already registered") ||
          error.message.includes("User already exists")
        ) {
          setAuthError("Email already in use");
        } else if (
          error.message.includes("Invalid email") ||
          error.message.includes("invalid email")
        ) {
          setAuthError("Please enter a valid email address");
        } else if (error.message.includes("rate limit exceeded")) {
          setAuthError("Too many requests. Please try again later.");
        } else {
          setAuthError("An error occurred. Please try again.");
        }
        setAuthLoading(false);
        return;
      }
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      setAuthError("An error occurred. Please try again.");
      setAuthLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep.key) {
      case "details":
        return (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                Task Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                maxLength={80}
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900/80 dark:focus:border-indigo-400"
                aria-describedby="title-help title-error"
                required
              />
              <p
                id="title-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                A clear, concise title that collaborators will see first.
              </p>
              {touched.title && basicErrors.title && (
                <p
                  id="title-error"
                  className="mt-1 text-xs text-red-500"
                >
                  {basicErrors.title}
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Category Tags
              </span>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Choose up to three tags that best describe this task.
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => {
                  const active = form.categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      style={{
                        borderRadius: '9999px',
                        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: active ? 'white' : 'var(--text-secondary)',
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        transition: 'background 0.2s, border 0.2s, color 0.2s',
                        boxShadow: active ? '0 1px 2px rgba(99,102,241,0.08)' : undefined,
                        cursor: 'pointer',
                        outline: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      onMouseOver={e => {
                        if (active) {
                          e.currentTarget.style.background = 'var(--accent-hover)';
                        } else {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                          e.currentTarget.style.background = 'var(--bg-muted)';
                          e.currentTarget.style.color = 'var(--accent-primary)';
                        }
                      }}
                      onMouseOut={e => {
                        if (active) {
                          e.currentTarget.style.background = 'var(--accent-primary)';
                        } else {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                      aria-pressed={active}
                    >
                      <span style={{ maxWidth: '9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline' }}>{category}</span>
                      {active && (
                        <svg
                          className="ml-1 h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 10.5L8.5 14L15 6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="shortDescription"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                Short description
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                rows={3}
                value={form.shortDescription}
                onChange={(e) => handleChange("shortDescription", e.target.value)}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, shortDescription: true }))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900/80 dark:focus:border-indigo-400"
                aria-describedby="shortDescription-help shortDescription-error"
                required
              />
              <p
                id="shortDescription-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                This appears in feeds and search results. Keep it brief and inviting.
              </p>
              {touched.shortDescription && basicErrors.shortDescription && (
                <p
                  id="shortDescription-error"
                  className="mt-1 text-xs text-red-500"
                >
                  {basicErrors.shortDescription}
                </p>
              )}
            </div>
          </div>
        );
      case "requirements":
        return (
          <div className="space-y-8">
            <div>
              <label
                htmlFor="needDetails"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                What do you need? (Optional)
              </label>
              <textarea
                id="needDetails"
                name="needDetails"
                rows={5}
                value={form.needDetails}
                onChange={(e) => handleChange("needDetails", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900/80 dark:focus:border-indigo-400"
                aria-describedby="needDetails-help"
              />
              <p
                id="needDetails-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                Describe the task in plain language. What should the collaborator deliver?
              </p>
            </div>

            <div>
              <label
                htmlFor="technicalRequirements"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                Technical Requirements (Optional)
              </label>
              <textarea
                id="technicalRequirements"
                name="technicalRequirements"
                rows={4}
                value={form.technicalRequirements}
                onChange={(e) => handleChange("technicalRequirements", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900/80 dark:focus:border-indigo-400"
                aria-describedby="technicalRequirements-help"
              />
              <p
                id="technicalRequirements-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                File types, sizes, formats, engines, tools, or any non-negotiable constraints.
              </p>
            </div>

            <div>
              <label
                htmlFor="references"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                References (optional)
              </label>
              <div className="mt-2 space-y-3" aria-describedby="references-help">
                {form.references.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add links to docs, examples, or reference images for this task.
                  </p>
                )}

                {form.references.map((reference, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/60 p-3 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-900/70"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={reference.type}
                        onChange={(e) =>
                          updateReference(index, "type", e.target.value as ReferenceType)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-indigo-400"
                      >
                        <option value="image">Image (URL to image)</option>
                        <option value="link">Link</option>
                      </select>
                      <input
                        id={`reference-url-${index}`}
                        name={`reference-url-${index}`}
                        type="url"
                        inputMode="url"
                        value={reference.url}
                        onChange={(e) => updateReference(index, "url", e.target.value)}
                        placeholder={
                          reference.type === "image"
                            ? "https://... (link to image)"
                            : "https://... (link to docs, drive, etc.)"
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 shadow-sm outline-none ring-0 transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReference(index)}
                      className="self-start text-[11px] font-medium text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addReference}
                  disabled={form.references.length >= MAX_REFERENCES}
                  className="inline-flex items-center rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                >
                  <span className="mr-1 text-base leading-none">+</span>
                  {form.references.length >= MAX_REFERENCES
                    ? "Maximum of 5 references reached"
                    : "Add reference"}
                </button>
              </div>
              <p
                id="references-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                For image references, upload your image to a service like Google
                Drive, make it shareable, and paste the image link here. Image
                references are stored as links, not file uploads.
              </p>
            </div>
          </div>
        );
      case "price":
        return (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                Payout for Completion
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-white/80 px-3 py-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900/80 dark:focus-within:border-indigo-400">
                <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min={5}
                  step={1}
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, price: true }))}
                  className="none w-full border-none rounded-sm bg-transparent text-sm outline-none ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-describedby="price-help price-error"
                  required
                />
              </div>
              <p
                id="price-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                Minimum $5
              </p>
              {touched.price && priceError && (
                <p
                  id="price-error"
                  className="mt-1 text-xs text-red-500"
                >
                  {priceError}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-100 bg-slate-50 px-4 py-3 text-sm text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
              <p className="font-medium">
                You will pay <span className="text-indigo-600 dark:text-indigo-300">${""}
                  {priceValue > 0 ? priceValue.toFixed(2) : "0.00"}
                </span>{" "}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Funds are held securely until you accept a submission.
              </p>
            </div>
          </div>
        );
      case "review":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                    {form.title || "Untitled task"}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {form.shortDescription
                      ? form.shortDescription.length > 140
                        ? `${form.shortDescription.slice(0, 140)}...`
                        : form.shortDescription
                      : "This is how your task will appear in the marketplace."}
                  </p>
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                  ${priceValue > 0 ? priceValue.toFixed(2) : "0.00"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {form.categories.length > 0 ? (
                  form.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {category}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    No categories selected
                  </span>
                )}
              </div>

              {(form.needDetails || form.technicalRequirements || form.references.length > 0) && (
                <div className="mt-4 grid gap-3 text-xs text-gray-700 dark:text-gray-200 md:grid-cols-2">
                  {form.needDetails && (
                    <div>
                      <p className="mb-1 font-semibold text-gray-900 dark:text-gray-50">
                        What you need
                      </p>
                      <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                        {form.needDetails}
                      </p>
                    </div>
                  )}
                  {form.technicalRequirements && (
                    <div>
                      <p className="mb-1 font-semibold text-gray-900 dark:text-gray-50">
                        Technical requirements
                      </p>
                      <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                        {form.technicalRequirements}
                      </p>
                    </div>
                  )}
                  {form.references.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="mb-1 font-semibold text-gray-900 dark:text-gray-50">
                        References
                      </p>
                      <ul className="space-y-1 text-[11px] leading-relaxed">
                        {form.references.map((reference, index) => (
                          <li
                            key={index}
                            className="break-words text-indigo-600 dark:text-indigo-300"
                          >
                            <span className="mr-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {reference.type === "image" ? "Image" : "Link"}
                            </span>
                            {reference.url}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-800 shadow-sm dark:border-red-900/50 dark:bg-red-900/40 dark:text-red-100">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-900/40 dark:text-emerald-100">
                Your task has been posted successfully.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--bg-primary)]/40 px-4 py-8 text-sm text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {paymentStatus && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs shadow-sm ${
              paymentStatus === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/40 dark:text-emerald-100"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/40 dark:text-red-100"
            }`}
          >
            {paymentStatus === "success"
              ? "Your Stripe payment completed. Your task will update once payment is confirmed."
              : "Stripe checkout was cancelled. You can fund this task later from its listing page."}
          </div>
        )}

        <nav
          aria-label="Task creation progress"
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-3 shadow-sm backdrop-blur-sm"
        >
          <ol className="flex flex-col gap-2 text-xs font-medium text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === stepIndex;
              const isComplete = index < stepIndex;
              const isClickable = index <= stepIndex;
              return (
                <li
                  key={step.key}
                  className="flex flex-1 items-center gap-2 sm:gap-3"
                >
                  <button
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 uncolored none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] ${
                      isClickable ? "cursor-pointer" : "cursor-default opacity-70"
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition ${
                        isActive
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm"
                          : isComplete
                          ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                          : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                      }`}
                      aria-hidden="true"
                    >
                      {isComplete ? (
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M5 10.5L8.5 14L15 6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-[11px] uppercase tracking-wide ${
                          isActive
                            ? "text-[var(--accent-primary)]"
                            : isComplete
                            ? "text-[var(--success)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className="hidden flex-1 items-center sm:flex">
                      <div
                        className={`h-px w-full rounded-full transition ${
                          index < stepIndex
                            ? "bg-[var(--success)]/80"
                            : "bg-[var(--border-color)]"
                        }`}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-md backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90">
          <div
            className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-50/40 via-transparent to-sky-50/40 dark:from-indigo-950/40 dark:via-transparent dark:to-sky-950/40"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6">
            <header className="space-y-1">
              <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                Create a new task
              </h1>
            </header>

            <div
              key={currentStep.key}
              className="animate-[fadeIn_160ms_ease-out]"
            >
              {renderStep()}
            </div>

            <footer className="mt-2 flex flex-col gap-3 border-t border-gray-100 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div className="text-[11px] text-gray-500 dark:text-gray-500">
                Step {stepIndex + 1} of {STEPS.length}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={stepIndex === 0 || isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                >
                  Back
                </button>

                {stepIndex < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={
                      isSubmitting ||
                      (stepIndex === 0 && Object.keys(basicErrors).length > 0) ||
                      (stepIndex === 2 && (!form.price.trim() || priceValue < 5))
                    }
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                      borderRadius: '0.75rem',
                      padding: '0.375rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      opacity: isSubmitting || (stepIndex === 0 && Object.keys(basicErrors).length > 0) || (stepIndex === 2 && (!form.price.trim() || priceValue < 5)) ? 0.6 : 1,
                      cursor: isSubmitting || (stepIndex === 0 && Object.keys(basicErrors).length > 0) || (stepIndex === 2 && (!form.price.trim() || priceValue < 5)) ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                      borderRadius: '0.75rem',
                      padding: '0.375rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                  >
                    {isSubmitting ? "Posting..." : "Post & Pay"}
                  </button>
                )}
              </div>
            </footer>
          </div>
        </section>
      </div>

      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="w-full max-w-md rounded-2xl border bg-white/95 p-8 shadow-md backdrop-blur-sm card"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div
              className="mb-6 text-center"
              aria-label="Task marketplace logo"
            >
              <span className="inline-flex items-baseline gap-1.5 text-xl font-bold tracking-tight title-font">
                <span>{process.env.NEXT_PUBLIC_SITE_NAME}</span>
              </span>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] body-font">
                {process.env.NEXT_PUBLIC_SITE_SLOGAN}
              </p>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold title-font">
                Sign in to continue
              </h2>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="text-xs body-font text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-[11px] body-font text-[var(--text-secondary)]">
              Your task draft is saved and will be restored after you log in or sign up
            </p>
            <div className="mb-4 flex gap-2 text-xs font-medium body-font">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    backgroundColor: authMode === "login" ? 'var(--accent-primary)' : 'var(--bg-muted)',
                    color: authMode === "login" ? 'white' : 'var(--text-secondary)',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => {
                    if (authMode === "login") e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                  }}
                  onMouseOut={e => {
                    if (authMode === "login") e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    backgroundColor: authMode === "signup" ? 'var(--accent-primary)' : 'var(--bg-muted)',
                    color: authMode === "signup" ? 'white' : 'var(--text-secondary)',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => {
                    if (authMode === "signup") e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                  }}
                  onMouseOut={e => {
                    if (authMode === "signup") e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                  }}
                >
                  Sign up
                </button>
            </div>
            {authError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {authError}
              </div>
            )}
            {authMode === "login" ? (
              <form className="space-y-3" onSubmit={handleLogin}>
                <div className="space-y-1">
                  <label className="text-xs font-medium" htmlFor="auth-login-email">
                    Email
                  </label>
                  <input
                    id="auth-login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" htmlFor="auth-login-password">
                    Password
                  </label>
                  <input
                    id="auth-login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    padding: '0.5rem 1rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    opacity: authLoading ? 0.7 : 1,
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                  onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                >
                  {authLoading ? "Logging in..." : "Log in"}
                </button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={handleSignup}>
                <div className="space-y-1">
                  <label className="text-xs font-medium" htmlFor="auth-signup-name">
                    Username
                  </label>
                  <input
                    id="auth-signup-name"
                    type="text"
                    required
                    value={signupDisplayName}
                    onChange={(e) => {
                      setSignupDisplayName(e.target.value);
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" htmlFor="auth-signup-email">
                    Email
                  </label>
                  <input
                    id="auth-signup-email"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" htmlFor="auth-signup-password">
                    Password
                  </label>
                  <input
                    id="auth-signup-password"
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" htmlFor="auth-signup-confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="auth-signup-confirm-password"
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setSignupConfirmPassword(e.target.value);
                      setAuthError(null);
                    }}
                    disabled={authLoading}
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    padding: '0.5rem 1rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    opacity: authLoading ? 0.7 : 1,
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                  onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                >
                  {authLoading ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
