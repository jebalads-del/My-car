import sql from "@/app/api/utils/sql";
import argon2 from "argon2";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return Response.json(
        { error: "الرمز وكلمة المرور مطلوبان" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 },
      );
    }

    // Find valid token
    const tokens = await sql`
      SELECT prt.*, au.id as user_id, au.email
      FROM password_reset_tokens prt
      JOIN auth_users au ON prt.user_id = au.id
      WHERE prt.token = ${token}
        AND prt.used = false
        AND prt.expires_at > NOW()
    `;

    if (tokens.length === 0) {
      return Response.json(
        { error: "الرابط غير صالح أو منتهي الصلاحية" },
        { status: 400 },
      );
    }

    const resetToken = tokens[0];

    // Hash the new password
    const hashedPassword = await argon2.hash(password);

    // Update password and mark token as used
    await sql.transaction([
      sql`
        UPDATE auth_accounts
        SET password = ${hashedPassword}
        WHERE "userId" = ${resetToken.user_id} AND type = 'credentials'
      `,
      sql`
        UPDATE password_reset_tokens
        SET used = true
        WHERE token = ${token}
      `,
    ]);

    return Response.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    console.error("Reset password error:", error);
    return Response.json(
      { error: "حدث خطأ. الرجاء المحاولة لاحقاً." },
      { status: 500 },
    );
  }
}
