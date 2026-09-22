import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// جلب إعدادات الأسعار
export async function GET() {
  try {
    const rows =
      await sql`SELECT key, value FROM app_settings WHERE key IN ('banner_price','banner_currency','featured_price','featured_currency')`;
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    return Response.json({
      banner_price: parseFloat(settings.banner_price || "9"),
      banner_currency: settings.banner_currency || "KWD",
      featured_price: parseFloat(settings.featured_price || "5"),
      featured_currency: settings.featured_currency || "KWD",
    });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return Response.json({ error: "Failed to fetch pricing" }, { status: 500 });
  }
}

// تحديث إعدادات الأسعار (أدمن فقط)
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const userRows =
      await sql`SELECT role FROM auth_users WHERE id = ${session.user.id}`;
    if (!userRows[0] || userRows[0].role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { banner_price, banner_currency, featured_price, featured_currency } =
      body;

    const updates = [];
    if (banner_price !== undefined)
      updates.push({ key: "banner_price", value: String(banner_price) });
    if (banner_currency !== undefined)
      updates.push({ key: "banner_currency", value: banner_currency });
    if (featured_price !== undefined)
      updates.push({ key: "featured_price", value: String(featured_price) });
    if (featured_currency !== undefined)
      updates.push({ key: "featured_currency", value: featured_currency });

    for (const u of updates) {
      await sql`INSERT INTO app_settings (key, value, updated_at) VALUES (${u.key}, ${u.value}, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating pricing:", error);
    return Response.json(
      { error: "Failed to update pricing" },
      { status: 500 },
    );
  }
}
