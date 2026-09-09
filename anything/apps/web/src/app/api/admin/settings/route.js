import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function checkAdmin(session) {
  if (!session?.user?.id) return false;
  const r = await sql("SELECT role FROM auth_users WHERE id = $1", [
    session.user.id,
  ]);
  return r[0]?.role === "admin";
}

// جلب إعدادات الدفع - عام للجميع
export async function GET() {
  try {
    const settings = await sql(
      `SELECT * FROM payment_settings ORDER BY id ASC`,
    );
    return Response.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return Response.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// تحديث إعدادات الدفع - للأدمن فقط
export async function PUT(request) {
  try {
    const session = await auth();
    if (!(await checkAdmin(session))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      method,
      display_name,
      is_active,
      instructions,
      account_info,
      extra_info,
    } = body;

    if (!method)
      return Response.json({ error: "Method required" }, { status: 400 });

    const result = await sql(
      `INSERT INTO payment_settings (method, display_name, is_active, instructions, account_info, extra_info, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (method) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         is_active = EXCLUDED.is_active,
         instructions = EXCLUDED.instructions,
         account_info = EXCLUDED.account_info,
         extra_info = EXCLUDED.extra_info,
         updated_at = NOW()
       RETURNING *`,
      [
        method,
        display_name,
        is_active ?? true,
        instructions,
        account_info,
        extra_info,
      ],
    );

    return Response.json({ setting: result[0] });
  } catch (error) {
    console.error("Error updating settings:", error);
    return Response.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
