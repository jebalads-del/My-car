import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب تفاصيل سيارة معينة
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const result = await sql(
      `SELECT c.*, u.name as user_name, u.email as user_email, u.id as user_id
       FROM cars c
       JOIN auth_users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [parseInt(id)],
    );

    if (result.length === 0) {
      return Response.json({ error: "Car not found" }, { status: 404 });
    }

    return Response.json({ car: result[0] });
  } catch (error) {
    console.error("Error fetching car:", error);
    return Response.json(
      { error: "Failed to fetch car details" },
      { status: 500 },
    );
  }
}

// تحديث إعلان السيارة (للمستخدم صاحب الإعلان أو الأدمن)
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // التحقق من صلاحيات المستخدم
    const userRole = await sql("SELECT role FROM auth_users WHERE id = $1", [
      session.user.id,
    ]);
    const isAdmin = userRole[0]?.role === "admin";

    const existingCar = await sql("SELECT * FROM cars WHERE id = $1", [
      parseInt(id),
    ]);
    if (existingCar.length === 0) {
      return Response.json({ error: "Car not found" }, { status: 404 });
    }

    const isOwner = existingCar[0].user_id === session.user.id;

    if (!isAdmin && !isOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const setClauses = [];
    const values = [];
    let paramCount = 0;

    // الحقول التي يمكن للمستخدم العادي تعديلها
    if (isOwner || isAdmin) {
      if (body.brand !== undefined) {
        paramCount++;
        setClauses.push(`brand = $${paramCount}`);
        values.push(body.brand);
      }
      if (body.model !== undefined) {
        paramCount++;
        setClauses.push(`model = $${paramCount}`);
        values.push(body.model);
      }
      if (body.year !== undefined) {
        paramCount++;
        setClauses.push(`year = $${paramCount}`);
        values.push(parseInt(body.year));
      }
      if (body.color !== undefined) {
        paramCount++;
        setClauses.push(`color = $${paramCount}`);
        values.push(body.color);
      }
      if (body.kilometers !== undefined) {
        paramCount++;
        setClauses.push(`kilometers = $${paramCount}`);
        values.push(parseInt(body.kilometers));
      }
      if (body.description !== undefined) {
        paramCount++;
        setClauses.push(`description = $${paramCount}`);
        values.push(body.description);
      }
      if (body.price !== undefined) {
        paramCount++;
        setClauses.push(`price = $${paramCount}`);
        values.push(body.price);
      }
      if (body.images !== undefined) {
        paramCount++;
        setClauses.push(`images = $${paramCount}`);
        values.push(body.images);
      }
    }

    // فقط الأدمن يمكنه تغيير الحالة والإعلان المميز
    if (isAdmin && body.status !== undefined) {
      paramCount++;
      setClauses.push(`status = $${paramCount}`);
      values.push(body.status);
    }
    if (isAdmin && body.is_featured !== undefined) {
      paramCount++;
      setClauses.push(`is_featured = $${paramCount}`);
      values.push(body.is_featured);
    }
    if (isAdmin && body.payment_status !== undefined) {
      paramCount++;
      setClauses.push(`payment_status = $${paramCount}`);
      values.push(body.payment_status);
    }
    if (isAdmin && body.featured_expires_at !== undefined) {
      paramCount++;
      setClauses.push(`featured_expires_at = $${paramCount}`);
      values.push(body.featured_expires_at);
    }
    if (isAdmin && body.admin_note !== undefined) {
      paramCount++;
      setClauses.push(`admin_note = $${paramCount}`);
      values.push(body.admin_note);
    }

    if (setClauses.length === 0) {
      return Response.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());

    const query = `UPDATE cars SET ${setClauses.join(", ")} WHERE id = $${paramCount + 1} RETURNING *`;
    values.push(parseInt(id));

    const result = await sql(query, values);
    return Response.json({ car: result[0] });
  } catch (error) {
    console.error("Error updating car:", error);
    return Response.json({ error: "Failed to update car" }, { status: 500 });
  }
}

// حذف إعلان السيارة
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const userRole = await sql("SELECT role FROM auth_users WHERE id = $1", [
      session.user.id,
    ]);
    const isAdmin = userRole[0]?.role === "admin";

    const existingCar = await sql("SELECT * FROM cars WHERE id = $1", [
      parseInt(id),
    ]);
    if (existingCar.length === 0) {
      return Response.json({ error: "Car not found" }, { status: 404 });
    }

    const isOwner = existingCar[0].user_id === session.user.id;

    if (!isAdmin && !isOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await sql("DELETE FROM cars WHERE id = $1", [parseInt(id)]);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting car:", error);
    return Response.json({ error: "Failed to delete car" }, { status: 500 });
  }
}
