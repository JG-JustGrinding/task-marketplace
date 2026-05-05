"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const MAX_REFERENCES = 5;
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BANNER_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_REFERENCE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

type ReferenceType = "link" | "image" | "image-file";

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
  premiumLogoPreview: string;
  premiumBannerPreview: string;
  timeLimitDays: string;
  maxUsers: number;
}

const INITIAL_STATE: TaskFormState = {
  title: "",
  categories: [],
  shortDescription: "",
  needDetails: "",
  technicalRequirements: "",
  references: [],
  price: "",
  premiumLogoPreview: "",
  premiumBannerPreview: "",
  timeLimitDays: "",
  maxUsers: 3,
};

const DRAFT_STORAGE_KEY = "create_task_draft_v1";
const supabase = createClient();

type PaymentStatus = "success" | "cancel" | null;

interface CreateTaskClientProps {
  paymentStatus: PaymentStatus;
  creatorProActive?: boolean;
}

export default function CreateTaskClient({
  paymentStatus,
  creatorProActive = false,
}: CreateTaskClientProps) {
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
  const [showCreatorProPanel, setShowCreatorProPanel] = useState(false);
  const [premiumUploadError, setPremiumUploadError] = useState<string | null>(null);
  const [premiumLogoFile, setPremiumLogoFile] = useState<File | null>(null);
  const [premiumBannerFile, setPremiumBannerFile] = useState<File | null>(null);
  const [referencePreviewStatus, setReferencePreviewStatus] = useState<
    Record<number, "loading" | "ok" | "error">
  >({});
  const [referenceFiles, setReferenceFiles] = useState<Record<number, File | null>>({});
  const [referenceFilePreviews, setReferenceFilePreviews] = useState<
    Record<number, string>
  >({});

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  type StepKey = "details" | "requirements" | "premium" | "price" | "review";

  const STEPS: { key: StepKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "requirements", label: "Requirements" },
    { key: "premium", label: "" },
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
      // File objects (logo/banner uploads and image-file references) cannot be
      // reliably persisted to localStorage. Strip out preview URLs and any
      // file-backed state so the restored draft reflects only text fields and
      // non-file references.
      const safeForm: TaskFormState = {
        ...form,
        premiumLogoPreview: "",
        premiumBannerPreview: "",
        references: form.references.map((ref) =>
          ref.type === "image-file"
            ? { ...ref, url: "" }
            : ref,
        ),
        maxUsers: form.maxUsers,
      };

      const payload = JSON.stringify({
        form: safeForm,
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
    const step = STEPS[index];
    if (!step) return true;
    if (step.key === "details") {
      return Object.keys(basicErrors).length === 0;
    }
    if (step.key === "price") {
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

  const sanitizePriceInput = (raw: string) => {
    // Keep only digits and a single decimal point, clamp to 2 decimals, and 6 digits before decimal
    let value = raw.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }
    let [intPart, decPart] = value.split(".");
    if (intPart && intPart.length > 6) {
      intPart = intPart.slice(0, 6);
    }
    if (typeof decPart === "string") {
      return intPart + "." + decPart.slice(0, 2);
    }
    return intPart;
  };

  const handleChange = (field: keyof TaskFormState, value: string) => {
    if (field === "price") {
      const sanitized = sanitizePriceInput(value);
      setForm((prev) => ({ ...prev, price: sanitized }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriceBlur = () => {
    setTouched((prev) => ({ ...prev, price: true }));
    const trimmed = form.price.trim();
    if (!trimmed) return;
    const n = priceValue;
    if (!Number.isNaN(n) && n > 0) {
      setForm((prev) => ({ ...prev, price: n.toFixed(2) }));
    }
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

  const handleReferenceTypeChange = (index: number, newType: ReferenceType) => {
    setForm((prev) => ({
      ...prev,
      references: prev.references.map((ref, i) =>
        i === index
          ? {
              ...ref,
              type: newType,
              // image-file URLs are populated by the API after upload
              url: newType === "image-file" ? "" : ref.url,
            }
          : ref,
      ),
    }));

    setReferencePreviewStatus((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    if (newType !== "image-file") {
      setReferenceFiles((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      setReferenceFilePreviews((prev) => {
        const next = { ...prev };
        if (typeof URL !== "undefined" && next[index]) {
          try {
            URL.revokeObjectURL(next[index]);
          } catch {
            // ignore revoke errors
          }
        }
        delete next[index];
        return next;
      });
    }
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
    // Clear any previous preview status when the type or URL changes
    setReferencePreviewStatus((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const removeReference = (index: number) => {
    setForm((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
    // Reindex preview status for remaining references
    setReferencePreviewStatus((prev) => {
      const next: Record<number, "loading" | "ok" | "error"> = {};
      for (const [key, value] of Object.entries(prev)) {
        const k = Number(key);
        if (Number.isNaN(k) || k === index) continue;
        const newIndex = k > index ? k - 1 : k;
        next[newIndex] = value;
      }
      return next;
    });

    // Reindex files for remaining references
    setReferenceFiles((prev) => {
      const next: Record<number, File | null> = {};
      for (const [key, file] of Object.entries(prev)) {
        const k = Number(key);
        if (Number.isNaN(k) || k === index) continue;
        const newIndex = k > index ? k - 1 : k;
        next[newIndex] = file;
      }
      return next;
    });

    // Reindex file previews and revoke the removed one
    setReferenceFilePreviews((prev) => {
      const next: Record<number, string> = {};
      if (typeof URL === "undefined") {
        for (const [key, url] of Object.entries(prev)) {
          const k = Number(key);
          if (Number.isNaN(k) || k === index) continue;
          const newIndex = k > index ? k - 1 : k;
          next[newIndex] = url;
        }
        return next;
      }

      for (const [key, url] of Object.entries(prev)) {
        const k = Number(key);
        if (Number.isNaN(k)) continue;
        if (k === index) {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore revoke errors
          }
          continue;
        }
        const newIndex = k > index ? k - 1 : k;
        next[newIndex] = url;
      }
      return next;
    });
  };

  const handleTimeLimitChange = (value: string) => {
    if (!creatorProActive) {
      setShowCreatorProPanel(true);
      return;
    }
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setForm((prev) => ({ ...prev, timeLimitDays: "" }));
      return;
    }

    const numericValue = Number(trimmedValue);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const boundedValue = Math.min(30, Math.max(1, Math.floor(numericValue)));
    setForm((prev) => ({ ...prev, timeLimitDays: String(boundedValue) }));
  };

  const handleSubmit = async () => {
    const detailsIndex = STEPS.findIndex((step) => step.key === "details");
    const priceIndex = STEPS.findIndex((step) => step.key === "price");
    if (
      (detailsIndex !== -1 && !canGoNextFromStep(detailsIndex)) ||
      (priceIndex !== -1 && !canGoNextFromStep(priceIndex))
    ) {
      setStepIndex(0);
      setTouched({ step: true });
      return;
    }
    // Ensure any image-file references have files selected before submitting
    const missingImageFileIndex = form.references.findIndex(
      (ref, index) => ref.type === "image-file" && !referenceFiles[index],
    );
    if (missingImageFileIndex !== -1) {
      setSubmitError(
        "Please upload image files for all 'Image file' references before posting.",
      );
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

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("categories", JSON.stringify(form.categories));
      formData.append("shortDescription", form.shortDescription);
      formData.append("needDetails", form.needDetails);
      formData.append("technicalRequirements", form.technicalRequirements);
      formData.append("references", JSON.stringify(form.references));
      formData.append("price", String(priceValue));
      formData.append("maxUsers", String(form.maxUsers));
      if (form.timeLimitDays) {
        formData.append("timeLimitDays", form.timeLimitDays);
      }

      form.references.forEach((ref, index) => {
        if (ref.type === "image-file" && referenceFiles[index]) {
          formData.append(
            `reference_image_file_${index}`,
            referenceFiles[index] as File,
          );
        }
      });

      const response = await fetch("/api/tasks/create", {
        method: "POST",
        body: formData,
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

      if (creatorProActive && (premiumLogoFile || premiumBannerFile)) {
        const brandingFormData = new FormData();
        if (premiumLogoFile) {
          brandingFormData.append("logo", premiumLogoFile);
        }
        if (premiumBannerFile) {
          brandingFormData.append("banner", premiumBannerFile);
        }

        const brandingResponse = await fetch(`/api/tasks/${taskId}/branding`, {
          method: "POST",
          body: brandingFormData,
        });

        if (!brandingResponse.ok) {
          let brandingErrorMessage = "Failed to upload task branding.";
          try {
            const brandingJson = await brandingResponse.json();
            if (brandingJson?.error) {
              brandingErrorMessage = String(brandingJson.error);
            }
          } catch {
            // ignore parse errors and use fallback message
          }

          setSubmitError(
            `Your task was created, but branding upload failed: ${brandingErrorMessage}`,
          );
          router.push(`/listing/${taskId}`);
          return;
        }
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
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
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
                className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
                aria-describedby="title-help title-error"
                required
              />
              <p
                id="title-help"
                className="mt-1 text-xs text-[var(--text-secondary)]"
              >
                A clear, concise title that collaborators will see first.
              </p>
              {touched.title && basicErrors.title && (
                <p
                  id="title-error"
                  className="mt-1 text-xs text-[var(--danger)]"
                >
                  {basicErrors.title}
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Category Tags
              </span>
              <p className="mb-3 text-xs text-[var(--text-secondary)]">
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
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                Short Description
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
                className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
                aria-describedby="shortDescription-help shortDescription-error"
                required
              />
              <p
                id="shortDescription-help"
                className="mt-1 text-xs text-[var(--text-secondary)]"
              >
                This appears in feeds and search results. Keep it brief and inviting.
              </p>
              {touched.shortDescription && basicErrors.shortDescription && (
                <p
                  id="shortDescription-error"
                  className="mt-1 text-xs text-[var(--danger)]"
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
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                What Do You Need? (Optional)
              </label>
              <textarea
                id="needDetails"
                name="needDetails"
                rows={5}
                value={form.needDetails}
                onChange={(e) => handleChange("needDetails", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
                aria-describedby="needDetails-help"
              />
              <p
                id="needDetails-help"
                className="mt-1 text-xs text-[var(--text-secondary)]"
              >
                Describe the task in plain language. What should the collaborator deliver?
              </p>
            </div>

            <div>
              <label
                htmlFor="technicalRequirements"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                Technical Requirements (Optional)
              </label>
              <textarea
                id="technicalRequirements"
                name="technicalRequirements"
                rows={4}
                value={form.technicalRequirements}
                onChange={(e) => handleChange("technicalRequirements", e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
                aria-describedby="technicalRequirements-help"
              />
              <p
                id="technicalRequirements-help"
                className="mt-1 text-xs text-[var(--text-secondary)]"
              >
                File types, sizes, formats, engines, tools, or any non-negotiable constraints.
              </p>
            </div>

            <div>
              <label
                htmlFor="references"
                className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
              >
                References (optional)
              </label>
              <div className="mt-2 space-y-3" aria-describedby="references-help">
                {form.references.length === 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Add links to docs, examples, or reference images for this task.
                  </p>
                )}

                {form.references.map((reference, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-3 text-xs shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={reference.type}
                        onChange={(e) =>
                          handleReferenceTypeChange(index, e.target.value as ReferenceType)
                        }
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-sm outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
                      >
                        <option value="image">Image (URL to image)</option>
                        <option value="image-file">Image file (upload)</option>
                        <option value="link">Link</option>
                      </select>
                      {reference.type === "image-file" ? (
                        <div className="mt-1 w-full sm:mt-0">
                          <input
                            id={`reference-file-${index}`}
                            name={`reference-file-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (!file) {
                                setReferenceFiles((prev) => ({ ...prev, [index]: null }));
                                setReferenceFilePreviews((prev) => {
                                  const next = { ...prev };
                                  if (typeof URL !== "undefined" && next[index]) {
                                    try {
                                      URL.revokeObjectURL(next[index]);
                                    } catch {
                                      // ignore revoke errors
                                    }
                                  }
                                  delete next[index];
                                  return next;
                                });
                                return;
                              }
                              if (file.size > MAX_REFERENCE_IMAGE_SIZE_BYTES) {
                                alert("Image file references must be 10MB or smaller.");
                                e.target.value = "";
                                return;
                              }
                              setReferenceFiles((prev) => ({ ...prev, [index]: file }));
                              setReferenceFilePreviews((prev) => {
                                const next = { ...prev };
                                if (typeof URL !== "undefined" && next[index]) {
                                  try {
                                    URL.revokeObjectURL(next[index]);
                                  } catch {
                                    // ignore revoke errors
                                  }
                                }
                                if (typeof URL !== "undefined") {
                                  const objectUrl = URL.createObjectURL(file);
                                  next[index] = objectUrl;
                                }
                                return next;
                              });
                            }}
                            className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] shadow-sm outline-none file:mr-2 file:rounded-md file:border-0 file:bg-[var(--accent-primary)] file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-white hover:file:bg-[var(--accent-hover)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
                          />
                        </div>
                      ) : (
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
                          className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] shadow-sm outline-none ring-0 transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15 sm:mt-0"
                        />
                      )}
                    </div>
                    {reference.type === "image" && reference.url && (
                      <div className="mt-1 flex items-center gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]">
                          <img
                            src={reference.url}
                            alt={`Image reference ${index + 1}`}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onLoad={() =>
                              setReferencePreviewStatus((prev) => ({
                                ...prev,
                                [index]: "ok",
                              }))
                            }
                            onError={() =>
                              setReferencePreviewStatus((prev) => ({
                                ...prev,
                                [index]: "error",
                              }))
                            }
                          />
                        </div>
                        <div className="text-[11px] leading-snug text-[var(--text-secondary)]">
                          {referencePreviewStatus[index] === "error" ? (
                            <span>
                              Image could not be loaded. Make sure the link is public
                              and points directly to an image file.
                            </span>
                          ) : (
                            <span>
                              Image preview
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {reference.type === "image-file" && (
                      <div className="mt-1 space-y-1">
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Upload an image file (max 10MB).
                        </p>
                        {referenceFiles[index] && (
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Selected: <span className="font-medium">{referenceFiles[index]?.name}</span>
                          </p>
                        )}
                        {referenceFilePreviews[index] && (
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]">
                              <img
                                src={referenceFilePreviews[index]}
                                alt={`Image file reference ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <p className="text-[11px] leading-snug text-[var(--text-secondary)]">
                              Image preview
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeReference(index)}
                      className="self-start text-[11px] font-medium text-[var(--danger)] hover:opacity-85"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addReference}
                  disabled={form.references.length >= MAX_REFERENCES}
                  className="inline-flex items-center rounded-lg border border-dashed border-[var(--border-color)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="mr-1 text-base leading-none">+</span>
                  {form.references.length >= MAX_REFERENCES
                    ? "Maximum of 5 references reached"
                    : "Add reference"}
                </button>
              </div>
              {false && (
                <p
                  id="references-help"
                  className="mt-1 text-xs text-[var(--text-secondary)]"
                >
                  For image references, upload your image to a service like Google
                    Drive, make it shareable, and paste the image link here. Image
                references are stored as links, not file uploads.
              </p>)}
            </div>

            <div>
              <span className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Max Users
              </span>
              <p className="mb-3 text-xs text-[var(--text-secondary)]">
                What's the max number of users that can start this task at the same time?
              </p>
              <div className="flex gap-2">
                {([1, 3, 5] as const).map((count) => {
                  const isProOnly = count === 5;
                  const isDisabled = isProOnly && !creatorProActive;
                  const isSelected = form.maxUsers === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) {
                          setShowCreatorProPanel(true);
                          return;
                        }
                        setForm((prev) => ({ ...prev, maxUsers: count }));
                      }}
                      className={`relative flex h-10 w-14 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                        isSelected
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm"
                          : isDisabled
                          ? "border-[var(--border-color)] bg-[var(--bg-secondary)]/60 text-[var(--text-muted)] cursor-not-allowed opacity-60"
                          : "border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                      }`}
                      aria-pressed={isSelected}
                    >
                      {count}
                      {isProOnly && !creatorProActive && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-[var(--accent-primary)] px-1 py-px text-[9px] font-bold leading-none text-white">
                          PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case "premium":
        return (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent-primary)]/50 bg-[var(--bg-secondary)]">
                <Image
                  src="/creator_pro_badge.svg"
                  alt="Creator Pro badge"
                  width={20}
                  height={20}
                  className="drop-shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Creator Pro Extras
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Add a logo, banner, and time limit to your task.
                </p>
                {!creatorProActive && (
                    <p className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline">
                      <Link
                        href="/upgrade"
                        onClick={() => {
                          // Preserve the current task draft when redirecting to upgrade
                          saveDraft();
                        }}
                      >
                          These options are included with Creator Pro. You can continue
                          without them, or upgrade to unlock them.
                      </Link>
                    </p>
                )}
                {creatorProActive && false && (
                  <p className="text-[11px] font-bold text-[var(--accent-secondary)] ">
                    Creator Pro is active on your account. Premium branding and
                    timing are unlocked for this task.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-4 text-xs shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Task Logo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!creatorProActive) {
                      setShowCreatorProPanel(true);
                      return;
                    }
                    logoInputRef.current?.click();
                  }}
                  className={`mt-2 flex h-24 w-full items-center justify-center rounded-xl border border-dashed text-[11px] transition ${
                    creatorProActive
                      ? "border-[var(--accent-primary)]/60 bg-[var(--bg-secondary)] hover:bg-[var(--bg-muted)] cursor-pointer"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)]/70 text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent-primary)]/60"
                  }`}
                >
                  {form.premiumLogoPreview ? (
                    <div className="flex items-center gap-2">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md border border-[var(--border-color)] bg-[var(--bg-muted)]">
                        <Image
                          src={form.premiumLogoPreview}
                          alt="Task logo preview"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <span className="text-[11px]">Change logo</span>
                    </div>
                  ) : (
                    <span>
                      {creatorProActive ? "Upload logo" : "Creator Pro required to add a logo"}
                    </span>
                  )}
                </button>
                {form.premiumLogoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!creatorProActive) {
                        setShowCreatorProPanel(true);
                        return;
                      }
                      if (form.premiumLogoPreview && typeof URL !== "undefined") {
                        try {
                          URL.revokeObjectURL(form.premiumLogoPreview);
                        } catch {
                          // ignore revoke errors
                        }
                      }
                      setForm((prev) => ({
                        ...prev,
                        premiumLogoPreview: "",
                      }));
                      setPremiumLogoFile(null);
                    }}
                    className="mt-2 inline-flex items-center text-[11px] font-medium text-[var(--danger)] hover:opacity-85"
                  >
                    Remove logo
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (!creatorProActive) {
                      setShowCreatorProPanel(true);
                      e.target.value = "";
                      return;
                    }
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_LOGO_SIZE_BYTES) {
                      setPremiumUploadError("Logo files must be 5MB or smaller.");
                      e.target.value = "";
                      return;
                    }
                    setPremiumUploadError(null);
                    if (form.premiumLogoPreview && typeof URL !== "undefined") {
                      try {
                        URL.revokeObjectURL(form.premiumLogoPreview);
                      } catch {
                        // ignore revoke errors
                      }
                    }
                    const objectUrl = URL.createObjectURL(file);
                    setForm((prev) => ({
                      ...prev,
                      premiumLogoPreview: objectUrl,
                    }));
                    setPremiumLogoFile(file);
                  }}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-4 text-xs shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Task Banner
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!creatorProActive) {
                      setShowCreatorProPanel(true);
                      return;
                    }
                    bannerInputRef.current?.click();
                  }}
                  className={`mt-2 flex h-24 w-full items-center justify-center rounded-xl border border-dashed text-[11px] transition ${
                    creatorProActive
                      ? "border-[var(--accent-primary)]/60 bg-[var(--bg-secondary)] hover:bg-[var(--bg-muted)] cursor-pointer"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)]/70 text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent-primary)]/60"
                  }`}
                >
                  {form.premiumBannerPreview ? (
                    <span>Change banner</span>
                  ) : (
                    <span>
                      {creatorProActive ? "Upload banner" : "Creator Pro required to add a banner"}
                    </span>
                  )}
                </button>
                {form.premiumBannerPreview && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]">
                    <div className="relative h-24 w-full">
                      <Image
                        src={form.premiumBannerPreview}
                        alt="Task banner preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
                {form.premiumBannerPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!creatorProActive) {
                        setShowCreatorProPanel(true);
                        return;
                      }
                      if (form.premiumBannerPreview && typeof URL !== "undefined") {
                        try {
                          URL.revokeObjectURL(form.premiumBannerPreview);
                        } catch {
                          // ignore revoke errors
                        }
                      }
                      setForm((prev) => ({
                        ...prev,
                        premiumBannerPreview: "",
                      }));
                      setPremiumBannerFile(null);
                    }}
                    className="mt-2 inline-flex items-center text-[11px] font-medium text-[var(--danger)] hover:opacity-85"
                  >
                    Remove banner
                  </button>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (!creatorProActive) {
                      setShowCreatorProPanel(true);
                      e.target.value = "";
                      return;
                    }
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_BANNER_SIZE_BYTES) {
                      setPremiumUploadError("Banner files must be 10MB or smaller.");
                      e.target.value = "";
                      return;
                    }
                    setPremiumUploadError(null);
                    if (form.premiumBannerPreview && typeof URL !== "undefined") {
                      try {
                        URL.revokeObjectURL(form.premiumBannerPreview);
                      } catch {
                        // ignore revoke errors
                      }
                    }
                    const objectUrl = URL.createObjectURL(file);
                    setForm((prev) => ({
                      ...prev,
                      premiumBannerPreview: objectUrl,
                    }));
                    setPremiumBannerFile(file);
                  }}
                />
              </div>
            </div>

            {premiumUploadError && (
              <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)] shadow-[var(--shadow-soft)]">
                {premiumUploadError}
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-4 text-xs shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Time Limit After Work Starts
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                Set how long collaborators have to submit work after they check in
                on your task.
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => handleTimeLimitChange("")}
                  className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                    form.timeLimitDays
                      ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      : "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  } ${creatorProActive ? "cursor-pointer hover:bg-[var(--bg-muted)]" : "cursor-pointer"}`}
                >
                  No Time Limit
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    or limit to
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.timeLimitDays}
                    onChange={(e) => handleTimeLimitChange(e.target.value)}
                    className="h-8 w-16 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-xs text-[var(--text-primary)] outline-none ring-0 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                  />
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    days
                  </span>
                </div>
              </div>
            </div>

            {!creatorProActive && showCreatorProPanel && (
              <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--bg-secondary)]/80 p-4 text-xs shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="relative h-8 w-8 flex-shrink-0">
                      <Image
                        src="/creator_pro_badge.svg"
                        alt="Creator Pro badge"
                        fill
                        sizes="32px"
                        className="drop-shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Unlock Creator Pro features
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Upgrade to add custom task logos and banners, set
                        time limits, and access other premium creator tools.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                    <a
                      href="/premium"
                      onClick={() => {
                        // Preserve the current task draft when redirecting to the premium page
                        saveDraft();
                      }}
                      className="inline-flex items-center rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      Get Creator Pro
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowCreatorProPanel(false)}
                      className="inline-flex items-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case "price":
        return (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                Payout for Completion
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 px-3 py-2 shadow-sm focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/15">
                <span className="mr-2 text-sm text-[var(--text-secondary)]">
                  $
                </span>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min={5}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  onBlur={handlePriceBlur}
                  className="none w-full border-none rounded-sm bg-transparent text-sm outline-none ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-describedby="price-help price-error"
                  required
                />
              </div>
              <p
                id="price-help"
                className="mt-1 text-xs text-[var(--text-secondary)]"
              >
                Minimum $5
              </p>
              {touched.price && priceError && (
                <p
                  id="price-error"
                  className="mt-1 text-xs text-[var(--danger)]"
                >
                  {priceError}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm">
              <p className="font-medium">
                You will pay <span className="text-[var(--accent-primary)]">${""}
                  {priceValue > 0 ? priceValue.toFixed(2) : "0.00"}
                </span>{" "}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Funds are held until you accept a submission. You can request a refund on open tasks at any time.
              </p>
            </div>
          </div>
        );
      case "review":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {form.title || "Untitled task"}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {form.shortDescription
                      ? form.shortDescription.length > 140
                        ? `${form.shortDescription.slice(0, 140)}...`
                        : form.shortDescription
                      : "This is how your task will appear in the marketplace."}
                  </p>
                </div>
                <div className="rounded-full bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-primary)]">
                  ${priceValue > 0 ? priceValue.toFixed(2) : "0.00"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {form.categories.length > 0 ? (
                  form.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-primary)]"
                    >
                      {category}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    No categories selected
                  </span>
                )}
              </div>

              {(form.needDetails || form.technicalRequirements || form.references.length > 0) && (
                <div className="mt-4 grid gap-3 text-xs text-[var(--text-primary)] md:grid-cols-2">
                  {form.needDetails && (
                    <div>
                      <p className="mb-1 font-semibold text-[var(--text-primary)]">
                        What You Need
                      </p>
                      <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {form.needDetails}
                      </p>
                    </div>
                  )}
                  {form.technicalRequirements && (
                    <div>
                      <p className="mb-1 font-semibold text-[var(--text-primary)]">
                        Technical requirements
                      </p>
                      <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {form.technicalRequirements}
                      </p>
                    </div>
                  )}
                  {form.references.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="mb-1 font-semibold text-[var(--text-primary)]">
                        References
                      </p>
                      <ul className="space-y-1 text-[11px] leading-relaxed">
                        {form.references.map((reference, index) => {
                          const label =
                            reference.type === "image"
                              ? "Image"
                              : reference.type === "image-file"
                              ? "Image file"
                              : "Link";

                          const displayValue =
                            reference.type === "image-file"
                              ? referenceFiles[index]?.name || reference.url || "(no file selected)"
                              : reference.url;

                          return (
                            <li
                              key={index}
                              className="break-words text-[var(--accent-primary)]"
                            >
                              <span className="mr-1 rounded-full bg-[var(--bg-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                                {label}
                              </span>
                              {displayValue}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {submitError && (
              <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)] shadow-sm">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/10 px-4 py-3 text-xs text-[var(--success)] shadow-sm">
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
                ? "border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success)]"
                : "border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger)]"
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
              const isPremiumStep = step.key === "premium";
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
                      ) : isPremiumStep ? (
                        <span className="text-[9px] font-semibold uppercase tracking-wide">
                          Pro
                        </span>
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

        <section className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/90 p-6 shadow-md backdrop-blur-sm">
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 bg-[var(--bg-secondary)]">
            <header className="space-y-1">
              <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                Create a New Task
              </h1>
            </header>

            <div
              key={currentStep.key}
              className="animate-[fadeIn_160ms_ease-out]"
            >
              {renderStep()}
            </div>

            <footer className="mt-2 flex flex-col gap-3 border-t border-[var(--border-color)] pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] text-[var(--text-secondary)]">
                Step {stepIndex + 1} of {STEPS.length}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={stepIndex === 0 || isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-sm transition hover:border-[var(--border-color)] hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>

                {stepIndex < STEPS.length - 1 ? (
                  (() => {
                    const nextDisabled = isSubmitting || !canGoNextFromStep(stepIndex);
                    return (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={nextDisabled}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                      borderRadius: '0.75rem',
                      padding: '0.375rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      opacity: nextDisabled ? 0.6 : 1,
                      cursor: nextDisabled ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
                  >
                    Next
                  </button>
                    );
                  })()
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
            className="w-full max-w-md rounded-2xl border bg-[var(--bg-secondary)] p-8 shadow-md backdrop-blur-sm card"
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
              <div className="mb-3 rounded-lg border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
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
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
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
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
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
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
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
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
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
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
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
                    className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/15"
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
