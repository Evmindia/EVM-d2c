import type { SpecificationGroup } from '@/types/catalog';

interface ProductSpecsProps {
  specifications?: SpecificationGroup[];
  whatsInTheBox?: string[];
  warranty?: string | null;
}

export function ProductSpecs({
  specifications = [],
  whatsInTheBox = [],
  warranty,
}: ProductSpecsProps) {
  const hasSpecs = specifications && specifications.length > 0;
  const hasBox = whatsInTheBox && whatsInTheBox.length > 0;

  if (!hasSpecs && !hasBox && !warranty) return null;

  return (
    <section aria-labelledby="specs-heading" className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Hardware &amp; Details
        </p>
        <h2 id="specs-heading" className="mt-1 text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl">
          Technical Specifications
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Complete specifications, output ratings, and package details.
        </p>

        {/* Grouped Spec Tables */}
        {hasSpecs && (
          <div className="mt-8 space-y-6">
            {specifications.map((group, gi) => (
              <div key={gi} className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden shadow-sm">
                <div className="bg-[#efeae3]/60 px-5 py-3 border-b border-neutral-200/80">
                  <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-widest">
                    {group.group}
                  </h3>
                </div>
                <dl className="divide-y divide-neutral-100 px-5 text-xs">
                  {group.items.map((it, ii) => (
                    <div key={ii} className="grid grid-cols-3 py-3.5 gap-4">
                      <dt className="font-medium text-neutral-500">{it.label}</dt>
                      <dd className="col-span-2 text-neutral-900 font-medium">{it.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}

        {/* What's In The Box & Warranty Cards */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {hasBox && (
            <div className="rounded-2xl border border-neutral-200/80 bg-[#f9f8f6] p-6">
              <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-widest mb-4">
                Package Contents
              </h3>
              <ul className="space-y-2.5 text-xs text-neutral-700 font-medium">
                {whatsInTheBox.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warranty && (
            <div className="rounded-2xl border border-neutral-200/80 bg-[#f9f8f6] p-6">
              <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-widest mb-4">
                Warranty &amp; Support
              </h3>
              <p className="text-xs text-neutral-700 leading-relaxed font-medium">{warranty}</p>
              <p className="mt-2 text-[11px] text-neutral-500">
                Hassle-free replacement guarantee against manufacturing defects across India.
              </p>
              <a
                href="https://evmzone.com/evm-pickup-and-drop"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 underline hover:text-neutral-600 transition"
              >
                Claim Warranty / Doorstep Pickup &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
