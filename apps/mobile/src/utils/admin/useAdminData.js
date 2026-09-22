import { useState, useEffect } from "react";
import { Alert } from "react-native";

export function useAdminData(auth, profile) {
  const [loading, setLoading] = useState(true);
  const [pendingCars, setPendingCars] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [users, setUsers] = useState([]);
  const [paymentCars, setPaymentCars] = useState([]);
  const [banners, setBanners] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState([]);
  const [pricing, setPricing] = useState({
    banner_price: "9",
    banner_currency: "KWD",
    featured_price: "5",
    featured_currency: "KWD",
  });
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    users: 0,
    paymentsWaiting: 0,
    bannersWaiting: 0,
  });

  const fetchCars = async () => {
    try {
      const [all, pending, pay] = await Promise.all([
        fetch("/api/cars?status=all").then((r) => r.json()),
        fetch("/api/cars?status=pending").then((r) => r.json()),
        fetch("/api/cars?status=all&payment_status=pending").then((r) =>
          r.json(),
        ),
      ]);
      setAllCars(all.cars || []);
      setPendingCars(pending.cars || []);
      const waitPay = (pay.cars || []).filter(
        (c) => c.payment_status === "pending",
      );
      setPaymentCars(waitPay);
      setStats((prev) => ({
        ...prev,
        pending: (pending.cars || []).length,
        approved: (all.cars || []).filter((c) => c.status === "approved")
          .length,
        rejected: (all.cars || []).filter((c) => c.status === "rejected")
          .length,
        featured: (all.cars || []).filter((c) => c.is_featured).length,
        paymentsWaiting: waitPay.length,
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setStats((prev) => ({ ...prev, users: (data.users || []).length }));
      }
    } catch {}
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/banners?all=true");
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
        const waiting = (data.banners || []).filter(
          (b) => b.status === "pending",
        ).length;
        setStats((prev) => ({ ...prev, bannersWaiting: waiting }));
      }
    } catch {}
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data.settings || []);
      }
    } catch {}
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      if (res.ok) {
        const data = await res.json();
        setPricing({
          banner_price: String(data.banner_price),
          banner_currency: data.banner_currency || "KWD",
          featured_price: String(data.featured_price),
          featured_currency: data.featured_currency || "KWD",
        });
      }
    } catch {}
  };

  const handleSavePricing = async (pricingData) => {
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        banner_price: parseFloat(pricingData.banner_price) || 0,
        banner_currency: pricingData.banner_currency,
        featured_price: parseFloat(pricingData.featured_price) || 0,
        featured_currency: pricingData.featured_currency,
      }),
    });
    if (res.ok) {
      Alert.alert("✅ تم حفظ الأسعار بنجاح");
      setPricing(pricingData);
      return true;
    }
    Alert.alert("خطأ", "فشل حفظ الأسعار");
    return false;
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchCars(),
      fetchUsers(),
      fetchBanners(),
      fetchPaymentSettings(),
      fetchPricing(),
    ]);
    setLoading(false);
  };

  const handleCarStatus = async (carId, status) => {
    const res = await fetch(`/api/cars/${carId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      Alert.alert(
        "✅ نجح",
        status === "approved" ? "تم قبول الإعلان" : "تم رفض الإعلان",
      );
      fetchCars();
    }
  };

  const handleDeleteCar = (carId) => {
    Alert.alert("حذف الإعلان", "لا يمكن التراجع!", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const res = await fetch(`/api/cars/${carId}`, { method: "DELETE" });
          if (res.ok) {
            Alert.alert("✅ تم");
            fetchCars();
          }
        },
      },
    ]);
  };

  const handleToggleFeatured = async (carId, isFeatured, days) => {
    const exp = new Date();
    exp.setDate(exp.getDate() + (parseInt(days) || 30));
    const res = await fetch(`/api/cars/${carId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_featured: !isFeatured,
        featured_expires_at: !isFeatured ? exp.toISOString() : null,
      }),
    });
    if (res.ok) {
      Alert.alert("✅ نجح");
      fetchCars();
    }
  };

  const handleConfirmPayment = (carId, confirm) => {
    Alert.alert(
      confirm ? "تأكيد الدفع" : "رفض الدفع",
      confirm ? "هل تأكدت من استلام المبلغ؟" : "رفض الطلب؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => {
            const body = { payment_status: confirm ? "confirmed" : "rejected" };
            if (confirm) body.is_featured = true;
            const res = await fetch(`/api/cars/${carId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (res.ok) {
              Alert.alert("✅ نجح");
              fetchCars();
            }
          },
        },
      ],
    );
  };

  const handleBannerAction = (bannerId, status) => {
    Alert.alert(
      status === "approved" ? "قبول البانر" : "رفض البانر",
      "تأكيد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => {
            const res = await fetch(`/api/banners/${bannerId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            });
            if (res.ok) {
              Alert.alert("✅ نجح");
              fetchBanners();
            }
          },
        },
      ],
    );
  };

  const handleDeleteBanner = (bannerId) => {
    Alert.alert("حذف البانر", "لا يمكن التراجع!", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const res = await fetch(`/api/banners/${bannerId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            Alert.alert("✅ تم");
            fetchBanners();
          }
        },
      },
    ]);
  };

  const handleSaveSetting = async (setting) => {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setting),
    });
    if (res.ok) {
      Alert.alert("✅ تم الحفظ");
      fetchPaymentSettings();
    }
  };

  const handleToggleUserRole = (userId, role) => {
    const newRole = role === "admin" ? "user" : "admin";
    Alert.alert(
      "تغيير الدور",
      `تحويل إلى ${newRole === "admin" ? "مدير" : "مستخدم"}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: async () => {
            const res = await fetch(`/api/admin/users/${userId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
              Alert.alert("✅ نجح");
              fetchUsers();
            }
          },
        },
      ],
    );
  };

  const handleDeleteUser = (userId) => {
    Alert.alert("حذف المستخدم", "سيتم حذف المستخدم وجميع بياناته!", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            Alert.alert("✅ تم");
            loadAll();
          }
        },
      },
    ]);
  };

  return {
    loading,
    pendingCars,
    allCars,
    users,
    paymentCars,
    banners,
    paymentSettings,
    pricing,
    stats,
    loadAll,
    handleCarStatus,
    handleDeleteCar,
    handleToggleFeatured,
    handleConfirmPayment,
    handleBannerAction,
    handleDeleteBanner,
    handleSaveSetting,
    handleSavePricing,
    handleToggleUserRole,
    handleDeleteUser,
  };
}
