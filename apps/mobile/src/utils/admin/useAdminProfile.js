import { useState, useEffect } from "react";

export function useAdminProfile(auth) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth) checkAdmin();
  }, [auth]);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading };
}
