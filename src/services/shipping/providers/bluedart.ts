import 'server-only';
import type { ShippingProvider } from '../shipping-provider.interface';
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  ShipmentWebhookResult,
} from '../shipping.types';
import { NotImplementedError } from '@/lib/security/errors';

/**
 * Blue Dart adapter — STUB ONLY.
 *
 * PENDING — Blue Dart commercial/account credentials are not yet provided.
 * This adapter conforms to the ShippingProvider interface but throws
 * NotImplemented for every operation. It will be implemented (thin fetch-based
 * client, credentials server-side only) once the account details land. No
 * credentials are referenced here.
 */
export class BlueDartProvider implements ShippingProvider {
  readonly id = 'bluedart' as const;

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    throw new NotImplementedError('BlueDartProvider.createShipment (credentials PENDING)');
  }

  async getTracking(_awb: string): Promise<TrackingResult> {
    throw new NotImplementedError('BlueDartProvider.getTracking (credentials PENDING)');
  }

  async verifyWebhook(
    _rawBody: string,
    _headers: Record<string, string>,
  ): Promise<ShipmentWebhookResult> {
    throw new NotImplementedError('BlueDartProvider.verifyWebhook (credentials PENDING)');
  }

  async cancelShipment(_awb: string): Promise<{ cancelled: boolean }> {
    throw new NotImplementedError('BlueDartProvider.cancelShipment (credentials PENDING)');
  }
}
