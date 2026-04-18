import { useEffect, useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { withBasePath } from '../lib/base-path';
import { supabase } from '../lib/supabase';

type Profile = { display_name: string; avatar_url: string | null; is_admin: boolean };

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setEmail(user?.email ?? null);
      if (user) loadProfile(user.id);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setEmail(user?.email ?? null);
      if (user) loadProfile(user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(id: string) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, is_admin')
      .eq('id', id)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  }

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
      <span className="inline-flex min-w-[6.5rem] justify-center rounded-md border border-[color:rgba(var(--line-rgb),0.14)] bg-[color:rgba(var(--panel-rgb),0.82)] px-3 py-2 text-xs text-[color:rgba(var(--muted-rgb),0.94)]">
        ...
      </span>
    );
  }

  if (!email) {
    return (
      <button
        onClick={signIn}
        className="inline-flex items-center gap-2 rounded-md border border-[color:rgba(var(--line-rgb),0.16)] bg-[color:rgba(var(--panel-rgb),0.82)] px-4 py-2 text-sm text-[color:rgb(var(--text-rgb))] hover:border-[color:rgba(var(--accent-rgb),0.28)] hover:bg-[color:rgba(var(--panel-strong-rgb),0.96)]"
      >
        <LogIn size={14} />
        Войти через Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-[color:rgba(var(--line-rgb),0.14)] bg-[color:rgba(var(--panel-rgb),0.82)] px-3 py-2 text-sm">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="h-8 w-8 rounded-full border border-[color:rgba(var(--line-rgb),0.18)]"
        />
      ) : (
        <User size={16} className="text-[color:rgba(var(--muted-rgb),0.7)]" />
      )}
      <div className="flex flex-col">
        <span className="text-[color:rgb(var(--text-rgb))]">{profile?.display_name ?? email}</span>
        <span className="text-xs text-[color:rgba(var(--muted-rgb),0.92)]">
          {email}
          {profile?.is_admin && (
            <span className="ml-2 text-[color:rgb(var(--accent-strong-rgb))]">admin</span>
          )}
        </span>
      </div>
      <button
        onClick={signOut}
        className="rounded-md border border-[color:rgba(var(--line-rgb),0.12)] px-3 py-1 text-xs text-[color:rgba(var(--muted-rgb),0.92)] hover:border-[color:rgba(var(--accent-rgb),0.22)] hover:text-[color:rgb(var(--text-rgb))]"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
