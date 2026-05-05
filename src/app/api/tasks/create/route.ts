import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumActive } from "@/lib/premium";

type ReferenceType = "link" | "image" | "image-file";

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
	maxUsers?: string | number;
};

const IMAGE_REFERENCE_BUCKET = "task-image-references";
const MAX_REFERENCE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Allowlisted image MIME types. We deliberately exclude SVG because it can
// contain script tags and would enable stored XSS when rendered inline.
const ALLOWED_IMAGE_MIME_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
]);

function isAllowedImageFile(file: File): boolean {
	if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) return false;
	const ext = getFileExtension(file.name);
	return ALLOWED_IMAGE_EXTENSIONS.has(ext);
}

function getFileExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1) return "bin";
	return fileName.slice(lastDot + 1).toLowerCase();
}

export async function POST(request: Request) {
	try {
		const contentType = request.headers.get("content-type") || "";

		let body: CreateTaskBody;
		let referenceImageFiles: Record<number, File> = {};

		if (contentType.includes("multipart/form-data")) {
			const formData = await request.formData();

			const referencesRaw = (formData.get("references") as string | null) ?? null;
			let parsedReferences: ReferenceItem[] = [];
			if (referencesRaw) {
				try {
					parsedReferences = JSON.parse(referencesRaw) as ReferenceItem[];
				} catch {
					parsedReferences = [];
				}
			}

			parsedReferences.forEach((ref, index) => {
				if (ref.type === "image-file") {
					const file = formData.get(`reference_image_file_${index}`);
					if (file instanceof File) {
						referenceImageFiles[index] = file;
					}
				}
			});

			let parsedCategories: string[] = [];
			const categoriesRaw = (formData.get("categories") as string | null) ?? null;
			if (categoriesRaw) {
				try {
					parsedCategories = JSON.parse(categoriesRaw) as string[];
				} catch {
					parsedCategories = [];
				}
			}

			body = {
				title: (formData.get("title") as string | null) ?? undefined,
				categories: parsedCategories,
				shortDescription:
					(formData.get("shortDescription") as string | null) ?? undefined,
				needDetails: (formData.get("needDetails") as string | null) ?? undefined,
				technicalRequirements:
					(formData.get("technicalRequirements") as string | null) ?? undefined,
				references: parsedReferences,
				price: (formData.get("price") as string | null) ?? undefined,
				timeLimitDays:
					(formData.get("timeLimitDays") as string | null) ?? undefined,
				maxUsers: (formData.get("maxUsers") as string | null) ?? undefined,
			};
		} else {
			body = (await request.json()) as CreateTaskBody;
		}

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
			maxUsers,
		} = body;

		const parsedMaxUsers = maxUsers !== undefined ? Number(maxUsers) : 3;
		if (parsedMaxUsers > 10) {
			// just checking for below 10 because I might change the allowed max users in the future and I don't want to hardcode specific allowed values
			return NextResponse.json(
				{ error: "maxUsers must be 1, 3, or 5." },
				{ status: 400 },
			);
		}

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

		// Validate image-file references and enforce 10MB limit
		const imageFileIndexes = references
			.map((ref, index) => (ref.type === "image-file" ? index : -1))
			.filter((index) => index !== -1);

		for (const index of imageFileIndexes) {
			const file = referenceImageFiles[index];
			if (!file) {
				return NextResponse.json(
					{
						error:
							"Missing image file for one of the 'image file' references.",
					},
					{ status: 400 },
				);
			}

			if (!isAllowedImageFile(file)) {
				return NextResponse.json(
					{
						error:
							"Image file references must be PNG, JPG, GIF, or WEBP images.",
					},
					{ status: 400 },
				);
			}

			if (file.size > MAX_REFERENCE_IMAGE_SIZE_BYTES) {
				return NextResponse.json(
					{ error: "Image file references must be 10MB or smaller." },
					{ status: 400 },
				);
			}
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

		if (parsedMaxUsers === 5) {
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
					{ error: "Creator Pro is required to set max users to 5." },
					{ status: 403 },
				);
			}
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
				max_activations: parsedMaxUsers,
			})
			.select()
			.single();

		if (error) {
			console.error("Error inserting task", error);
			return NextResponse.json(
				{ error: "Failed to create task. Please try again." },
				{ status: 500 },
			);
		}

		// If there are image-file references, upload them to storage and
		// update the task's references with their public URLs.
		if (imageFileIndexes.length > 0 && data) {
			const taskId = (data as any).id as number;
			const updatedReferences: ReferenceItem[] = [];

			for (let i = 0; i < references.length; i++) {
				const ref = references[i];
				if (ref.type === "image-file") {
					const file = referenceImageFiles[i];
					if (!file) {
						updatedReferences.push(ref);
						continue;
					}

					const ext = getFileExtension(file.name);
					const storagePath = `${user.id}/${taskId}/${Date.now()}-reference-${i}.${ext}`;
					const { error: uploadError } = await supabase.storage
						.from(IMAGE_REFERENCE_BUCKET)
						.upload(storagePath, file, {
							contentType: file.type,
							upsert: false,
						});

					if (uploadError) {
						// Best-effort cleanup of the task if uploads fail
						await supabase.from("tasks").delete().eq("id", taskId);
						return NextResponse.json(
							{
								error: `Failed to upload image reference: ${uploadError.message}`,
							},
							{ status: 500 },
						);
					}

					const { data: publicData } = await supabase.storage
						.from(IMAGE_REFERENCE_BUCKET)
						.getPublicUrl(storagePath);
					const publicUrl = publicData?.publicUrl ?? "";

					updatedReferences.push({
						...ref,
						url: publicUrl || ref.url,
					});
				} else {
					updatedReferences.push(ref);
				}
			}

			const { error: updateError } = await supabase
				.from("tasks")
				.update({ references: updatedReferences })
				.eq("id", taskId);

			if (updateError) {
				return NextResponse.json(
					{
						error:
							`Task was created but failed to attach image references: ${updateError.message}`,
					},
					{ status: 500 },
				);
			}

			// Reflect updated references in the response payload
			(data as any).references = updatedReferences;
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

