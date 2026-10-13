/**
 * The contract every shipping/courier adapter must implement.
 * The shipping SERVICE depends only on this interface, so Blue Dart can be
 * swapped for another courier later without touching business logic.
 */
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  ShipmentWebhookResult,
} from './shipping.types';

export interface ShippingProvider {
  readonly id: 'bluedart';

  /** Create a shipment and obtain an AWB. */
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;

  /** Fetch current tracking status + events for an AWB. */
  getTracking(awb: string): Promise<TrackingResult>;

  /** Verify + parse a courier tracking webhook (signature over raw body). */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<ShipmentWebhookResult>;

  /** Cancel a shipment by AWB. */
  cancelShipment(awb: string): Promise<{ cancelled: boolean }>;
}
