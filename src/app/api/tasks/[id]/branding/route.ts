import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumActive } from "@/lib/premium";

const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BANNER_SIZE_BYTES = 10 * 1024 * 1024;

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "bin";
  return fileName.slice(lastDot + 1).toLowerCase();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
        { error: "Creator Pro is required to upload task branding." },
        { status: 403 },
      );
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, logo_path, banner_path")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if ((task as any).user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to update branding for this task." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const logoFile = formData.get("logo");
    const bannerFile = formData.get("banner");

    const hasLogo = logoFile instanceof File;
    const hasBanner = bannerFile instanceof File;

    if (!hasLogo && !hasBanner) {
      return NextResponse.json(
        { error: "At least one branding file is required." },
        { status: 400 },
      );
    }

    let nextLogoPath = ((task as any).logo_path as string | null) ?? null;
    let nextBannerPath = ((task as any).banner_path as string | null) ?? null;

    if (hasLogo) {
      if (!logoFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Logo must be an image file." },
          { status: 400 },
        );
      }
      if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Logo files must be 5MB or smaller." },
          { status: 400 },
        );
      }

      const logoPath = `${user.id}/${taskId}/${Date.now()}-logo.${getFileExtension(logoFile.name)}`;
      const { error: uploadLogoError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(logoPath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        });

      if (uploadLogoError) {
        return NextResponse.json(
          { error: `Failed to upload logo: ${uploadLogoError.message}` },
          { status: 500 },
        );
      }

      const previousLogoPath = ((task as any).logo_path as string | null) ?? null;
      if (previousLogoPath) {
        const { error: removeOldLogoError } = await supabase.storage
          .from(LOGO_BUCKET)
          .remove([previousLogoPath]);

        if (removeOldLogoError) {
          console.error("Failed to remove previous task logo", removeOldLogoError);
        }
      }

      nextLogoPath = logoPath;
    }

    if (hasBanner) {
      if (!bannerFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Banner must be an image file." },
          { status: 400 },
        );
      }
      if (bannerFile.size > MAX_BANNER_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Banner files must be 10MB or smaller." },
          { status: 400 },
        );
      }

      const bannerPath = `${user.id}/${taskId}/${Date.now()}-banner.${getFileExtension(bannerFile.name)}`;
      const { error: uploadBannerError } = await supabase.storage
        .from(BANNER_BUCKET)
        .upload(bannerPath, bannerFile, {
          contentType: bannerFile.type,
          upsert: false,
        });

      if (uploadBannerError) {
        return NextResponse.json(
          { error: `Failed to upload banner: ${uploadBannerError.message}` },
          { status: 500 },
        );
      }

      const previousBannerPath = ((task as any).banner_path as string | null) ?? null;
      if (previousBannerPath) {
        const { error: removeOldBannerError } = await supabase.storage
          .from(BANNER_BUCKET)
          .remove([previousBannerPath]);

        if (removeOldBannerError) {
          console.error("Failed to remove previous task banner", removeOldBannerError);
        }
      }

      nextBannerPath = bannerPath;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        logo_path: nextLogoPath,
        banner_path: nextBannerPath,
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save branding: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        logoPath: nextLogoPath,
        bannerPath: nextBannerPath,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error uploading task branding", error);
    return NextResponse.json(
      { error: "Failed to upload task branding." },
      { status: 500 },
    );
  }
}
