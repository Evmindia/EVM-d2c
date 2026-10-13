export function TrustAndService() {
  return (
    <section aria-label="EVM Guarantees" className="rounded-3xl border border-neutral-200/80 bg-neutral-950 text-white p-8 sm:p-12 shadow-md">
      <div className="grid gap-8 sm:grid-cols-3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-bold text-sm">
            🛡️
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-widest">
              100% Genuine EVM
            </h3>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Direct from the official brand. Certified safety standards and BIS compliance.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-bold text-sm">
            ⚡
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-widest">
              Official Warranty
            </h3>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Covered under comprehensive brand warranty with authorized service support across India.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-bold text-sm">
            🚚
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-widest">
              Nationwide Dispatch
            </h3>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Securely packed and shipped with real-time tracking to 625+ pin codes across India.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
