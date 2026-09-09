import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "غير مصرح" }, { status: 401 });
    }

    // Check if user is admin
    const users = await sql("SELECT role FROM auth_users WHERE id = $1", [
      session.user.id,
    ]);

    if (!users.length || users[0].role !== "admin") {
      return Response.json({ error: "غير مصرح - مشرف فقط" }, { status: 403 });
    }

    // Export all tables
    const cars = await sql("SELECT * FROM cars ORDER BY created_at DESC");
    const banners = await sql("SELECT * FROM banners ORDER BY created_at DESC");
    const payments = await sql(
      "SELECT * FROM payments ORDER BY created_at DESC",
    );
    const paymentSettings = await sql("SELECT * FROM payment_settings");
    const appSettings = await sql("SELECT * FROM app_settings");
    const authUsers = await sql(
      `SELECT id, name, email, role, "emailVerified" FROM auth_users ORDER BY id`,
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      tables: {
        cars,
        banners,
        payments,
        payment_settings: paymentSettings,
        app_settings: appSettings,
        users: authUsers,
      },
      summary: {
        total_cars: cars.length,
        total_banners: banners.length,
        total_payments: payments.length,
        total_users: authUsers.length,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="database-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return Response.json({ error: "فشل التصدير" }, { status: 500 });
  }
}
