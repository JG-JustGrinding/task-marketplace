import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminEarningsClient from "@/components/AdminEarningsClient";

type SearchParams = {
	[key: string]: string | string[] | undefined;
};

type AdminEarning = {
	id: number;
	task_id: number | null;
	submitter_id: string | null;
	amount_cents: number;
	created_at: string | null;
	claimed_at: string | null;
};

async function verifyAdminPassword(formData: FormData) {
	"use server";

	const password = formData.get("password");
	if (typeof password !== "string" || !password) return;
	if (!process.env.ADMIN_PAGE_PASSWORD) return;
	if (password !== process.env.ADMIN_PAGE_PASSWORD) return;

	const cookieStore = await cookies();
	cookieStore.set("admin_page_authed", "1", {
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
		path: "/admin",
	});
}

export default async function AdminPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const resolvedSearchParams = await searchParams;
	const secretParamRaw = resolvedSearchParams?.secret;
	const secretParam = Array.isArray(secretParamRaw)
		? secretParamRaw[0]
		: secretParamRaw;

	if (!secretParam || secretParam !== process.env.ADMIN_PAGE_SECRET) {
		notFound();
	}

	const cookieStore = await cookies();
	const isAuthed = cookieStore.get("admin_page_authed")?.value === "1";

	if (!isAuthed) {
		return (
			<main className="min-h-[calc(100vh-4rem)] bg-[var(--bg-primary)] px-4 py-8 text-sm text-[var(--text-primary)]">
				<div className="mx-auto flex w-full max-w-sm flex-col gap-4">
					<header className="flex flex-col gap-1">
						<h1 className="text-xl md:text-2xl font-semibold">Platform earnings login</h1>
						<p className="text-xs md:text-sm text-[var(--text-secondary)]">
							Enter the admin password to view platform earnings.
						</p>
					</header>

					<form action={verifyAdminPassword} className="space-y-3 card p-4">
						<label className="block text-[0.75rem] font-medium mb-1">
							Password
							<input
								type="password"
								name="password"
								className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
								autoComplete="current-password"
								required
							/>
						</label>
						<button
							type="submit"
							className="w-full rounded-md bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
						>
							Go to admin page
						</button>
						<p className="text-[0.7rem] text-[var(--text-secondary)]">
							URL secret is valid, but password is required.
						</p>
					</form>
				</div>
			</main>
		);
	}

	const admin = createAdminClient();

	const { data, error } = await admin
		.from("platform_earnings")
		.select("id, task_id, submitter_id, amount_cents, created_at, claimed_at")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error loading task_earnings for admin page", error);
	}

	const earnings: AdminEarning[] = (data ?? []).map((row: any) => ({
		id: Number(row.id),
		task_id: row.task_id != null ? Number(row.task_id) : null,
		submitter_id: row.submitter_id ?? null,
		amount_cents: Number(row.amount_cents ?? 0),
		created_at: (row.created_at as string) ?? null,
		claimed_at: (row.claimed_at as string) ?? null,
	}));

	return (
		<main className="min-h-[calc(100vh-4rem)] bg-[var(--bg-primary)] px-4 py-8 text-sm text-[var(--text-primary)]">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
				<header className="flex flex-col gap-1">
					<h1 className="text-xl md:text-2xl font-semibold">Platform earnings editor</h1>
					<p className="text-xs md:text-sm text-[var(--text-secondary)]">
						View all platform earnings, see totals, and mark rows as claimed.
					</p>
				</header>

				<AdminEarningsClient
					earnings={earnings}
					adminSecret={secretParam}
				/>
			</div>
		</main>
	);
}

