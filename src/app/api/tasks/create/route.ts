import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

