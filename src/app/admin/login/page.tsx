'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Btn } from '@/components/Btn';
import { Ornament } from '@/components/Ornament';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/admin`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        color: 'var(--cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="italic" style={{ fontSize: 16, color: 'var(--gold-soft)' }}>
            a &amp; f
          </div>
          <div
            className="serif italic"
            style={{ fontSize: 38, marginTop: 6, lineHeight: 1, letterSpacing: '.02em' }}
          >
            admin
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <Ornament />
          </div>
          <div className="mono" style={{ fontSize: 9, color: 'rgba(239,231,219,.45)', marginTop: 14, letterSpacing: '.25em' }}>
            ACESSO RESTRITO
          </div>
        </div>

        {sent ? (
          <div
            className="fade-up"
            style={{
              marginTop: 40,
              padding: '24px 20px',
              border: '1px solid rgba(239,231,219,.25)',
              textAlign: 'center',
            }}
          >
            <div className="serif" style={{ fontSize: 22, fontWeight: 400 }}>
              confira seu email
            </div>
            <div className="italic" style={{ fontSize: 13, color: 'rgba(239,231,219,.65)', marginTop: 10, lineHeight: 1.5 }}>
              enviamos um link mágico para
              <br />
              <strong style={{ color: 'var(--cream)' }}>{email}</strong>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 40 }}>
            <label
              className="mono"
              style={{ fontSize: 10, color: 'rgba(239,231,219,.55)', letterSpacing: '.2em' }}
              htmlFor="email"
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%',
                marginTop: 8,
                padding: '12px 0',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(239,231,219,.3)',
                color: 'var(--cream)',
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                outline: 'none',
              }}
            />

            <div style={{ marginTop: 28 }}>
              <Btn variant="outline" type="submit">
                {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE ACESSO'}
              </Btn>
            </div>

            {error && (
              <div
                className="italic"
                style={{ marginTop: 16, fontSize: 13, color: '#e08e8e', textAlign: 'center' }}
              >
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
