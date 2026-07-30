'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell.jsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setAuthSession } from '@/lib/auth.js';

export default function LoginPageClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }

      setAuthSession(data.user, data.token);
      router.push('/settings');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    padding: '10px 12px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <AppShell sidebarItems={[]}>
      <div style={{ maxWidth: '400px', margin: '40px auto' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Sign In
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Optional account access for sync in future releases.
        </p>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label
              htmlFor="login-email"
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '10px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer',
              marginTop: '8px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
