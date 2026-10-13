'use client';

import { useState } from 'react';

interface PressItem {
  id: string;
  name: string;
  quote: string;
  renderLogo: (isActive: boolean) => React.ReactNode;
}

const PRESS_ITEMS: PressItem[] = [
  {
    id: 'forbes',
    name: 'Forbes',
    quote: '“EVM is setting a new benchmark for everyday tech essentials with sleek, minimalist design and reliable power.”',
    renderLogo: (isActive) => (
      <span
        className={`font-serif text-2xl sm:text-3xl font-black tracking-tight transition-opacity duration-200 select-none ${
          isActive ? 'opacity-100 text-neutral-900' : 'opacity-40 hover:opacity-80 text-neutral-700'
        }`}
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Forbes
      </span>
    ),
  },
  {
    id: 'theknot',
    name: 'The Knot',
    quote: '“EVM portable chargers and sleek audio essentials are a must-pack staple for modern travel and busy days.”',
    renderLogo: (isActive) => (
      <span
        className={`font-serif italic text-2xl sm:text-3xl tracking-tight transition-opacity duration-200 select-none ${
          isActive ? 'opacity-100 text-neutral-900 font-medium' : 'opacity-40 hover:opacity-80 text-neutral-700'
        }`}
        style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.03em' }}
      >
        the knot
      </span>
    ),
  },
  {
    id: 'vogue',
    name: 'Vogue',
    quote: '“The rare tech accessory designed with the restraint and aesthetic polish of luxury fashion.”',
    renderLogo: (isActive) => (
      <span
        className={`font-serif uppercase text-2xl sm:text-3xl tracking-[0.22em] font-light transition-opacity duration-200 select-none ${
          isActive ? 'opacity-100 text-neutral-900' : 'opacity-40 hover:opacity-80 text-neutral-700'
        }`}
        style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
      >
        VOGUE
      </span>
    ),
  },
  {
    id: 'businessinsider',
    name: 'Business Insider',
    quote: '“EVM’s magnetic wireless ecosystem delivers rapid charging power without the bulk.”',
    renderLogo: (isActive) => (
      <div
        className={`inline-flex flex-col items-center justify-center px-2.5 py-1.5 rounded transition-all duration-200 select-none ${
          isActive
            ? 'bg-neutral-900 text-white shadow-sm opacity-100'
            : 'bg-neutral-800 text-white opacity-40 hover:opacity-80'
        }`}
      >
        <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest leading-none">
          BUSINESS
        </span>
        <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest leading-tight mt-0.5">
          INSIDER
        </span>
      </div>
    ),
  },
  {
    id: 'brides',
    name: 'Brides',
    quote: '“Sleek, pocket-friendly, and beautifully designed — an essential addition to any modern lifestyle registry.”',
    renderLogo: (isActive) => (
      <span
        className={`font-serif uppercase text-xl sm:text-2xl tracking-[0.18em] font-light transition-opacity duration-200 select-none ${
          isActive ? 'opacity-100 text-neutral-900' : 'opacity-40 hover:opacity-80 text-neutral-700'
        }`}
        style={{ fontFamily: 'Didot, "Times New Roman", serif' }}
      >
        BRIDES
      </span>
    ),
  },
  {
    id: 'people',
    name: 'People',
    quote: '“The ultra-slim magnetic power bank that our editors cannot stop talking about.”',
    renderLogo: (isActive) => (
      <span
        className={`font-sans text-2xl sm:text-3xl font-black tracking-tighter transition-opacity duration-200 select-none ${
          isActive ? 'opacity-100 text-neutral-900' : 'opacity-40 hover:opacity-80 text-neutral-700'
        }`}
        style={{ letterSpacing: '-0.06em' }}
      >
        People
      </span>
    ),
  },
  {
    id: 'bazaar',
    name: "Harper's Bazaar",
    quote: '“Where cutting-edge mobile architecture meets refined, everyday tactile luxury.”',
    renderLogo: (isActive) => (
      <span
        className={`font-serif uppercase text-xl sm:text-2xl tracking-[0.2em] font-light transition-opacity duration-200 select-none ${
          isActive ? 'opacity-100 text-neutral-900' : 'opacity-40 hover:opacity-80 text-neutral-700'
        }`}
        style={{ fontFamily: 'Didot, Bodoni MT, serif' }}
      >
        BAZAAR
      </span>
    ),
  },
];

export function TalkOfTheTown() {
  const [activeId, setActiveId] = useState<string>('businessinsider');

  const activeItem = PRESS_ITEMS.find((item) => item.id === activeId) ?? PRESS_ITEMS[3]!;

  return (
    <section
      aria-label="Press and media features"
      className="border-t border-[#d5ccbf] bg-[#e2dbd1] py-8 sm:py-10 text-neutral-900"
    >
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <h2
          className="text-center text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl"
          style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
        >
          We&apos;re the talk of the town
        </h2>

        {/* Media Logos Strip with Sleek Dividers */}
        <div className="mt-5 sm:mt-6 flex items-center justify-start lg:justify-center overflow-x-auto pb-2 pt-1 no-scrollbar">
          <div className="flex items-center shrink-0">
            {PRESS_ITEMS.map((item, index) => {
              const isSelected = item.id === activeId;
              const isLast = index === PRESS_ITEMS.length - 1;

              return (
                <div key={item.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    aria-label={`View ${item.name} feature`}
                    aria-pressed={isSelected}
                    className="group relative flex items-center justify-center px-3.5 sm:px-5 py-1.5 transition-transform duration-200 focus:outline-none"
                  >
                    {item.renderLogo(isSelected)}
                    {isSelected && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-neutral-900" />
                    )}
                  </button>

                  {/* Vertical separator line between items */}
                  {!isLast && (
                    <span
                      className="h-6 sm:h-7 w-px bg-neutral-400/80 shrink-0 select-none"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Press Quote */}
        <div className="mt-3.5 sm:mt-4 text-center min-h-[2.25rem] flex items-center justify-center">
          <p
            key={activeItem.id}
            className="max-w-2xl text-xs sm:text-[13px] font-normal text-neutral-800 leading-relaxed transition-all duration-300 px-4"
          >
            {activeItem.quote}
          </p>
        </div>
      </div>
    </section>
  );
}
