import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumActive } from "@/lib/premium";

type ReferenceType = "link" | "image";

type ReferenceItem = {
	type: ReferenceType;
	url: string;
};

type CreateTaskBody = {
	title?: string;
	categories?: string[];
	shortDescription?: string;
	needDetails?: string;
	technicalRequirements?: string;
	references?: ReferenceItem[];
	price?: string | number;
	timeLimitDays?: string | number | null;
};

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as CreateTaskBody;

		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		const {
			title,
			categories = [],
			shortDescription,
			needDetails,
			technicalRequirements,
			references = [],
			price,
			timeLimitDays,
		} = body;

		if (!title || !shortDescription) {
			return NextResponse.json(
				{ error: "title and shortDescription are required" },
				{ status: 400 },
			);
		}

		const numericPrice = typeof price === "string" ? Number(price) : price;
		if (!numericPrice || Number.isNaN(numericPrice) || numericPrice < 5) {
			return NextResponse.json(
				{ error: "price must be at least 5" },
				{ status: 400 },
			);
		}

		if (references.length > 5) {
			return NextResponse.json(
				{ error: "You can add up to 5 references" },
				{ status: 400 },
			);
		}

		let parsedTimeLimitDays: number | null = null;
		if (
			typeof timeLimitDays !== "undefined" &&
			timeLimitDays !== null &&
			String(timeLimitDays).trim() !== ""
		) {
			const numericTimeLimit = Number(timeLimitDays);
			if (!Number.isFinite(numericTimeLimit) || !Number.isInteger(numericTimeLimit)) {
				return NextResponse.json(
					{ error: "timeLimitDays must be an integer between 1 and 30." },
					{ status: 400 },
				);
			}

			if (numericTimeLimit < 1 || numericTimeLimit > 30) {
				return NextResponse.json(
					{ error: "timeLimitDays must be between 1 and 30." },
					{ status: 400 },
				);
			}

			const { data: profile } = await supabase
				.from("profiles")
				.select("creator_pro_active, creator_pro_expires_at")
				.eq("id", user.id)
				.maybeSingle();

			const creatorProActive = profile
				? isPremiumActive(
						(profile as any).creator_pro_active,
						(profile as any).creator_pro_expires_at,
				  )
				: false;

			if (!creatorProActive) {
				return NextResponse.json(
					{ error: "Creator Pro is required to set a time limit." },
					{ status: 403 },
				);
			}

			parsedTimeLimitDays = numericTimeLimit;
		}

		const { data, error } = await supabase
			.from("tasks")
			.insert({
				user_id: user.id,
				title,
				categories,
				short_description: shortDescription,
				need_details: needDetails,
				technical_requirements: technicalRequirements,
				references: references,
				price: numericPrice,
				time_limit_days: parsedTimeLimitDays,
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 },
			);
		}

		return NextResponse.json({ task: data }, { status: 201 });
	} catch (error) {
		console.error("Error creating task", error);
		return NextResponse.json(
			{ error: "Failed to create task" },
			{ status: 500 },
		);
	}
}

export async function GET() {
	return NextResponse.json({ ok: true }, { status: 200 });
}

