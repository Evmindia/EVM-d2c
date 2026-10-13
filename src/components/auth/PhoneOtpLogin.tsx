'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';

/**
 * Phone + OTP login. Two steps: enter phone → receive SMS OTP (via our Kapsystem
 * gateway) → verify. On success the server session is established (via
 * AuthProvider) and we redirect (or call `onDone` when embedded, e.g. checkout).
 */
function safeNext(next: string | null): string {
  if (
    next &&
    (next.startsWith('/account') || next.startsWith('/admin')) &&
    !next.startsWith('//') &&
    !next.includes('\\')
  ) {
    return next;
  }
  return '/account';
}

export function PhoneOtpLogin({ onDone }: { onDone?: () => void } = {}) {
  const { sendPhoneOtp, confirmPhoneOtp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 12;

  // Focus OTP input when step changes to 'otp'
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [step]);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 'otp' || resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  async function send(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!phoneValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendPhoneOtp(phone);
      setStep('otp');
      setResendTimer(30);
    } catch {
      setError('Could not send OTP. Please check the mobile number and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneOtp(phone, otp);
      if (onDone) onDone();
      else router.push(safeNext(params.get('next')));
    } catch {
      setError('Invalid or expired OTP code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200/60 shadow-sm">
          <svg className="h-4 w-4 shrink-0 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={send} className="space-y-4" noValidate>
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Mobile Number
            </label>
            <div className="relative mt-2 flex rounded-xl border border-neutral-300 bg-white shadow-sm transition-all focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10 hover:border-neutral-400">
              <div className="flex shrink-0 items-center gap-1.5 border-r border-neutral-200 bg-neutral-50 px-3.5 text-xs font-semibold text-neutral-700 rounded-l-xl select-none">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit number"
                className="h-12 w-full rounded-r-xl bg-transparent px-3.5 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              We&apos;ll send a secure 6-digit one-time code by SMS.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || !phoneValid}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-semibold uppercase tracking-widest text-white shadow-md transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
          >
            {busy ? (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Sending OTP…</span>
              </div>
            ) : (
              <>
                <span>Get OTP Code</span>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-5" noValidate>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="otp" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Enter Verification Code
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
                className="text-[11px] font-medium text-neutral-600 underline hover:text-neutral-900"
              >
                Change Number
              </button>
            </div>

            <p className="mt-1 text-xs text-neutral-500">
              Code sent to <span className="font-semibold text-neutral-900">+91 {phoneDigits.slice(-10)}</span>
            </p>

            <div className="relative mt-3">
              <input
                ref={otpInputRef}
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-10"
              />

              <div className="flex justify-between gap-1.5 sm:gap-2">
                {Array.from({ length: 6 }).map((_, i) => {
                  const digit = otp[i] || '';
                  const isCurrent = otp.length === i || (i === 5 && otp.length === 6);
                  return (
                    <div
                      key={i}
                      className={`flex h-12 w-10 sm:h-13 sm:w-12 items-center justify-center rounded-xl border text-lg font-bold transition-all ${
                        digit
                          ? 'border-neutral-900 bg-neutral-900/5 text-neutral-900 shadow-sm'
                          : isCurrent
                          ? 'border-neutral-900 ring-2 ring-neutral-900/20 bg-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-400'
                      }`}
                    >
                      {digit}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || otp.length < 4}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-semibold uppercase tracking-widest text-white shadow-md transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
          >
            {busy ? (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Verifying…</span>
              </div>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>

          <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px]">
            <span className="text-neutral-500">Didn&apos;t receive code?</span>
            {resendTimer > 0 ? (
              <span className="font-medium text-neutral-400">Resend in {resendTimer}s</span>
            ) : (
              <button
                type="button"
                onClick={() => send()}
                disabled={busy}
                className="font-semibold text-neutral-900 underline hover:text-black disabled:opacity-50"
              >
                Resend OTP
              </button>
            )}
          </div>
        </form>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-neutral-400 select-none">
        <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>256-bit encrypted secure OTP verification</span>
      </div>
    </div>
  );
}
