import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createRateLimitResponse,
  rateLimitByIp,
  rateLimitByUser,
} from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const ipRateLimitResult = await rateLimitByIp("changePasswordIp", req);
    if (!ipRateLimitResult.success) {
      return createRateLimitResponse(
        "Too many password change attempts from this network. Please try again later.",
        ipRateLimitResult,
      );
    }

    const rateLimitResult = await rateLimitByUser("changePassword", user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        "Too many password change attempts. Please try again later.",
        rateLimitResult,
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Unable to verify current password for this account." },
        { status: 400 }
      );
    }

    // Re-verify the current password by attempting a sign-in.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update password. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected error updating password." },
      { status: 500 }
    );
  }
}
