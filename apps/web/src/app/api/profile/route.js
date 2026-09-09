import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب بيانات المستخدم الحالي مع الدور
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sql(
      "SELECT id, name, email, image, role FROM auth_users WHERE id = $1",
      [session.user.id],
    );

    if (result.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user: result[0] });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
