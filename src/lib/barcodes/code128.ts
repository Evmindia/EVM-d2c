/**
 * Zero-dependency, pure TypeScript Code 128 (Subset B) barcode SVG generator.
 *
 * Code 128 is the universal 1D barcode symbology used by logistics, shipping,
 * and parcel couriers (Blue Dart, Delhivery, DTDC, India Post, etc.) for AWB
 * numbers and order references.
 *
 * This generator outputs clean, resolution-independent SVG markup that prints
 * with maximum crispness on 203 DPI and 300 DPI thermal label heads.
 */

// Code 128 bar/space width patterns (indices 0..106)
// Each 6-character pattern string defines the widths of (bar, space, bar, space, bar, space).
// Total width of symbols 0..105 is 11 modules; symbol 106 (stop) has 7 widths totaling 13 modules.
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 100-106 (106 is STOP)
];

const START_B = 104;
const STOP = 106;

export interface Code128SvgOptions {
  /** Height of the barcode in pixels/points. Default: 50 */
  height?: number;
  /** Width of a single narrow module in pixels. Default: 1.6 */
  barWidth?: number;
  /** Whether to show human-readable text underneath the bars. Default: false */
  showText?: boolean;
  /** Font size for human-readable text. Default: 11 */
  fontSize?: number;
  /** CSS class to apply to the root <svg> element. */
  className?: string;
}

export interface BarcodeResult {
  svg: string;
  width: number;
  height: number;
  viewBox: string;
  paths: string;
}

/**
 * Encodes an ASCII string into Code 128 (Subset B) SVG representation.
 */
export function generateCode128Svg(
  rawText: string,
  options: Code128SvgOptions = {},
): BarcodeResult {
  const text = rawText.trim();
  const height = options.height ?? 50;
  const barWidth = options.barWidth ?? 1.6;
  const showText = options.showText ?? false;
  const fontSize = options.fontSize ?? 11;

  // Symbols array starts with START_B
  const symbols: number[] = [START_B];

  // Convert each ASCII character (range 32 to 127) to Code 128B symbol value
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Standard ASCII 32..127 maps to values 0..95
    if (code >= 32 && code <= 126) {
      symbols.push(code - 32);
    } else {
      // Fallback for unrecognized chars to space (symbol 0)
      symbols.push(0);
    }
  }

  // Calculate checksum: (START_B + sum(pos * val)) % 103
  let checksum = START_B;
  for (let pos = 1; pos < symbols.length; pos++) {
    const val = symbols[pos] ?? 0;
    checksum += pos * val;
  }
  symbols.push(checksum % 103);

  // Append STOP symbol
  symbols.push(STOP);

  // Render widths
  const quietZoneModules = 10;
  let totalModules = quietZoneModules * 2;
  const patterns: string[] = symbols.map((s) => CODE128_PATTERNS[s] ?? '212222');
  for (const pat of patterns) {
    for (let j = 0; j < pat.length; j++) {
      totalModules += Number(pat[j] ?? '1');
    }
  }

  const svgWidth = Math.ceil(totalModules * barWidth);
  const barcodeHeight = height;
  const textHeight = showText ? fontSize + 4 : 0;
  const svgHeight = barcodeHeight + textHeight;

  // Build SVG path data for the black bars
  let currentModule = quietZoneModules;
  let pathData = '';

  for (const pat of patterns) {
    for (let j = 0; j < pat.length; j++) {
      const widthInModules = Number(pat[j] ?? '1');
      const isBar = j % 2 === 0; // Even indices are bars, odd are spaces
      if (isBar) {
        const x = currentModule * barWidth;
        const w = widthInModules * barWidth;
        pathData += `M${x.toFixed(2)},0 h${w.toFixed(2)} v${barcodeHeight} h-${w.toFixed(2)} Z `;
      }
      currentModule += widthInModules;
    }
  }

  const textElement = showText
    ? `<text x="${(svgWidth / 2).toFixed(2)}" y="${(barcodeHeight + fontSize).toFixed(2)}" text-anchor="middle" font-family="monospace, monospace" font-size="${fontSize}" font-weight="600" fill="#000000">${text}</text>`
    : '';

  const classNameAttr = options.className ? ` class="${options.className}"` : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}"${classNameAttr} role="img" aria-label="Barcode: ${text}">
  <path d="${pathData.trim()}" fill="#000000" shape-rendering="crispEdges" />
  ${textElement}
</svg>`;

  return {
    svg,
    width: svgWidth,
    height: svgHeight,
    viewBox: `0 0 ${svgWidth} ${svgHeight}`,
    paths: pathData.trim(),
  };
}
