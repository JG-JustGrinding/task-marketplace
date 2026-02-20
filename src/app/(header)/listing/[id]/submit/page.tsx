"use client";

import { useState, useMemo, FormEvent, use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SubmitPageProps {
	params: Promise<{
		id: string;
	}>;
}

type SubmissionKind = "file" | "link";

export default function SubmitPage({ params }: SubmitPageProps) {
	const { id } = use(params);
	const listingId = Number(id);
	const router = useRouter();
	const [taskTitle, setTaskTitle] = useState<string | null>(null);

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

    const resubmissionRequested = false; // for showing a message if the poster has requested changes to a previous submission
    const resubmissionMessage = "The poster left some notes about what they want changed or improved."; // the poster's notes about what they want changed, if they requested a resubmission

	const isDemoImage = useMemo(() => {
		if (!demoFile) return false;
		return demoFile.type.startsWith("image/");
	}, [demoFile]);

	const handleDemoFileChange = (file: File | null) => {
		setDemoFile(file);
		setDemoPreviewUrl(null);

		if (file && file.type.startsWith("image/")) {
			const reader = new FileReader();
			reader.onload = (e) => {
				if (typeof e.target?.result === "string") {
					setDemoPreviewUrl(e.target.result);
				}
			};
			reader.readAsDataURL(file);
		}
	};

	useEffect(() => {
		if (!Number.isFinite(listingId)) return;

		let cancelled = false;
		const fetchTitle = async () => {
			try {
				const res = await fetch(`/api/tasks/${listingId}`);
				if (!res.ok) return;
				const data = (await res.json()) as {
					task?: { title?: string | null };
				};
				if (!cancelled && data.task?.title) {
					setTaskTitle(data.task.title);
				}
			} catch {
				// ignore; fall back to generic label
			}
		};

		void fetchTitle();
		return () => {
			cancelled = true;
		};
	}, [listingId]);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
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
		const MAX_FILE_BYTES = 30 * 1024 * 1024;
		if (demoFile && demoFile.size > MAX_FILE_BYTES) {
			setError("Demo file must be 30MB or smaller.");
			return;
		}
		if (finalFile && finalFile.size > MAX_FILE_BYTES) {
			setError("Final file must be 30MB or smaller.");
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
				return;
			}

			setSuccess(true);
			setError(null);
			router.push(`/listing/${id}`);
		} catch (err) {
			console.error(err);
			setError("Something went wrong while submitting. Please try again.");
		} finally {
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
						Submit your work
					</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">
						You&apos;re submitting to
						{" "}
						<span className="font-semibold">
							{taskTitle ?? "this task"}
						</span>
						.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<section className="card space-y-4 animate-[fadeIn_0.15s_ease-out]">
						<header className="space-y-1">
							<h2 className="text-base font-semibold">Demo submission (optional)</h2>
							<p className="text-xs text-[var(--text-secondary)]">
								Optionally share a watermarked or partial version so the
								poster can review your work without being able to simply
								reuse it.
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
								Upload demo file
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
								Use demo link
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
											<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
												<span className="text-4xl md:text-5xl font-extrabold tracking-[0.3em] text-white/70 mix-blend-overlay rotate-[-20deg]">
													DEMO
												</span>
											</div>
										</div>
										<p className="text-[0.65rem] text-[var(--text-muted)]">
											In the app we overlay this large DEMO watermark so
											the preview isn&apos;t cleanly reusable. For non-image
											files, consider uploading a watermarked or partial
											version yourself.
										</p>
									</div>
								)}
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
							<h2 className="text-base font-semibold">Final deliverable</h2>
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
									Upload final file
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
									Use final link
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
											setFinalFile(e.target.files?.[0] ?? null)
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
							<p className="text-xs text-[var(--danger)]">{error}</p>
						)}
						{success && !error && (
							<p className="text-xs text-[var(--success)]">
								Submission successful! Redirecting...
							</p>
						)}

						<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
							<p className="text-[0.7rem] text-[var(--text-muted)] max-w-xs">
								Your demo remains the first thing the poster sees. 
                                The poster will only receive the final files/links once they accept your submission.
							</p>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{isSubmitting ? "Submitting..." : "Submit work"}
							</button>
						</div>
					</section>
				</form>
			</main>
		</div>
	);
}

