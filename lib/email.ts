/**
 * Email notification helper using Brevo SMTP API.
 * Gracefully skips if BREVO_API_KEY is not configured.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EmailPayload {
  to: string;
  subject: string;
  htmlContent: string;
}

function getBrevoConfig(): { apiKey: string; senderEmail: string; senderName: string } | null {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === "your-brevo-api-key-here") {
    return null;
  }

  return {
    apiKey,
    senderEmail: process.env.BREVO_SENDER_EMAIL ?? "noreply@postmateai.com",
    senderName: process.env.BREVO_SENDER_NAME ?? "PostMate AI",
  };
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const config = getBrevoConfig();
  if (!config) {
    console.log("[Email] Brevo API key not configured, skipping email send");
    console.log(`[Email] Would have sent to: ${payload.to}, subject: ${payload.subject}`);
    return false;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: config.senderName,
          email: config.senderEmail,
        },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Email] Brevo API error: ${response.status} — ${errorText}`);
      return false;
    }

    console.log(`[Email] Sent successfully to ${payload.to}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

/**
 * Send email notification when a post is published or fails.
 */
export async function sendPostResultEmail(
  to: string,
  postTitle: string,
  status: "success" | "failed",
  errorMessage?: string
): Promise<boolean> {
  const safePostTitle = escapeHtml(postTitle);
  const safeErrorMessage = errorMessage ? escapeHtml(errorMessage) : undefined;

  const isSuccess = status === "success";
  const subject = isSuccess
    ? `[PostMate AI] โพสต์สำเร็จ "${postTitle}"`
    : `[PostMate AI] โพสต์ล้มเหลว "${postTitle}"`;

  const statusColor = isSuccess ? "#22c55e" : "#ef4444";
  const statusText = isSuccess ? "โพสต์สำเร็จ" : "โพสต์ล้มเหลว";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #6366f1; border-radius: 10px; padding: 8px; margin-bottom: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h1 style="color: #1e293b; font-size: 18px; margin: 0;">PostMate AI</h1>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background: ${statusColor}15; color: ${statusColor}; padding: 4px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              ${statusText}
            </span>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">ชื่อโพสต์</p>
            <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0;">${safePostTitle}</p>
          </div>

          ${
            safeErrorMessage
              ? `
          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="color: #991b1b; font-size: 13px; margin: 0 0 4px 0;">รายละเอียดข้อผิดพลาด</p>
            <p style="color: #dc2626; font-size: 14px; margin: 0;">${safeErrorMessage}</p>
          </div>
          `
              : ""
          }

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
            อีเมลนี้ส่งอัตโนมัติจาก PostMate AI
          </p>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  return sendEmail({ to, subject, htmlContent });
}

/**
 * Send email warning about sessions expiring within 7 days.
 */
export async function sendSessionExpiryWarningEmail(
  to: string,
  projectName: string,
  platform: string,
  expiresAt: string
): Promise<boolean> {
  const expiryDate = new Date(expiresAt);
  const formattedDate = expiryDate.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const safeProjectName = escapeHtml(projectName);
  const safePlatform = escapeHtml(platform);

  const subject = `[PostMate AI] Session ใกล้หมดอายุ — ${projectName} (${platform})`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #6366f1; border-radius: 10px; padding: 8px; margin-bottom: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h1 style="color: #1e293b; font-size: 18px; margin: 0;">PostMate AI</h1>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background: #fef3c715; color: #f59e0b; padding: 4px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid #fcd34d;">
              Session ใกล้หมดอายุ
            </span>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">โปรเจค</p>
            <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0;">${safeProjectName}</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">แพลตฟอร์ม</p>
            <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin: 0; text-transform: capitalize;">${safePlatform}</p>
          </div>

          <div style="background: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="color: #92400e; font-size: 13px; margin: 0 0 4px 0;">หมดอายุวันที่</p>
            <p style="color: #b45309; font-size: 15px; font-weight: 600; margin: 0;">${formattedDate}</p>
          </div>

          <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
            กรุณาเชื่อมต่อ session ใหม่ก่อนวันหมดอายุ เพื่อให้ระบบ auto-post ทำงานได้ต่อเนื่อง
          </p>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            อีเมลนี้ส่งอัตโนมัติจาก PostMate AI
          </p>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  return sendEmail({ to, subject, htmlContent });
}

/**
 * Check for project sessions expiring within 7 days and send warning emails.
 * Uses service-role client to bypass RLS.
 */
export async function checkSessionExpiry(): Promise<{
  checked: number;
  warnings: number;
  errors: string[];
}> {
  // Dynamic import to avoid circular dependency
  const { createServiceClient } = await import("@/lib/supabase/service");

  const supabase = createServiceClient();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const result = {
    checked: 0,
    warnings: 0,
    errors: [] as string[],
  };

  try {
    // Find active sessions expiring within 7 days
    const { data: sessions, error: sessionsError } = await supabase
      .from("project_sessions")
      .select(`
        id,
        project_id,
        platform,
        expires_at,
        projects!inner (
          id,
          project_name,
          client_id,
          clients!inner (
            id,
            owner_id,
            name
          )
        )
      `)
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", sevenDaysFromNow.toISOString())
      .gte("expires_at", now.toISOString());

    if (sessionsError) {
      result.errors.push(`Query error: ${sessionsError.message}`);
      return result;
    }

    if (!sessions || sessions.length === 0) {
      return result;
    }

    result.checked = sessions.length;

    for (const session of sessions) {
      // Type assertion for the joined data
      const project = session.projects as unknown as {
        id: string;
        project_name: string;
        client_id: string;
        clients: { id: string; owner_id: string; name: string };
      };

      if (!project?.clients?.owner_id) {
        continue;
      }

      // Get owner email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        project.clients.owner_id
      );

      if (userError || !userData?.user?.email) {
        result.errors.push(
          `Could not get email for owner ${project.clients.owner_id}: ${userError?.message ?? "no email"}`
        );
        continue;
      }

      try {
        const sent = await sendSessionExpiryWarningEmail(
          userData.user.email,
          project.project_name,
          session.platform,
          session.expires_at as string
        );

        if (sent) {
          result.warnings++;
        }
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : String(emailError);
        result.errors.push(`Email send failed: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unexpected error: ${message}`);
  }

  return result;
}
