/**
 * APPROVED EVM GST / seller configuration + official Indian GST state codes.
 *
 * These are EVM-approved business constants (seller GSTIN + state) and OFFICIAL
 * public reference data (GST state codes) — nothing here is invented. GSTIN is a
 * public identifier (printed on invoices), not a secret.
 *
 * Pricing model: product prices are GST-EXCLUSIVE — GST is added on top of the
 * catalog selling price. This is fixed here so the calculator never assumes.
 */
export const SELLER = {
  legalName: 'HUNDIA INFOSOLUTIONS PVT LTD',
  addressLine1: '101/102,1ST FLR,391,DIAMOND PLAZA,',
  addressLine2: 'LAMINGTON ROAD,DR.D.B.MARG, MUMBAI-400004',
  tel: '8655457098/7304497802 INT:7057/7583/7295',
  udyam: 'UDYAM-MH-19-0061612 (Medium)',
  gstin: '27AABCH7575H1ZA',
  stateName: 'Maharashtra',
  stateCode: '27',
  cin: 'U74999MH2006PTC161985',
  bankDetails: {
    holderName: 'HUNDIA INFOSOLUTIONS PVT LTD',
    bankName: 'INDUSIND BANK',
    accountNo: '650014044123',
    branchAndIfsc: 'OPERA HOUSE & INDB0000001',
  },
} as const;

export type PricingModel = 'exclusive' | 'inclusive';
export const PRICING_MODEL: PricingModel = 'exclusive';

/**
 * Official Indian GST state / UT codes, keyed by NORMALIZED state name.
 * (Reference: statutory GST state code list.) Used to (a) validate that a
 * destination state is a real Indian state and (b) determine intra- vs
 * inter-state supply. An unknown state is NOT classified — it yields no tax.
 */
const STATE_CODE_BY_NAME: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  punjab: '03',
  chandigarh: '04',
  uttarakhand: '05',
  haryana: '06',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  bihar: '10',
  sikkim: '11',
  'arunachal pradesh': '12',
  nagaland: '13',
  manipur: '14',
  mizoram: '15',
  tripura: '16',
  meghalaya: '17',
  assam: '18',
  'west bengal': '19',
  jharkhand: '20',
  odisha: '21',
  chhattisgarh: '22',
  'madhya pradesh': '23',
  gujarat: '24',
  'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27',
  'andhra pradesh': '37',
  karnataka: '29',
  goa: '30',
  lakshadweep: '31',
  kerala: '32',
  'tamil nadu': '33',
  puducherry: '34',
  'andaman and nicobar islands': '35',
  telangana: '36',
  ladakh: '38',
};

/** Common alternate spellings, 2-letter codes, and common typos mapped to canonical state name. */
const STATE_ALIASES: Record<string, string> = {
  // 2-letter postal/GST codes
  mh: 'maharashtra',
  dl: 'delhi',
  gj: 'gujarat',
  ka: 'karnataka',
  tn: 'tamil nadu',
  up: 'uttar pradesh',
  wb: 'west bengal',
  rj: 'rajasthan',
  mp: 'madhya pradesh',
  ap: 'andhra pradesh',
  ts: 'telangana',
  tg: 'telangana',
  kl: 'kerala',
  pb: 'punjab',
  hr: 'haryana',
  br: 'bihar',
  jh: 'jharkhand',
  od: 'odisha',
  or: 'odisha',
  ct: 'chhattisgarh',
  cg: 'chhattisgarh',
  ga: 'goa',
  uk: 'uttarakhand',
  ut: 'uttarakhand',
  hp: 'himachal pradesh',
  jk: 'jammu and kashmir',
  as: 'assam',
  tr: 'tripura',
  ml: 'meghalaya',
  mn: 'manipur',
  nl: 'nagaland',
  mz: 'mizoram',
  ar: 'arunachal pradesh',
  sk: 'sikkim',
  ch: 'chandigarh',
  py: 'puducherry',
  la: 'ladakh',

  // Common misspellings and abbreviations
  maharasha: 'maharashtra',
  maharastra: 'maharashtra',
  maharashra: 'maharashtra',
  maharashta: 'maharashtra',
  karnatka: 'karnataka',
  karnatak: 'karnataka',
  tamilnadu: 'tamil nadu',
  uttarpradesh: 'uttar pradesh',
  madhyapradesh: 'madhya pradesh',
  andhrapradesh: 'andhra pradesh',
  westbengal: 'west bengal',
  orissa: 'odisha',
  pondicherry: 'puducherry',
  uttaranchal: 'uttarakhand',
  'nct of delhi': 'delhi',
  'new delhi': 'delhi',
  chattisgarh: 'chhattisgarh',
  chatisgarh: 'chhattisgarh',
};

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

/** Normalize a free-text state string: trim, lowercase, strip dots, collapse ws. */
function normalizeStateName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Resolve a destination state string to its official GST state code.
 * Accepts a canonical/aliased state NAME, 2-digit numeric code, abbreviation, or common typo.
 */
export function resolveStateCode(input: string | undefined | null): string | null {
  if (!input) return null;
  const normalized = normalizeStateName(input);
  if (!normalized) return null;

  // Exact 2-digit GST state code.
  if (/^\d{2}$/.test(normalized)) {
    const known = Object.values(STATE_CODE_BY_NAME).includes(normalized);
    return known ? normalized : null;
  }

  const canonical = STATE_ALIASES[normalized] ?? normalized;
  return STATE_CODE_BY_NAME[canonical] ?? null;
}

/** True when the destination is the seller's state (intra-state supply). */
export function isIntraState(destinationStateCode: string): boolean {
  return destinationStateCode === SELLER.stateCode;
}
