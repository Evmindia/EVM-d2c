import { describe, it, expect } from 'vitest';
import { generateCode128Svg } from '../code128';

describe('Code 128 Barcode Generator', () => {
  it('generates valid SVG for standard AWB number', () => {
    const res = generateCode128Svg('3491827401', { height: 60, barWidth: 1.8 });
    expect(res.svg).toContain('<svg');
    expect(res.svg).toContain('viewBox="0 0');
    expect(res.svg).toContain('shape-rendering="crispEdges"');
    expect(res.width).toBeGreaterThan(100);
    expect(res.height).toBe(60);
    expect(res.paths.length).toBeGreaterThan(50);
  });

  it('supports human-readable text underneath', () => {
    const res = generateCode128Svg('EVM-2026-0001', { showText: true, fontSize: 12 });
    expect(res.svg).toContain('<text');
    expect(res.svg).toContain('EVM-2026-0001');
    expect(res.height).toBeGreaterThan(50);
  });

  it('handles spaces and symbols', () => {
    const res = generateCode128Svg('EVM 123-A/B');
    expect(res.svg).toContain('<path');
    expect(res.width).toBeGreaterThan(50);
  });
});
