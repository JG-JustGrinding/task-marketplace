"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SubmissionKind = "file" | "link";

type SubmitClientProps = {
  id: string;
  listingId: number;
  taskTitle: string | null;
  activationStatus: string | null;
  resubmissionMessage: string | null;
  isEarnerProActive?: boolean;
  // Optional premium time limit for this task (days from activation start)
  timeLimitDays?: number | null;
  // When this worker's activation for the task was created
  activationCreatedAt?: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatCountdown(msRemaining: number) {
  if (!Number.isFinite(msRemaining) || msRemaining <= 0) {
    return "0m";
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

export default function SubmitClient({
  id,
  listingId,
  taskTitle,
  activationStatus,
  resubmissionMessage,
  isEarnerProActive = false,
  timeLimitDays,
  activationCreatedAt,
}: SubmitClientProps) {
  const router = useRouter();

  const [demoKind, setDemoKind] = useState<SubmissionKind>("file");
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoLink, setDemoLink] = useState("");
  const [demoPreviewUrl, setDemoPreviewUrl] = useState<string | null>(null);

  const [finalKind, setFinalKind] = useState<SubmissionKind>("file");
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [finalLink, setFinalLink] = useState("");

  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const BASE_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
  const EARNER_PRO_MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
  const maxFileBytes = isEarnerProActive
    ? EARNER_PRO_MAX_FILE_BYTES
    : BASE_MAX_FILE_BYTES;
  const maxFileLabelMb = isEarnerProActive ? 50 : 15;

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const isDemoImage = useMemo(() => {
    if (!demoFile) return false;
    return demoFile.type.startsWith("image/");
  }, [demoFile]);

  let hasTimeLimitExpired = false;
  let remainingMs: number | null = null;

  if (typeof timeLimitDays === "number" && timeLimitDays > 0) {
    const startedAt = activationCreatedAt ? new Date(activationCreatedAt) : null;
    if (startedAt && !Number.isNaN(startedAt.getTime())) {
      const deadline = startedAt.getTime() + timeLimitDays * ONE_DAY_MS;
      remainingMs = deadline - nowMs;
      hasTimeLimitExpired = remainingMs <= 0;
    }
  }

  const handleDemoFileChange = (file: File | null) => {
    setError(null);
    setShowUpgradeHint(false);
    setDemoFile(null);
    setDemoPreviewUrl(null);

    if (!file) {
      return;
    }

    if (file.size > maxFileBytes) {
      setError(
        `Demo file must be ${maxFileLabelMb}MB or smaller.`,
      );
      if (!isEarnerProActive) {
        setShowUpgradeHint(true);
      }
      return;
    }

    // For non-image files, just store the file as-is without a watermark.
    if (!file.type.startsWith("image/")) {
      setDemoFile(file);
      return;
    }

    // For images, render into a canvas with a DEMO watermark and upload
    // the watermarked version instead of the original.
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || null;
      if (!dataUrl) {
        setDemoFile(file);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1600;
          const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setDemoFile(file);
            setDemoPreviewUrl(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Apply a large diagonal DEMO watermark.
          const fontSize = Math.max(canvas.width, canvas.height) / 6;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((-20 * Math.PI) / 180);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.fillText("DEMO", 0, 0);
          ctx.restore();

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                setDemoFile(file);
                setDemoPreviewUrl(dataUrl);
                return;
              }

              const watermarkedFile = new File([blob], file.name, {
                type: blob.type || "image/jpeg",
              });

              setDemoFile(watermarkedFile);
              const objectUrl = URL.createObjectURL(blob);
              setDemoPreviewUrl(objectUrl);
            },
            "image/jpeg",
            0.9,
          );
        } catch (err) {
          console.error("Error creating watermarked demo image", err);
          setDemoFile(file);
          setDemoPreviewUrl(dataUrl);
        }
      };
      img.onerror = () => {
        setDemoFile(file);
        setDemoPreviewUrl(dataUrl);
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setDemoFile(file);
    };

    reader.readAsDataURL(file);
  };

  const handleFinalFileChange = (file: File | null) => {
    setError(null);
    setShowUpgradeHint(false);
    setFinalFile(null);

    if (!file) return;

    if (file.size > maxFileBytes) {
      setError(
        `Final file must be ${maxFileLabelMb}MB or smaller.`,
      );
      if (!isEarnerProActive) {
        setShowUpgradeHint(true);
      }
      return;
    }

    setFinalFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowUpgradeHint(false);
    setSuccess(false);

    if (!Number.isFinite(listingId)) {
      setError("Invalid task id.");
      return;
    }

    // Final submission is required
    if (finalKind === "file" && !finalFile) {
      setError("Please attach your final file, or switch to final link.");
      return;
    }
    if (finalKind === "link" && !finalLink.trim()) {
      setError("Please provide your final link, or switch to final file.");
      return;
    }

    // Client-side file size checks (30MB per file)
    if (demoFile && demoFile.size > maxFileBytes) {
      setError(
        `Demo file must be ${maxFileLabelMb}MB or smaller for your current plan.`,
      );
      if (!isEarnerProActive) {
        setShowUpgradeHint(true);
      }
      return;
    }
    if (finalFile && finalFile.size > maxFileBytes) {
      setError(
        `Final file must be ${maxFileLabelMb}MB or smaller for your current plan.`,
      );
      if (!isEarnerProActive) {
        setShowUpgradeHint(true);
      }
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("taskId", String(listingId));
      if (notes.trim()) {
        formData.append("note", notes.trim());
      }

      if (demoKind === "file" && demoFile) {
        formData.append("demoFile", demoFile);
      } else if (demoKind === "link" && demoLink.trim()) {
        formData.append("demoLink", demoLink.trim());
      }

      if (finalKind === "file" && finalFile) {
        formData.append("finalFile", finalFile);
      } else if (finalKind === "link" && finalLink.trim()) {
        formData.append("finalLink", finalLink.trim());
      }

      const response = await fetch("/api/tasks/submit-task", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok || result.error) {
        setError(result.error || "Failed to submit task. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setError(null);
      router.push(`/listing/${id}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while submitting. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
          >
            Back
          </button>

          <h1 className="mt-3 text-2xl md:text-3xl font-semibold leading-tight">
            Submit Your Work
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            You&apos;re submitting to{" "}
            <span className="font-semibold">{taskTitle ?? "this task"}</span>.
          </p>
          {typeof timeLimitDays === "number" && timeLimitDays > 0 && (
            <div className="mt-2 rounded-md bg-[var(--bg-muted)]/70 border border-[var(--border-color)] px-3 py-2">
              {hasTimeLimitExpired ? (
                <p className="text-xs text-[var(--danger)]">
                  The time limit for submitting work on this task has passed. You
                  can no longer submit your work.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-secondary)]">
                    You have up to {timeLimitDays} day
                    {timeLimitDays === 1 ? "" : "s"} from when you started to
                    submit your work.
                  </p>
                  {remainingMs != null && remainingMs > 0 && (
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                      Time remaining:{" "}
                      <span className="text-[var(--text-primary)]">
                        {formatCountdown(remainingMs)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {activationStatus === "resubmission_requested" && (
            <div className="mt-2 rounded-md bg-[var(--bg-muted)]/70 border border-dashed border-[var(--border-color)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--accent-primary)]">
                Resubmission requested
              </p>
              {resubmissionMessage && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {resubmissionMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="card space-y-4 animate-[fadeIn_0.15s_ease-out]">
            <header className="space-y-1">
              <h2 className="text-base font-semibold">Demo Submission (Optional)</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Optionally share a watermarked or partial version so the poster
                can review your work without being able to simply reuse it.
              </p>
            </header>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setDemoKind("file")}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  demoKind === "file"
                    ? "bg-[var(--accent-primary)] text-white border-transparent"
                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-color)]"
                }`}
              >
                Upload Demo File
              </button>
              <button
                type="button"
                onClick={() => setDemoKind("link")}
                className={`px-3 py-1.5 rounded-full border text-xs ${
                  demoKind === "link"
                    ? "bg-[var(--accent-primary)] text-white border-transparent"
                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-color)]"
                }`}
              >
                Use Demo Link
              </button>
            </div>

            {demoKind === "file" && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Demo file
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    handleDemoFileChange(e.target.files?.[0] ?? null)
                  }
                  className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-xs text-[var(--text-primary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-primary)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[var(--accent-hover)]"
                />

                {demoFile && (
                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Selected: <span className="font-medium">{demoFile.name}</span>
                  </p>
                )}

                {demoPreviewUrl && isDemoImage && (
                  <div className="space-y-1">
                    <div className="relative overflow-hidden rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)]">
                      <img
                        src={demoPreviewUrl}
                        alt="Demo preview"
                        className="w-full h-64 object-cover opacity-80"
                      />
                    </div>
                  </div>
                )}

                
                {demoFile && <p className="text-xs text-[var(--text-muted)]">
                  {isDemoImage ? "This image will be watermarked with a DEMO overlay." : "Tip: add a watermark or use a partial version of your file for the demo to prevent unauthorized reuse"}
                </p>}
              </div>
            )}

            {demoKind === "link" && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Demo link
                </label>
                <input
                  type="url"
                  value={demoLink}
                  onChange={(e) => setDemoLink(e.target.value)}
                  placeholder="https://... (Figma, Loom, unlisted video, etc.)"
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
                <p className="text-[0.7rem] text-[var(--text-muted)]">
                  Use a link where you control access (e.g. view-only or
                  watermarked preview).
                </p>
              </div>
            )}
          </section>

          <section className="card space-y-4 animate-[fadeIn_0.15s_ease-out]">
            <header className="space-y-1">
              <h2 className="text-base font-semibold">Final Deliverable</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Attach the full-quality files or a download link. This is the
                version the poster will actually receive once they accept your
                work.
              </p>
            </header>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFinalKind("file")}
                  className={`px-3 py-1.5 rounded-full border text-xs ${
                    finalKind === "file"
                      ? "bg-[var(--accent-primary)] text-white border-transparent"
                      : "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-color)]"
                  }`}
                >
                  Upload Final File
                </button>
                <button
                  type="button"
                  onClick={() => setFinalKind("link")}
                  className={`px-3 py-1.5 rounded-full border text-xs ${
                    finalKind === "link"
                      ? "bg-[var(--accent-primary)] text-white border-transparent"
                      : "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-color)]"
                  }`}
                >
                  Use Final Link
                </button>
              </div>

              {finalKind === "file" && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Final file
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      handleFinalFileChange(e.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-xs text-[var(--text-primary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-secondary)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[var(--accent-secondary-hover)]"
                  />
                  {finalFile && (
                    <p className="text-[0.7rem] text-[var(--text-muted)]">
                      Selected: <span className="font-medium">{finalFile.name}</span>
                    </p>
                  )}
                </div>
              )}

              {finalKind === "link" && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Final link
                  </label>
                  <input
                    type="url"
                    value={finalLink}
                    onChange={(e) => setFinalLink(e.target.value)}
                    placeholder="https://... (download link, repo, etc.)"
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-secondary)] focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="card space-y-3 animate-[fadeIn_0.15s_ease-out]">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Message to the poster (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add context, walkthrough notes, or anything you want them to know about this submission."
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <div className="space-y-1">
                <p className="text-xs text-[var(--danger)]">{error}</p>
                {!isEarnerProActive && showUpgradeHint && (
                  <p className="text-[0.75rem] text-[var(--text-secondary)]">
                    <Link
                      href="/premium"
                      className="text-[var(--accent-primary)] font-semibold hover:underline"
                    >
                      Upgraded earners
                    </Link>{" "}
                    can upload significantly larger files.
                  </p>
                )}
              </div>
            )}
            {success && !error && (
              <p className="text-xs text-[var(--success)]">
                Submission successful! Redirecting...
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-[0.7rem] text-[var(--text-muted)] max-w-xs">
                Your demo remains the first thing the poster sees. The poster
                will only receive the final files/links once they accept your
                submission.
              </p>
              <button
                type="submit"
                disabled={isSubmitting || hasTimeLimitExpired}
                className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {hasTimeLimitExpired
                  ? "Time limit passed"
                  : isSubmitting
                  ? "Submitting..."
                  : "Submit Work"}
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
