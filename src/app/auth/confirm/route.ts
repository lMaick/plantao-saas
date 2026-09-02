import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedTypes: EmailOtpType[] = ["signup", "invite", "email"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (
    !tokenHash ||
    !type ||
    !allowedTypes.includes(type as EmailOtpType)
  ) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation", origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation", origin),
    );
  }

  return NextResponse.redirect(new URL("/app", origin));
}
