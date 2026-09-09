"use client";
import { useState } from "react";
import useUser from "@/utils/useUser";

export default function ExportPage() {
  const { data: user, loading } = useUser();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/export-db");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "فشل التحميل");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `database-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <p style={{ color: "#6b7280", fontSize: "18px" }}>جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{ color: "#ef4444", fontSize: "18px", marginBottom: "16px" }}
          >
            يجب تسجيل الدخول أولاً
          </p>
          <a
            href="/account/signin"
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <p style={{ color: "#ef4444", fontSize: "18px" }}>
          غير مصرح — مشرف فقط
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: "60px", marginBottom: "20px" }}>🗄️</div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          تصدير قاعدة البيانات
        </h1>
        <p
          style={{ color: "#6b7280", marginBottom: "32px", lineHeight: "1.6" }}
        >
          سيتم تحميل جميع بيانات المشروع كملف JSON يشمل السيارات، الإعلانات،
          المدفوعات، والمستخدمين
        </p>

        {/* Info boxes */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
            textAlign: "right",
          }}
        >
          <p style={{ color: "#166534", fontSize: "14px", margin: 0 }}>
            ✅ السيارات والإعلانات
          </p>
        </div>
        <div
          style={{
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
            textAlign: "right",
          }}
        >
          <p style={{ color: "#166534", fontSize: "14px", margin: 0 }}>
            ✅ المدفوعات وإعدادات الدفع
          </p>
        </div>
        <div
          style={{
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "24px",
            textAlign: "right",
          }}
        >
          <p style={{ color: "#166534", fontSize: "14px", margin: 0 }}>
            ✅ بيانات المستخدمين (بدون كلمات المرور)
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
            }}
          >
            <p style={{ color: "#dc2626", fontSize: "14px", margin: 0 }}>
              ❌ {error}
            </p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            width: "100%",
            backgroundColor: downloading ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: downloading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {downloading ? "⏳ جاري التحميل..." : "📥 تحميل قاعدة البيانات"}
        </button>

        <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "16px" }}>
          الملف بصيغة JSON — يمكن فتحه أو استيراده لاحقاً
        </p>
      </div>
    </div>
  );
}
