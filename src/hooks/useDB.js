// Gives any component an authenticated Supabase client
// Usage: const { db, userId, loading } = useDB()
import { useState, useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getSupabaseWithAuth } from "../lib/supabase";

const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // refresh every 50 min (token expires at 60)

export default function useDB() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const refreshToken = async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken({ template: "supabase" });
      if (token) setDb(getSupabaseWithAuth(token));
    } catch (e) {
      console.warn("Token refresh failed:", e.message);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setDb(null);
      setLoading(false);
      // Clear any running refresh interval
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let cancelled = false;

    // Initial token fetch
    (async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (!cancelled && token) setDb(getSupabaseWithAuth(token));
      } catch (e) {
        console.error("Failed to get Supabase token:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Auto-refresh token before it expires
    intervalRef.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoaded, isSignedIn, getToken]);

  return {
    db,
    userId: user?.id,
    userEmail: user?.emailAddresses?.[0]?.emailAddress,
    loading,
    isSignedIn,
  };
}
