import Image from 'next/image';
import type { StorySection } from '@/types/catalog';

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

/**
 * Full-bleed storytelling narratives. Each section breaks out of the page
 * container to span the full viewport width: a tall edge-to-edge image on one
 * half, narrative copy on the other, alternating sides down the page. The
 * `overflow-x-clip` on the shop layout `<main>` absorbs the full-bleed width so
 * no horizontal scrollbar appears.
 */
export function StorytellingSection({ sections }: { sections?: StorySection[] }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      {sections.map((sec, idx) => {
        const isReversed = idx % 2 === 1;
        const hasImage = isValidImageUrl(sec.image?.url);
        return (
          <section key={idx} className="grid items-stretch lg:grid-cols-2">
            {/* Visual media — full-bleed on its half, 5:4 ratio (760×608 like
                the reference). Grows taller if the copy column is longer. */}
            <div
              className={`relative w-full min-w-0 aspect-[5/4] ${
                isReversed ? 'lg:order-2' : 'lg:order-1'
              } ${hasImage ? 'bg-gray-100' : 'flex items-center justify-center bg-gray-50'}`}
            >
              {hasImage ? (
                <Image
                  src={sec.image!.url}
                  alt={sec.image!.alt || sec.heading}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="text-center">
                  <span className="text-3xl">⚡</span>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{sec.heading}</p>
                </div>
              )}
            </div>

            {/* Narrative copy */}
            <div
              className={`flex w-full min-w-0 items-center px-6 py-14 sm:px-10 lg:px-20 ${
                isReversed ? 'lg:order-1' : 'lg:order-2'
              }`}
            >
              <div className="max-w-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Product Craft 0{idx + 1}
                </span>
                <h3 className="mt-3 text-3xl font-bold uppercase leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                  {sec.heading}
                </h3>
                <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-gray-600">
                  {sec.description}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
