import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب البانرات المقبولة - عام
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position");
    const status = searchParams.get("status") || "approved";
    const all = searchParams.get("all");

    let query = `SELECT b.*, u.name as user_name, u.email as user_email
                 FROM banners b JOIN auth_users u ON b.user_id = u.id WHERE 1=1`;
    const params = [];
    let pc = 0;

    if (!all) {
      pc++;
      query += ` AND b.status = $${pc}`;
      params.push(status);
    }
    if (position) {
      pc++;
      query += ` AND b.position = $${pc}`;
      params.push(position);
    }

    query += " ORDER BY b.created_at DESC";
    const banners = await sql(query, params);
    return Response.json({ banners });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

// إنشاء طلب بانر جديد
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      image_url,
      link_url,
      position,
      payment_method,
      payment_reference,
      price,
    } = body;

    if (!title || !image_url) {
      return Response.json(
        { error: "Title and image required" },
        { status: 400 },
      );
    }

    const result = await sql(
      `INSERT INTO banners (user_id, title, description, image_url, link_url, position, payment_method, payment_reference, payment_status, price, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending') RETURNING *`,
      [
        session.user.id,
        title,
        description || null,
        image_url,
        link_url || null,
        position || "top",
        payment_method || null,
        payment_reference || null,
        payment_method ? "pending" : "none",
        price || null,
      ],
    );

    return Response.json({ banner: result[0] });
  } catch (error) {
    console.error("Error creating banner:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
