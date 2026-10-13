import 'server-only';

/**
 * BlueDart GenerateWayBill request/response shapes, transcribed from the BRD
 * (TSD_BlueDart_APIGEE_V2.7). Field NAMES match the doc; exact casing/wrapper of
 * the live JSON must be confirmed against the OpenAPI spec. Only the subset we
 * populate is typed strictly; the rest is left open.
 */

export interface BluedartProfile {
  LoginID: string;
  LicenceKey: string;
  Api_type?: string;
}

export interface BluedartShipperPayload {
  OriginArea: string;
  CustomerCode: string;
  CustomerName: string;
  CustomerAddress1: string;
  CustomerAddress2?: string;
  CustomerAddress3?: string;
  CustomerPincode: string;
  CustomerMobile?: string;
  CustomerEmailID?: string;
  IsToPayCustomer?: boolean;
}

export interface BluedartConsigneePayload {
  ConsigneeName: string;
  ConsigneeAddress1: string;
  ConsigneeAddress2?: string;
  ConsigneeAddress3?: string;
  ConsigneePincode: string;
  ConsigneeMobile?: string;
  ConsigneeEmailID?: string;
  ConsigneeTelephone?: string;
}

export interface BluedartServicesPayload {
  ProductCode: string;
  ProductType: 0 | 1; // 0=Docs, 1=Dutiables
  SubProductCode: string; // 'P'=Prepaid, 'C'=COD
  PieceCount: number;
  ActualWeight: number; // kg
  DeclaredValue?: number; // INR
  CollectableAmount?: number; // INR (COD)
  CreditReferenceNo: string; // unique — we use order number
  PickupDate: string; // BlueDart /Date(...)/ epoch format
  PickupTime: string; // 'HHmm', e.g. '1600'
  RegisterPickup?: boolean;
  PDFOutputNotRequired?: boolean;
  PrinterLabelSize?: string;
}

export interface WayBillGenerationRequest {
  Consignee: BluedartConsigneePayload;
  Shipper: BluedartShipperPayload;
  Services: BluedartServicesPayload;
}

export interface GenerateWaybillBody {
  Request: WayBillGenerationRequest;
  Profile: BluedartProfile;
}

export interface WaybillGenerationStatus {
  StatusCode?: string;
  StatusInformation?: string;
}

/** Response payload (unwrapped). Fields we read are typed; others left open. */
export interface WayBillGenerationResponse {
  IsError?: boolean;
  AWBNo?: string;
  AWBPrintContent?: string | number[] | null; // byte[] → typically base64 string
  CCRCRDREF?: string;
  TokenNumber?: string;
  Status?: WaybillGenerationStatus[];
  [key: string]: unknown;
}
