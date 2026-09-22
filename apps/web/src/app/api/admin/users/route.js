import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب قائمة المستخدمين (للأدمن فقط)
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await sql("SELECT role FROM auth_users WHERE id = $1", [
      session.user.id,
    ]);
    if (userRole[0]?.role !== "admin") {
      return Response.json(
        { error: "Forbidden - Admin only" },
        { status: 403 },
      );
    }

    const users = await sql(
      `SELECT id, name, email, role, image, "emailVerified"
       FROM auth_users
       ORDER BY id DESC`,
    );

    return Response.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
