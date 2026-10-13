import type { FeatureBlock } from '@/types/catalog';

interface FeatureHighlightsProps {
  featureBlocks?: FeatureBlock[];
  features?: string[];
}

export function FeatureHighlights({ featureBlocks = [], features = [] }: FeatureHighlightsProps) {
  const hasBlocks = featureBlocks && featureBlocks.length > 0;
  const hasBullets = features && features.length > 0;

  if (!hasBlocks && !hasBullets) return null;

  return (
    <section aria-labelledby="features-heading" className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Built With Precision
        </p>
        <h2 id="features-heading" className="mt-1 text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl">
          Engineered for Performance
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Designed with premium components and robust power architecture.
        </p>

        {/* Structured Feature Cards */}
        {hasBlocks && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureBlocks.map((fb, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-neutral-200/70 bg-[#f9f8f6] p-6 transition hover:border-neutral-300 hover:shadow-md"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white mb-4">
                  {fb.icon || '✓'}
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">{fb.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-600">{fb.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Bullet List Fallback / Secondary Highlights */}
        {hasBullets && (
          <div className={`${hasBlocks ? 'mt-6' : 'mt-6'} rounded-2xl border border-neutral-200/70 bg-[#f9f8f6] p-6`}>
            <ul className="grid gap-3 sm:grid-cols-2 text-xs text-neutral-700 font-medium">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-neutral-900 font-bold shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
