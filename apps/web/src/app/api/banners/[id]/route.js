import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function checkAdmin(session) {
  if (!session?.user?.id) return false;
  const r = await sql("SELECT role FROM auth_users WHERE id = $1", [
    session.user.id,
  ]);
  return r[0]?.role === "admin";
}

// تحديث البانر (الأدمن)
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!(await checkAdmin(session))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const setClauses = [];
    const values = [];
    let pc = 0;

    const fields = [
      "status",
      "payment_status",
      "starts_at",
      "expires_at",
      "position",
    ];
    for (const field of fields) {
      if (body[field] !== undefined) {
        pc++;
        setClauses.push(`${field} = $${pc}`);
        values.push(body[field]);
      }
    }

    if (setClauses.length === 0)
      return Response.json({ error: "Nothing to update" }, { status: 400 });

    pc++;
    setClauses.push(`updated_at = $${pc}`);
    values.push(new Date().toISOString());

    values.push(parseInt(id));
    const result = await sql(
      `UPDATE banners SET ${setClauses.join(", ")} WHERE id = $${pc + 1} RETURNING *`,
      values,
    );
    return Response.json({ banner: result[0] });
  } catch (error) {
    console.error("Error updating banner:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

// حذف البانر
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!(await checkAdmin(session))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = params;
    await sql("DELETE FROM banners WHERE id = $1", [parseInt(id)]);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
