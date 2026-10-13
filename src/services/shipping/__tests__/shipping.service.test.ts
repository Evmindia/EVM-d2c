import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition } from '@/services/shipping/shipping.service';
import { BlueDartProvider } from '@/services/shipping/providers/bluedart';
import { AppError, NotImplementedError } from '@/lib/security/errors';

describe('shipping service — state machine', () => {
  it('permits legal transitions', () => {
    expect(canTransition('created', 'picked_up')).toBe(true);
    expect(canTransition('in_transit', 'out_for_delivery')).toBe(true);
    expect(canTransition('out_for_delivery', 'delivered')).toBe(true);
  });

  it('blocks illegal transitions', () => {
    expect(canTransition('created', 'delivered')).toBe(false);
    expect(canTransition('delivered', 'in_transit')).toBe(false);
    expect(() => assertTransition('created', 'delivered')).toThrowError(AppError);
  });
});

describe('shipping provider stub is not implemented (PENDING)', () => {
  it('Blue Dart stub throws NotImplemented', async () => {
    await expect(new BlueDartProvider().getTracking('AWB123')).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});
