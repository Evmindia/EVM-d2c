/**
 * Provider-agnostic shipping domain types.
 * Blue Dart is the preferred provider, but the app depends only on these
 * vendor-neutral types + the ShippingProvider interface.
 */

export type ShippingProviderId = 'bluedart';

export type ShipmentStatus =
  | 'created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CreateShipmentInput {
  orderId: string;
  address: ShippingAddressSnapshot;
  /** Total weight in grams. */
  weightGrams: number;
  /** COD amount in paise; 0 or undefined for prepaid. COD availability PENDING. */
  codAmount?: number;
}

export interface CreateShipmentResult {
  provider: ShippingProviderId;
  providerShipmentId: string;
  awb: string;
  labelUrl?: string;
  estimatedDelivery?: string;
}

export interface TrackingEvent {
  status: ShipmentStatus;
  description: string;
  location?: string;
  timestamp: string;
}

export interface TrackingResult {
  awb: string;
  status: ShipmentStatus;
  events: TrackingEvent[];
}

export interface ShipmentWebhookResult {
  valid: boolean;
  awb?: string;
  status?: ShipmentStatus;
  events?: TrackingEvent[];
}

// ---- Shipping quote (checkout foundation) ----------------------------------
export type ShippingQuoteStatus = 'CONFIGURED' | 'NOT_CONFIGURED';

export interface ShippingQuoteInput {
  destinationPostalCode: string;
  destinationState: string;
  /** Total weight in grams if known (PENDING until product weights exist). */
  weightGrams?: number;
  itemCount: number;
}

export interface ShippingQuote {
  status: ShippingQuoteStatus;
  /** Shipping charge in paise. null while NOT_CONFIGURED (never fabricated). */
  amount: number | null;
  /** Method label, only when CONFIGURED. Never a fake delivery date. */
  method: string | null;
  note: string;
}
