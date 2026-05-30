// hooks/useDB.js — Gives any component an authenticated Supabase client
// Usage: const { db, userId, loading } = useDB()
import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getSupabaseWithAuth } from "../lib/supabase";

export default function useDB() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setDb(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // 'supabase' is the name of the JWT template you create in Clerk dashboard
        const token = await getToken({ template: "supabase" });
        console.log(token, "token-------------");
        if (!cancelled && token) {
          setDb(getSupabaseWithAuth(token));
        }
      } catch (e) {
        console.error("Failed to get Supabase token:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return { db, userId: user?.id, loading, isSignedIn };
}
