// supabase/functions/verify-otp/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function normalizePhone(phone: string): string {
  // Normalize phone number:
  // - trim whitespace
  // - remove ALL spaces and hyphens
  // - ensure starts with "+"
  // - DO NOT add country code implicitly
  let p = (phone || "").trim();
  if (!p) return "";
  
  // Remove all spaces and hyphens
  p = p.replace(/[\s\-]/g, "");
  
  // Ensure it starts with "+"
  if (!p.startsWith("+")) {
    p = `+${p}`;
  }
  
  return p;
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a deterministic password based on phone and a secret
async function generatePassword(phone: string, secret: string): Promise<string> {
  const hash = await sha256(`${phone}:${secret}`);
  // Use first 32 chars of hash as password
  return hash.slice(0, 32);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const OTP_SECRET = Deno.env.get("OTP_SECRET") ?? "default-otp-secret-change-me";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(
        500,
        { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in secrets" },
        origin,
      );
    }

    const { phone, otp } = await req.json().catch(() => ({ phone: "", otp: "" }));
    if (!phone || typeof phone !== "string" || !otp || typeof otp !== "string") {
      return json(400, { ok: false, error: "phone and otp are required" }, origin);
    }

    const normalized = normalizePhone(phone);
    console.log("[verify-otp] Verifying OTP for phone:", normalized);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch the most recent OTP for this phone
    const { data, error } = await admin
      .from("otp_verifications")
      .select("id, otp, verified, expires_at")
      .eq("phone", normalized)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[verify-otp] DB error:", error);
      return json(500, { ok: false, error: error.message }, origin);
    }

    if (!data) {
      return json(400, { ok: false, error: "No OTP found. Please request again." }, origin);
    }

    const expiresAt = new Date(data.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return json(400, { ok: false, error: "OTP expired. Please request again." }, origin);
    }

    // Compare OTP (stored as plain text in send-otp, so compare directly)
    // Note: send-otp stores plain OTP, not hashed
    const otpMatches = data.otp === otp.trim();
    
    if (!otpMatches) {
      console.log("[verify-otp] OTP mismatch for phone:", normalized);
      return json(400, { ok: false, error: "Invalid OTP" }, origin);
    }

    // If already verified, still allow login
    if (!data.verified) {
      // Mark OTP as verified
      const { error: updErr } = await admin
        .from("otp_verifications")
        .update({ verified: true })
        .eq("id", data.id);

      if (updErr) {
        console.error("[verify-otp] Failed to mark OTP verified:", updErr);
        // Continue anyway - OTP was valid
      }
    }

    console.log("[verify-otp] OTP verified successfully for:", normalized);

    // --- User Creation/Login ---
    // Create a deterministic email from phone number
    const emailFromPhone = `${normalized.replace("+", "")}@phone.5thvital.local`;
    const password = await generatePassword(normalized, OTP_SECRET);

    // Try to find existing user by email
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
    
    let userId: string | null = null;
    
    if (!listError && existingUsers?.users) {
      const existingUser = existingUsers.users.find(
        (u) => u.email === emailFromPhone || u.phone === normalized
      );
      if (existingUser) {
        userId = existingUser.id;
        console.log("[verify-otp] Found existing user:", userId);
      }
    }

    if (!userId) {
      // Create new user
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: emailFromPhone,
        password: password,
        phone: normalized,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          phone: normalized,
          auth_method: "otp",
        },
      });

      if (createError) {
        // If user already exists error, try to get the user
        if (createError.message?.includes("already been registered")) {
          console.log("[verify-otp] User exists, attempting to update password");
          
          // Find user by email
          const { data: usersAgain } = await admin.auth.admin.listUsers();
          const foundUser = usersAgain?.users?.find((u) => u.email === emailFromPhone);
          
          if (foundUser) {
            userId = foundUser.id;
            // Update password to ensure it matches
            await admin.auth.admin.updateUserById(userId, { password });
          } else {
            console.error("[verify-otp] Create user error:", createError);
            return json(500, { ok: false, error: "Failed to create user account" }, origin);
          }
        } else {
          console.error("[verify-otp] Create user error:", createError);
          return json(500, { ok: false, error: "Failed to create user account" }, origin);
        }
      } else if (newUser?.user) {
        userId = newUser.user.id;
        console.log("[verify-otp] Created new user:", userId);
      }
    } else {
      // User exists - update password to ensure it matches (in case secret changed)
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password: password,
      });
      if (updateErr) {
        console.warn("[verify-otp] Failed to update user password:", updateErr);
        // Continue anyway - might still work
      }
    }

    // Return success with signIn credentials
    console.log("[verify-otp] Returning success with credentials for:", emailFromPhone);
    
    return json(200, {
      ok: true,
      signIn: {
        email: emailFromPhone,
        password: password,
      },
    }, origin);
    
  } catch (e) {
    console.error("[verify-otp] Unhandled error:", e);
    return json(500, { ok: false, error: (e as Error)?.message ?? "Unknown error" }, origin);
  }
});
