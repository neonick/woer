import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { withBasePath } from '../lib/base-path';
import { supabase } from '../lib/supabase';

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setEmail(user?.email ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setEmail(user?.email ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    const redirectTo = `${window.location.origin}${withBasePath('auth/callback')}`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-xs text-[color:rgba(var(--muted-rgb),0.4)]">
        ·
      </span>
    );
  }

  if (!email) {
    return (
      <button
        onClick={signIn}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[color:rgba(var(--line-rgb),0.16)] bg-[color:rgba(var(--panel-rgb),0.82)] px-4 text-sm text-[color:rgb(var(--text-rgb))] hover:border-[color:rgba(var(--accent-rgb),0.28)] hover:bg-[color:rgba(var(--panel-strong-rgb),0.96)] transition-colors"
      >
        <LogIn size={14} />
        Войти через Google
      </button>
    );
  }

  return (
    <button
      onClick={signOut}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[color:rgba(var(--muted-rgb),0.5)] hover:text-[color:rgb(var(--text-rgb))] transition-colors"
      title="Выйти"
    >
      <LogOut size={14} />
    </button>
  );
}