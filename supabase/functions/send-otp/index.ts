// supabase/functions/send-otp/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  return v ? v.trim() : "";
}

function normalizePhone(phoneRaw: string): string {
  // Normalize phone number:
  // - trim whitespace
  // - remove ALL spaces and hyphens
  // - ensure starts with "+"
  // - DO NOT add country code implicitly
  let p = (phoneRaw || "").trim();
  if (!p) return "";
  
  // Remove all spaces and hyphens
  p = p.replace(/[\s\-]/g, "");
  
  // Ensure it starts with "+"
  if (!p.startsWith("+")) {
    p = `+${p}`;
  }
  
  return p;
}

function generateOtp(): string {
  // 6-digit OTP, leading zeros allowed
  const n = Math.floor(Math.random() * 1000000);
  return n.toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone ?? "");

    if (!phone || !phone.startsWith("+")) {
      return json(400, { ok: false, error: "Invalid phone. Use E.164 e.g. +919876543210" });
    }

    // --- Required Supabase env ---
    const SUPABASE_URL = getEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase env:", {
        hasUrl: !!SUPABASE_URL,
        hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      return json(500, { ok: false, error: "Server misconfigured (Supabase env missing)" });
    }

    // --- Twilio env (either Messaging Service SID OR From Number) ---
    const TWILIO_ACCOUNT_SID = getEnv("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = getEnv("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM_NUMBER = getEnv("TWILIO_FROM_NUMBER");
    const TWILIO_MESSAGING_SERVICE_SID = getEnv("TWILIO_MESSAGING_SERVICE_SID");

    const hasTwilio =
      !!TWILIO_ACCOUNT_SID &&
      !!TWILIO_AUTH_TOKEN &&
      (!!TWILIO_MESSAGING_SERVICE_SID || !!TWILIO_FROM_NUMBER);

    if (!hasTwilio) {
      console.error(
        "Missing Twilio credentials:",
        JSON.stringify({
          hasAccountSid: !!TWILIO_ACCOUNT_SID,
          hasAuthToken: !!TWILIO_AUTH_TOKEN,
          hasFromNumber: !!TWILIO_FROM_NUMBER,
          hasMessagingServiceSid: !!TWILIO_MESSAGING_SERVICE_SID,
        }),
      );
      return json(500, { ok: false, error: "Server misconfigured (Twilio env missing)" });
    }

    // Generate OTP + expiry
    const otp = generateOtp();
    const ttlMinutes = 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    // Write OTP to DB using SERVICE ROLE (bypasses RLS)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Best-effort cleanup + insert; DO NOT throw if DB fails
    let dbOk = true;
    try {
      // delete old unverified OTPs for this phone (optional)
      await admin
        .from("otp_verifications")
        .delete()
        .eq("phone", phone)
        .eq("verified", false);

      const ins = await admin.from("otp_verifications").insert({
        phone,
        otp,
        verified: false,
        expires_at: expiresAt,
      });

      if (ins.error) {
        dbOk = false;
        console.error("DB insert otp_verifications failed:", ins.error);
      }
    } catch (e) {
      dbOk = false;
      console.error("DB write exception:", e);
    }

    // Send SMS via Twilio
    try {
      const twilioMod = await import("npm:twilio@5.5.1");
      const twilio = twilioMod.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      const msgBody = `Your 5thvital OTP is ${otp}. Valid for ${ttlMinutes} minutes.`;

      const payload: Record<string, string> = {
        to: phone,
        body: msgBody,
      };

      if (TWILIO_MESSAGING_SERVICE_SID) {
        payload.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
      } else {
        payload.from = TWILIO_FROM_NUMBER;
      }

      await twilio.messages.create(payload);

      console.log(`OTP sent to ${phone}: ${otp}`);

      // IMPORTANT: Always return 200 OK if SMS sent
      return json(200, {
        ok: true,
        phone,
        expires_in_seconds: ttlMinutes * 60,
        db_saved: dbOk,
      });
    } catch (e) {
      console.error("Twilio send failed:", e);
      return json(500, { ok: false, error: "Failed to send OTP" });
    }
  } catch (e) {
    console.error("Unhandled send-otp error:", e);
    return json(500, { ok: false, error: "Internal error" });
  }
});
