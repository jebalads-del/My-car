import { View, ScrollView } from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import { useAdminProfile } from "@/utils/admin/useAdminProfile";
import { useAdminData } from "@/utils/admin/useAdminData";
import { UnauthenticatedView } from "@/components/Admin/UnauthenticatedView";
import { UnauthorizedView } from "@/components/Admin/UnauthorizedView";
import { AdminHeader } from "@/components/Admin/AdminHeader";
import { OverviewTab } from "@/components/Admin/Tabs/OverviewTab";
import { PendingTab } from "@/components/Admin/Tabs/PendingTab";
import { AllListingsTab } from "@/components/Admin/Tabs/AllListingsTab";
import { BannersTab } from "@/components/Admin/Tabs/BannersTab";
import { PaymentsTab } from "@/components/Admin/Tabs/PaymentsTab";
import { UsersTab } from "@/components/Admin/Tabs/UsersTab";
import { SettingsTab } from "@/components/Admin/Tabs/SettingsTab";
import { FeaturedModal } from "@/components/Admin/FeaturedModal";
import { SettingsModal } from "@/components/Admin/SettingsModal";

export default function AdminPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, signIn } = useAuth();
  const { profile, loading: profileLoading } = useAdminProfile(auth);

  const [activeTab, setActiveTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCard, setExpandedCard] = useState(null);
  const [featuredModal, setFeaturedModal] = useState({
    visible: false,
    carId: null,
    days: "30",
    isFeatured: false,
  });
  const [settingModal, setSettingModal] = useState({
    visible: false,
    data: null,
  });

  const {
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
  } = useAdminData(auth, profile);

  useEffect(() => {
    if (profile?.role === "admin") {
      loadAll();
    }
  }, [profile]);

  const handleExpandCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleFeatureClick = (carId, isFeatured) => {
    setFeaturedModal({
      visible: true,
      carId,
      days: "30",
      isFeatured,
    });
  };

  const handleFeatureConfirm = () => {
    handleToggleFeatured(
      featuredModal.carId,
      featuredModal.isFeatured,
      featuredModal.days,
    );
    setFeaturedModal({
      visible: false,
      carId: null,
      days: "30",
      isFeatured: false,
    });
  };

  const handleFeatureCancel = () => {
    setFeaturedModal({
      visible: false,
      carId: null,
      days: "30",
      isFeatured: false,
    });
  };

  const handleSettingEdit = (setting) => {
    setSettingModal({ visible: true, data: { ...setting } });
  };

  const handleSettingFieldChange = (key, value) => {
    setSettingModal((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  };

  const handleSettingSave = () => {
    handleSaveSetting(settingModal.data);
    setSettingModal({ visible: false, data: null });
  };

  const handleSettingCancel = () => {
    setSettingModal({ visible: false, data: null });
  };

  if (!auth) {
    return <UnauthenticatedView onSignIn={signIn} />;
  }

  if (profile && profile.role !== "admin") {
    return <UnauthorizedView />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <StatusBar style="light" />
      <AdminHeader
        activeTab={activeTab}
        stats={stats}
        onTabChange={setActiveTab}
        onRefresh={loadAll}
        topInset={insets.top}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 14,
          paddingBottom: insets.bottom + 90,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" && (
          <OverviewTab stats={stats} onNavigate={setActiveTab} />
        )}

        {activeTab === "pending" && (
          <PendingTab
            pendingCars={pendingCars}
            loading={loading}
            expandedCard={expandedCard}
            onExpand={handleExpandCard}
            onApprove={(id) => handleCarStatus(id, "approved")}
            onReject={(id) => handleCarStatus(id, "rejected")}
            onDelete={handleDeleteCar}
            onFeature={handleFeatureClick}
            onView={(id) => router.push(`/car/${id}`)}
          />
        )}

        {activeTab === "all_listings" && (
          <AllListingsTab
            allCars={allCars}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            loading={loading}
            expandedCard={expandedCard}
            onExpand={handleExpandCard}
            onApprove={(id) => handleCarStatus(id, "approved")}
            onReject={(id) => handleCarStatus(id, "rejected")}
            onDelete={handleDeleteCar}
            onFeature={handleFeatureClick}
            onView={(id) => router.push(`/car/${id}`)}
          />
        )}

        {activeTab === "banners" && (
          <BannersTab
            banners={banners}
            onApprove={(id) => handleBannerAction(id, "approved")}
            onReject={(id) => handleBannerAction(id, "rejected")}
            onDelete={handleDeleteBanner}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsTab
            paymentCars={paymentCars}
            onConfirm={handleConfirmPayment}
          />
        )}

        {activeTab === "users" && (
          <UsersTab
            users={users}
            onToggleRole={handleToggleUserRole}
            onDelete={handleDeleteUser}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            paymentSettings={paymentSettings}
            onEdit={handleSettingEdit}
            pricing={pricing}
            onSavePricing={handleSavePricing}
          />
        )}
      </ScrollView>

      <FeaturedModal
        visible={featuredModal.visible}
        isFeatured={featuredModal.isFeatured}
        days={featuredModal.days}
        onDaysChange={(text) =>
          setFeaturedModal((prev) => ({ ...prev, days: text }))
        }
        onConfirm={handleFeatureConfirm}
        onCancel={handleFeatureCancel}
      />

      <SettingsModal
        visible={settingModal.visible}
        setting={settingModal.data}
        onFieldChange={handleSettingFieldChange}
        onSave={handleSettingSave}
        onCancel={handleSettingCancel}
      />
    </View>
  );
}
