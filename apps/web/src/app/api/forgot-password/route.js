import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/app/api/utils/send-email";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json(
        { error: "البريد الإلكتروني مطلوب" },
        { status: 400 },
      );
    }

    // Check if user exists
    const users = await sql`
      SELECT id, email, name FROM auth_users WHERE email = ${email} LIMIT 1
    `;

    // Always return success to avoid email enumeration
    if (users.length === 0) {
      return Response.json({
        message: "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة قريباً",
      });
    }

    const user = users[0];

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens for this user
    await sql`
      UPDATE password_reset_tokens SET used = true WHERE user_id = ${user.id} AND used = false
    `;

    // Save new token
    await sql`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (${token}, ${user.id}, ${expiresAt})
    `;

    const resetUrl = `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/reset-password?token=${token}`;

    // If no API key, log the link and return success without crashing
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set. Reset link:", resetUrl);
      return Response.json({
        message:
          "تم إنشاء رابط إعادة التعيين — يرجى إعداد RESEND_API_KEY لإرسال البريد الإلكتروني",
        ...(process.env.NODE_ENV !== "production"
          ? { devResetUrl: resetUrl }
          : {}),
      });
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "إعادة تعيين كلمة المرور - سوق السيارات",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af;">إعادة تعيين كلمة المرور</h2>
            <p>مرحباً ${user.name || ""},</p>
            <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في سوق السيارات.</p>
            <p>انقر على الزر أدناه لإعادة تعيين كلمة المرور الخاصة بك:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #60A5FA; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              إعادة تعيين كلمة المرور
            </a>
            <p style="color: #6b7280; font-size: 14px;">هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
            <p style="color: #6b7280; font-size: 14px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
      return Response.json({
        message:
          "تم حفظ الطلب لكن فشل إرسال البريد الإلكتروني. تأكد من إعداد RESEND_API_KEY.",
      });
    }

    return Response.json({
      message: "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة قريباً",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return Response.json(
      { error: "حدث خطأ. الرجاء المحاولة لاحقاً." },
      { status: 500 },
    );
  }
}
