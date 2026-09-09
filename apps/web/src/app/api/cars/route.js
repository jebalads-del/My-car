import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب قائمة السيارات مع البحث والفلترة
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const year = searchParams.get("year");
    const color = searchParams.get("color");
    const maxKilometers = searchParams.get("maxKilometers");
    const status = searchParams.get("status") || "approved"; // افتراضياً نعرض الإعلانات المقبولة فقط
    const search = searchParams.get("search");
    const featured = searchParams.get("featured");
    const paymentStatus = searchParams.get("payment_status");

    let query =
      "SELECT c.*, u.name as user_name, u.email as user_email FROM cars c JOIN auth_users u ON c.user_id = u.id WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (status && status !== "all") {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    if (featured === "true") {
      query += ` AND c.is_featured = true`;
    }

    if (paymentStatus) {
      paramCount++;
      query += ` AND c.payment_status = $${paramCount}`;
      params.push(paymentStatus);
    }

    if (brand) {
      paramCount++;
      query += ` AND LOWER(c.brand) LIKE LOWER($${paramCount})`;
      params.push(`%${brand}%`);
    }

    if (year) {
      paramCount++;
      query += ` AND c.year = $${paramCount}`;
      params.push(parseInt(year));
    }

    if (color) {
      paramCount++;
      query += ` AND LOWER(c.color) LIKE LOWER($${paramCount})`;
      params.push(`%${color}%`);
    }

    if (maxKilometers) {
      paramCount++;
      query += ` AND c.kilometers <= $${paramCount}`;
      params.push(parseInt(maxKilometers));
    }

    if (search) {
      paramCount++;
      query += ` AND (LOWER(c.brand) LIKE LOWER($${paramCount}) OR LOWER(c.model) LIKE LOWER($${paramCount}) OR LOWER(c.description) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    query += " ORDER BY c.is_featured DESC, c.created_at DESC";

    const cars = await sql(query, params);
    return Response.json({ cars });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return Response.json({ error: "Failed to fetch cars" }, { status: 500 });
  }
}

// إنشاء إعلان سيارة جديد
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      brand,
      model,
      year,
      color,
      kilometers,
      description,
      price,
      currency,
      images,
      is_featured,
      payment_method,
      payment_reference,
      featured_price,
    } = body;

    if (!brand || !model || !year || !color || kilometers === undefined) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const payment_status = is_featured && payment_method ? "pending" : "none";

    const result = await sql(
      `INSERT INTO cars (user_id, brand, model, year, color, kilometers, description, price, currency, images, status, is_featured, payment_method, payment_reference, payment_status, featured_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        session.user.id,
        brand,
        model,
        parseInt(year),
        color,
        parseInt(kilometers),
        description || null,
        price || null,
        currency || "KWD",
        images || [],
        "pending",
        is_featured || false,
        payment_method || null,
        payment_reference || null,
        payment_status,
        featured_price || null,
      ],
    );

    return Response.json({ car: result[0] });
  } catch (error) {
    console.error("Error creating car:", error);
    return Response.json(
      { error: "Failed to create car listing" },
      { status: 500 },
    );
  }
}
