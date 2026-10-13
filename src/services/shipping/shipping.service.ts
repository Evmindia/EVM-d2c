import 'server-only';

/**
 * Shipping service — vendor-neutral orchestration + state-machine guards.
 * Provider work is PENDING (Blue Dart credentials), so provider-touching flows
 * surface a safe not_implemented via the stub. The state machine is implemented
 * and tested now so downstream order logic can rely on it.
 */
import type { ShipmentStatus, ShippingQuote, ShippingQuoteInput } from './shipping.types';
import { AppError } from '@/lib/security/errors';

/**
 * Shipping quote for checkout. Blue Dart account/API details are PENDING, so we
 * do NOT call any courier and do NOT invent a rate, free-shipping threshold, or
 * delivery date. Returns a controlled NOT_CONFIGURED state. When Blue Dart (or
 * another provider) is configured, this delegates to the provider adapter.
 */
export async function getShippingQuote(_input: ShippingQuoteInput): Promise<ShippingQuote> {
  return {
    status: 'NOT_CONFIGURED',
    amount: null,
    method: null,
    note: 'Shipping configuration (Blue Dart) is pending.',
  };
}

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  created: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: ['in_transit'],
  cancelled: [],
};

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError('conflict', { internal: `illegal shipment transition ${from} -> ${to}` });
  }
}
