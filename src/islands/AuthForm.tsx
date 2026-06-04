import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';
import { claimAnonLinks } from './hooks/useAnonId';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';
type Provider = 'google' | 'github' | 'apple';

export interface AuthStrings {
  loginTitle: string;
  signupTitle: string;
  forgotTitle: string;
  resetTitle: string;
  email: string;
  password: string;
  name: string;
  newPassword: string;
  passkey: string;
  passkeyHint: string;
  or: string;
  continueWith: string;
  signInBtn: string;
  signUpBtn: string;
  sendReset: string;
  setPassword: string;
  forgotLink: string;
  noAccount: string;
  haveAccount: string;
  checkEmail: string;
  resetSent: string;
  resetDone: string;
  genericError: string;
}

interface Props {
  mode: Mode;
  providers: Provider[];
  strings: AuthStrings;
  loginPath: string;
  signupPath: string;
  forgotPath: string;
  resetPath: string;
  redirectTo: string;
}

const PROVIDER_LABEL: Record<Provider, string> = { google: 'Google', github: 'GitHub', apple: 'Apple' };

const input =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-accent';
const primaryBtn =
  'w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-text transition hover:bg-accent-hover disabled:opacity-60';
const ghostBtn =
  'w-full rounded-lg border border-border px-4 py-2.5 font-medium text-text transition hover:bg-surface-2 disabled:opacity-60';

export default function AuthForm({
  mode,
  providers,
  strings,
  loginPath,
  signupPath,
  forgotPath,
  resetPath,
  redirectTo,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError(strings.genericError);
    } finally {
      setBusy(false);
    }
  }

  function passkeySignIn() {
    void run(async () => {
      const { error: e } = await authClient.signIn.passkey();
      if (e) return setError(strings.genericError);
      await claimAnonLinks();
      window.location.href = redirectTo;
    });
  }

  function socialSignIn(provider: Provider) {
    void authClient.signIn.social({ provider, callbackURL: redirectTo });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run(async () => {
      if (mode === 'login') {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) return setError(strings.genericError);
        await claimAnonLinks();
        window.location.href = redirectTo;
      } else if (mode === 'signup') {
        const { error: err } = await authClient.signUp.email({ name, email, password });
        if (err) return setError(strings.genericError);
        setDone(strings.checkEmail);
      } else if (mode === 'forgot') {
        await authClient.requestPasswordReset({ email, redirectTo: resetPath });
        setDone(strings.resetSent); // generic — no account enumeration
      } else {
        const token = new URLSearchParams(window.location.search).get('token') ?? '';
        const { error: err } = await authClient.resetPassword({ newPassword: password, token });
        if (err) return setError(strings.genericError);
        setDone(strings.resetDone);
      }
    });
  }

  const title =
    mode === 'login'
      ? strings.loginTitle
      : mode === 'signup'
        ? strings.signupTitle
        : mode === 'forgot'
          ? strings.forgotTitle
          : strings.resetTitle;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold text-text">{title}</h1>

      {done ? (
        <p className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-2">{done}</p>
      ) : (
        <>
          {mode === 'login' && (
            <div className="flex flex-col gap-1">
              <button type="button" onClick={passkeySignIn} disabled={busy} className={primaryBtn}>
                🔑 {strings.passkey}
              </button>
              <p className="px-1 text-xs text-text-3">{strings.passkeyHint}</p>
            </div>
          )}

          {(mode === 'login' || mode === 'signup') && providers.length > 0 && (
            <div className="flex flex-col gap-2">
              {providers.map((p) => (
                <button key={p} type="button" onClick={() => socialSignIn(p)} disabled={busy} className={ghostBtn}>
                  {strings.continueWith.replace('{{provider}}', PROVIDER_LABEL[p])}
                </button>
              ))}
            </div>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="flex items-center gap-3 text-xs text-text-3">
              <span className="h-px flex-1 bg-border" />
              {strings.or}
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                className={input}
                placeholder={strings.name}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            {mode !== 'reset' && (
              <input
                className={input}
                type="email"
                placeholder={strings.email}
                autoComplete={mode === 'login' ? 'username webauthn' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            {mode !== 'forgot' && (
              <input
                className={input}
                type="password"
                placeholder={mode === 'reset' ? strings.newPassword : strings.password}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
              />
            )}

            <button type="submit" disabled={busy} className={primaryBtn}>
              {mode === 'login'
                ? strings.signInBtn
                : mode === 'signup'
                  ? strings.signUpBtn
                  : mode === 'forgot'
                    ? strings.sendReset
                    : strings.setPassword}
            </button>
          </form>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-col gap-1 text-sm">
            {mode === 'login' && (
              <>
                <a href={forgotPath} className="text-accent hover:text-accent-hover">
                  {strings.forgotLink}
                </a>
                <a href={signupPath} className="text-text-2 hover:text-accent">
                  {strings.noAccount}
                </a>
              </>
            )}
            {mode === 'signup' && (
              <a href={loginPath} className="text-text-2 hover:text-accent">
                {strings.haveAccount}
              </a>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <a href={loginPath} className="text-text-2 hover:text-accent">
                {strings.haveAccount}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
