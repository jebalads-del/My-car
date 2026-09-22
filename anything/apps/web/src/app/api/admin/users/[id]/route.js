import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// تحديث دور المستخدم (للأدمن فقط)
export async function PUT(request, { params }) {
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

    const { id } = params;
    const body = await request.json();
    const { role } = body;

    if (!role || !["user", "admin"].includes(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    const result = await sql(
      "UPDATE auth_users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
      [role, parseInt(id)],
    );

    if (result.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user: result[0] });
  } catch (error) {
    console.error("Error updating user role:", error);
    return Response.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}

// حذف مستخدم (للأدمن فقط)
export async function DELETE(request, { params }) {
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

    const { id } = params;

    // منع المستخدم من حذف نفسه
    if (parseInt(id) === session.user.id) {
      return Response.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    await sql("DELETE FROM auth_users WHERE id = $1", [parseInt(id)]);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
