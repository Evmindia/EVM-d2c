interface CompatibilitySectionProps {
  compatibility?: string[];
}

export function CompatibilitySection({ compatibility = [] }: CompatibilitySectionProps) {
  if (!compatibility || compatibility.length === 0) return null;

  return (
    <section aria-labelledby="compat-heading" className="border-t border-gray-100 pt-10">
      <div className="max-w-3xl">
        <h2 id="compat-heading" className="text-xl font-bold text-gray-900 sm:text-2xl">
          Compatibility &amp; Ecosystem
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Seamlessly engineered to work across modern smartphones, laptops, and accessories.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {compatibility.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-800 shadow-sm"
            >
              <svg
                className="h-4 w-4 text-green-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
