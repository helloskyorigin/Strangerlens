import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  getClientIp,
  checkAndAcquireRateLimit,
} from "@/server/security/rateLimiter";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting / Abuse Protection
    const clientIp = getClientIp(req);
    const limitCheck = checkAndAcquireRateLimit(clientIp, {
      scope: "early-access",
      maxPerMinute: 5,
      maxConcurrent: 5,
    });

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again in a moment.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitCheck.retryAfterSeconds || 60),
          },
        }
      );
    }

    // 2. Parse and Validate Email
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EMAIL",
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // 3. Check SMTP Configuration
    const smtpUser = process.env.GMAIL_SMTP_USER?.trim();
    const smtpPass = process.env.GMAIL_APP_PASSWORD?.trim();
    const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL?.trim() || "hello.skyorigin@gmail.com";

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        {
          success: false,
          error: "SMTP_NOT_CONFIGURED",
          message: "Early Access waitlist is temporarily unavailable (Gmail SMTP is not configured). Please check back soon.",
        },
        { status: 503 }
      );
    }

    // 4. Create Nodemailer Transport
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const submittedAt = new Date().toUTCString();

    const mailOptions = {
      from: `"StrangerLens Waitlist" <${smtpUser}>`,
      to: notifyEmail,
      replyTo: email,
      subject: "StrangerLens — New Early Access Signup",
      text: `New Early Access Signup!\n\nEmail: ${email}\nSubmitted at: ${submittedAt}\nSource: StrangerLens`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #090D15; color: #F1F5F9; border-radius: 12px;">
          <h2 style="color: #3B82F6; margin-top: 0;">New Early Access Signup!</h2>
          <p style="font-size: 15px; color: #94A3B8;">A new user has requested early access to StrangerLens Full Analysis.</p>
          <div style="background: #121824; border: 1px solid #263044; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #60A5FA;">${email}</a></p>
            <p style="margin: 0 0 8px 0;"><strong>Submitted at:</strong> ${submittedAt}</p>
            <p style="margin: 0;"><strong>Source:</strong> StrangerLens Early Access</p>
          </div>
          <p style="font-size: 12px; color: #64748B; margin-top: 24px;">This notification was sent automatically by StrangerLens.</p>
        </div>
      `,
    };

    // 5. Send Email via Gmail SMTP
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      {
        success: true,
        message: "You're on the list! We'll email you when full analysis becomes available.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    // Never log credentials or sensitive data
    console.error("Early access submission error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        success: false,
        error: "SMTP_SEND_FAILED",
        message: "We couldn't submit your email right now due to a mail server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}
