'use client';

import { ServiceabilityCheck } from './ServiceabilityCheck';

export function PincodeCheck() {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-[#efeae3]/50 p-4 text-xs text-neutral-600">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">
          🚚
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900">Check Delivery</p>
          <p className="mt-0.5 leading-relaxed text-neutral-500">
            Enter your pincode to check delivery serviceability across India.
          </p>
          <div className="mt-3">
            <ServiceabilityCheck withInput />
          </div>
        </div>
      </div>
    </div>
  );
}
