/**
 * Order domain types.
 *
 * An order is a HISTORICAL COMMERCIAL RECORD: item values are SNAPSHOTS taken at
 * creation time. It stores no live product reference for pricing, so later
 * catalog changes never alter an existing order.
 */
import type { Currency } from '@/types/catalog';
import type { Address } from '@/services/checkout/checkout.types';

export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type ShipmentStatus =
  | 'NOT_CREATED'
  | 'CREATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type OwnerType = 'guest' | 'user';

/** Snapshot of a purchased line — never references live product pricing. */
export interface OrderItem {
  productId: string;
  sku: string;
  productTitleSnapshot: string;
  quantity: number;
  unitPrice: number; // paise, snapshot
  lineSubtotal: number; // paise, snapshot
}

/** Provider-agnostic payment record (no vendor fields populated in Phase 4). */
export interface OrderPayment {
  status: PaymentStatus;
  provider: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
}

/** Tax/shipping snapshots. amount null means it was not configured at creation. */
export interface AmountSnapshot {
  status: 'CONFIGURED' | 'NOT_CONFIGURED';
  amount: number | null;
  /**
   * GST breakdown snapshot (paise), captured on the TAX snapshot at order
   * creation for historical accuracy + future invoicing. Optional so existing
   * orders (and the shipping snapshot) remain valid without it. cgst+sgst+igst
   * equals `amount`.
   */
  breakdown?: {
    cgst: number;
    sgst: number;
    igst: number;
    rate: number | null;
    intraState: boolean;
  } | null;
}

/** The full internal order document (server-side only). */
export interface Order {
  id: string; // internal Firestore doc id — never exposed to customers
  orderNumber: string; // customer-facing, non-sequential
  ownerType: OwnerType;
  userId: string | null;
  /** sha256 of the guest capability token; never the raw token. */
  accessTokenHash: string | null;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  billingAddress: Address;

  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  tax: AmountSnapshot;
  shipping: AmountSnapshot;
  total: number;
  currency: Currency;

  payment: OrderPayment;
  orderStatus: OrderStatus;
  shipmentStatus: ShipmentStatus;

  /**
   * Courier waybill / AWB number, set when a shipment is created. Optional so
   * pre-shipment (and legacy) orders remain valid. Until Blue Dart's
   * GenerateWayBill is wired, a clearly-marked PLACEHOLDER value is stored.
   */
  awbNumber?: string | null;
  /** Shipment courier provider, e.g. 'BLUEDART' | 'PLACEHOLDER'. */
  shipmentProvider?: string | null;
  /** Firebase Storage path of the courier shipping label PDF (server-only). */
  awbLabelPath?: string | null;
  /** Direct URL to the courier shipping label (eShipz returns a hosted label). */
  awbLabelUrl?: string | null;

  /** Tally ERP export status: 'SENT' | 'FAILED' | 'PENDING' | null. */
  tallyStatus?: 'SENT' | 'FAILED' | 'PENDING' | null;
  tallySyncedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * Allow-listed customer-facing DTO. Excludes internal id, accessTokenHash,
 * userId, and any internal/cost/supplier/audit data.
 */
export interface PublicOrder {
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  items: {
    productTitleSnapshot: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
  }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  tax: AmountSnapshot;
  shipping: AmountSnapshot;
  total: number;
  currency: Currency;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  billingAddress: Address;
  /** Shipment lifecycle for customer display. */
  shipmentStatus: ShipmentStatus;
  /** Courier AWB — exposed only for a real courier shipment (never placeholders). */
  awbNumber: string | null;
  /** Carrier that eShipz assigned (for tracking); null for placeholders. */
  carrier: string | null;
  createdAt: string;
}
