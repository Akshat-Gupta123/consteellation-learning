import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthStatus = "loading" | "signedIn" | "signedOut";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let unsub: (() => void) | undefined;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setStatus(data.session?.user ? "signedIn" : "signedOut");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session?.user ? "signedIn" : "signedOut");
    });
    unsub = () => data.subscription.unsubscribe();

    return () => unsub?.();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, status, signOut };
}
