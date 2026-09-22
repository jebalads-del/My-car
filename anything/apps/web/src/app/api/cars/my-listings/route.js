import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب إعلانات المستخدم الحالي
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cars = await sql(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM cars c
       JOIN auth_users u ON c.user_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [session.user.id],
    );

    return Response.json({ cars });
  } catch (error) {
    console.error("Error fetching user cars:", error);
    return Response.json(
      { error: "Failed to fetch your listings" },
      { status: 500 },
    );
  }
}
