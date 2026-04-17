import { useEffect, useState } from 'react';
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
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) return <span className="text-xs text-neutral-500">…</span>;

  if (!email) {
    return (
      <button
        onClick={signIn}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
      >
        Войти через Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {profile?.avatar_url && (
        <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full" />
      )}
      <div className="flex flex-col">
        <span className="text-neutral-200">{profile?.display_name ?? email}</span>
        <span className="text-xs text-neutral-500">
          {email}
          {profile?.is_admin && <span className="ml-2 text-amber-500">admin</span>}
        </span>
      </div>
      <button
        onClick={signOut}
        className="rounded-md border border-neutral-800 px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
      >
        Выйти
      </button>
    </div>
  );
}