'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProductVariant } from '@/types/catalog';

interface VariantSelectorProps {
  variants?: ProductVariant[];
  currentSlug: string;
  selectedId?: string;
  onSelect?: (variant: ProductVariant) => void;
}

export function VariantSelector({
  variants = [],
  currentSlug,
  selectedId: controlledSelectedId,
  onSelect,
}: VariantSelectorProps) {
  const [localSelectedId, setLocalSelectedId] = useState<string>(variants[0]?.id ?? '');
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : localSelectedId;

  if (!variants || variants.length === 0) return null;

  const handleSelect = (v: ProductVariant) => {
    setLocalSelectedId(v.id);
    onSelect?.(v);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('evm:variant-selected', {
          detail: {
            variantId: v.id,
            label: v.label,
            type: v.type,
            value: v.value,
            images: v.images,
          },
        }),
      );
    }
  };

  // Group variants by type
  const colorVariants = variants.filter((v) => v.type === 'color');
  const capacityVariants = variants.filter((v) => v.type === 'capacity');
  const storageVariants = variants.filter((v) => v.type === 'storage');
  const otherVariants = variants.filter((v) => !['color', 'capacity', 'storage'].includes(v.type));

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  return (
    <div className="space-y-4 border-t border-b border-gray-100 py-4">
      {/* Color Swatches */}
      {colorVariants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-900">
              Colour:{' '}
              <span className="font-normal text-gray-600">
                {selected?.type === 'color' ? selected.label : colorVariants[0]?.label}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Select color">
            {colorVariants.map((v) => {
              const isSelected = (selected?.id === v.id) || (!selected && v === colorVariants[0]);
              const isHex = v.value.startsWith('#') || v.value.startsWith('rgb');
              return v.slug && v.slug !== currentSlug ? (
                <Link
                  key={v.id}
                  href={`/products/${v.slug}`}
                  title={`${v.label}${v.inStock ? '' : ' (Out of stock)'}`}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    isSelected ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : 'border-gray-300 hover:scale-105'
                  } ${!v.inStock ? 'opacity-40' : ''}`}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: isHex ? v.value : '#71717a' }}
                  />
                  <span className="sr-only">{v.label}</span>
                </Link>
              ) : (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelect(v)}
                  title={`${v.label}${v.inStock ? '' : ' (Out of stock)'}`}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    isSelected ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : 'border-gray-300 hover:scale-105'
                  } ${!v.inStock ? 'opacity-40' : ''}`}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: isHex ? v.value : '#71717a' }}
                  />
                  <span className="sr-only">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacity Options */}
      {capacityVariants.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-900">
              Capacity:{' '}
              <span className="font-normal text-gray-600">
                {selected?.type === 'capacity' ? selected.label : capacityVariants[0]?.label}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select capacity">
            {capacityVariants.map((v) => {
              const isSelected = selected?.id === v.id;
              return v.slug && v.slug !== currentSlug ? (
                <Link
                  key={v.id}
                  href={`/products/${v.slug}`}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                  } ${!v.inStock ? 'opacity-40 line-through' : ''}`}
                >
                  {v.label}
                </Link>
              ) : (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelect(v)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                  } ${!v.inStock ? 'opacity-40 line-through' : ''}`}
                  role="radio"
                  aria-checked={isSelected}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage Options */}
      {storageVariants.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-900">Storage</span>
          <div className="flex flex-wrap gap-2">
            {storageVariants.map((v) => {
              const isSelected = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelect(v)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Other custom variants */}
      {otherVariants.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-900">Options</span>
          <div className="flex flex-wrap gap-2">
            {otherVariants.map((v) => {
              const isSelected = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelect(v)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
