import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// نقطة نهاية لترقية المستخدم الأول إلى أدمن
// يجب حذف هذا الملف بعد إنشاء أول مستخدم أدمن
export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in first" },
        { status: 401 },
      );
    }

    // ترقية المستخدم الحالي إلى أدمن
    const result = await sql(
      "UPDATE auth_users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
      ["admin", session.user.id],
    );

    if (result.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "You are now an admin! Please delete this route for security.",
      user: result[0],
    });
  } catch (error) {
    console.error("Error making admin:", error);
    return Response.json(
      { error: "Failed to promote to admin" },
      { status: 500 },
    );
  }
}
