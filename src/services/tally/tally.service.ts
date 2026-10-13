import 'server-only';

import { logger } from '@/lib/logger';
import { SELLER, resolveStateCode } from '@/services/tax/gst.config';
import { patchOrder } from '@/services/orders/order.repository';
import type { Order } from '@/services/orders/order.types';

const TALLY_IMPORT_URL =
  process.env.TALLY_IMPORT_URL || 'http://103.155.204.49:5050/api/v1/import/sales-order';

/**
 * Hardcoded SKU to Tally Master Item Name mapping.
 * Falls back to product title snapshot if an unmapped SKU is encountered.
 */
export const SKU_TO_TALLY_ITEM: Record<string, string> = {
  'EVM-P0301-W': 'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
  'EVMP0301': 'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
  'EVM-P0301': 'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
  'EVM-WHF-01-BU': 'EnSonic EVM-WHF-01 BLUE Wireless Bluetooth headphone with mic',
  'EVM-WHF-01': 'EnSonic EVM-WHF-01 BLUE Wireless Bluetooth headphone with mic',
  'EVMWHF01BU': 'EnSonic EVM-WHF-01 BLUE Wireless Bluetooth headphone with mic',
  'EVM-HF01-B': 'Type-C Earphone EVM-HF-01 Black',
  'EVM-HF01': 'Type-C Earphone EVM-HF-01 Black',
  'EVMHF01B': 'Type-C Earphone EVM-HF-01 Black',
};

export function getTallyItemName(sku: string | undefined, title: string): string {
  if (!sku) return title;
  const trimmed = sku.trim();
  if (SKU_TO_TALLY_ITEM[trimmed]) return SKU_TO_TALLY_ITEM[trimmed];
  const matched = Object.entries(SKU_TO_TALLY_ITEM).find(
    ([k]) => k.toLowerCase() === trimmed.toLowerCase(),
  );
  if (matched) return matched[1];
  const stripped = trimmed.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  const fuzzy = Object.entries(SKU_TO_TALLY_ITEM).find(
    ([k]) => k.replace(/[^A-Za-z0-9]/g, '').toLowerCase() === stripped,
  );
  return fuzzy ? fuzzy[1] : title;
}

function formatDateDdMmYyyy(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function sendOrderToTally(order: Order): Promise<boolean> {
  try {
    const formattedDate = formatDateDdMmYyyy(order.createdAt);
    const voucherNo = `SO${order.orderNumber.replace(/[^A-Za-z0-9]/g, '')}-V`;
    const refNo = `SO${order.orderNumber.replace(/[^A-Za-z0-9]/g, '')}`;

    const customerStateName = order.shippingAddress?.state || order.billingAddress?.state || 'Maharashtra';
    const customerStateCode = resolveStateCode(customerStateName) ?? '27';
    // Interstate: whole of India excluding Maharashtra
    const isInterState = customerStateCode !== SELLER.stateCode;

    // Party Ledgers (Sundry Debtors created in Tally for D2C)
    const partyLedger = isInterState ? 'D2C Interstate Sales' : 'D2C Local Sales';
    // Sales Ledgers in Tally Accounting
    const salesLedger = isInterState ? 'Sales (interstate)' : 'Local Sales';

    const totalRupees = Number((order.total / 100).toFixed(2));
    const subtotalRupees = Number((order.subtotal / 100).toFixed(2));

    const taxBreakdown = order.tax.breakdown;
    const cgstRupees = taxBreakdown
      ? Number((taxBreakdown.cgst / 100).toFixed(2))
      : Number((order.tax.amount ? order.tax.amount / 200 : 0).toFixed(2));
    const sgstRupees = taxBreakdown
      ? Number((taxBreakdown.sgst / 100).toFixed(2))
      : Number((order.tax.amount ? order.tax.amount / 200 : 0).toFixed(2));
    const igstRupees = taxBreakdown
      ? Number((taxBreakdown.igst / 100).toFixed(2))
      : Number(((order.tax.amount ?? 0) / 100).toFixed(2));

    const totalCalculatedTax = isInterState ? igstRupees : cgstRupees + sgstRupees;
    const roundOff = Number((totalRupees - (subtotalRupees + totalCalculatedTax)).toFixed(2));

    const totalQty = order.items.reduce((sum, it) => sum + (it.quantity || 1), 0);

    const itemDetails = order.items.map((it) => {
      const qty = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1;
      const rate = Number((it.unitPrice / 100).toFixed(2));
      const amount = Number((it.lineSubtotal / 100).toFixed(2));
      return {
        ItemName: getTallyItemName(it.sku, it.productTitleSnapshot),
        GodownName: 'VASAI BRANCH',
        Unit: 'PCS',
        RateUnit: 'PCS',
        BilledUnit: 'PCS',
        ActualUnit: 'PCS',
        Quantity: qty,
        Qty: qty,
        BilledQty: qty,
        ActualQty: qty,
        BilledQuantity: qty,
        ActualQuantity: qty,
        Rate: rate,
        Discount: 0,
        Amount: amount,
        TaxPercent: 18.0,
      };
    });

    const ledgerDetails: Array<{
      LedgerName: string;
      Amount: number;
      BillAllocations: Array<{ Name: string; BillType: string; Amount: number }>;
    }> = [
      {
        LedgerName: partyLedger,
        Amount: -totalRupees,
        BillAllocations: [
          {
            Name: voucherNo,
            BillType: 'Agst Ref',
            Amount: totalRupees,
          },
        ],
      },
    ];

    if (isInterState) {
      ledgerDetails.push({
        LedgerName: 'IGST OUTPUT',
        Amount: igstRupees,
        BillAllocations: [],
      });
    } else {
      ledgerDetails.push(
        {
          LedgerName: 'CGST OUTPUT',
          Amount: cgstRupees,
          BillAllocations: [],
        },
        {
          LedgerName: 'SGST OUTPUT',
          Amount: sgstRupees,
          BillAllocations: [],
        },
      );
    }

    if (roundOff !== 0) {
      ledgerDetails.push({
        LedgerName: 'Round Off',
        Amount: roundOff,
        BillAllocations: [],
      });
    }

    const customerName = order.customerName || 'D2C Customer';
    const customerPhone = order.customerPhone || '';

    const payload = {
      Sale: [
        {
          VoucherNumber: voucherNo,
          VoucherDate: formattedDate,
          RefNo: refNo,
          RefDate: formattedDate,
          VoucherType: 'Sales (Vasai)',
          Narration: `EVM Storefront Order ${order.orderNumber}`,
          BuyerName: customerName,
          BuyerAddressType: 'Primary',
          BuyerAdd_1: order.billingAddress?.addressLine1 || order.shippingAddress?.addressLine1 || '',
          BuyerAdd_2: order.billingAddress?.addressLine2 || order.shippingAddress?.addressLine2 || '',
          BuyerAdd_3: `${order.billingAddress?.city || order.shippingAddress?.city || ''}, ${customerStateName}, ${order.billingAddress?.postalCode || order.shippingAddress?.postalCode || ''}`,
          BuyerAdd_4: customerPhone ? `Mob: ${customerPhone}` : '',
          BuyerCountry: 'India',
          BuyerState: customerStateName,
          BuyerPincode: order.billingAddress?.postalCode || order.shippingAddress?.postalCode || '',
          BuyerGSTNo: '',
          BuyerGSTRegistrationType: 'Consumer',
          ConsigneeName: customerName,
          ConsigneeMailingName: customerName,
          ConsigneeAddressType: 'Primary',
          ConsigneeAdd_1: order.shippingAddress?.addressLine1 || '',
          ConsigneeAdd_2: order.shippingAddress?.addressLine2 || '',
          ConsigneeAdd_3: `${order.shippingAddress?.city || ''}, ${customerStateName}, ${order.shippingAddress?.postalCode || ''}`,
          ConsigneeAdd_4: customerPhone ? `Mob: ${customerPhone}` : '',
          ConsigneeCountry: 'India',
          ConsigneeState: customerStateName,
          ConsigneePincode: order.shippingAddress?.postalCode || '',
          ConsigneeGSTNo: '',
          DispatchFromName: 'HUNDIA INFOSOLUTIONS PVT LTD',
          DispatchFromAddressType: 'VASAI NEW',
          DispatchFromAddress_1: 'GALA NO .2, 102, 202, 302, INDUSTRIAL BLDG.,',
          DispatchFromAddress_2: 'SQUARE INDUSTRIAL PARK,TUNGARESHWAR PHATA, SATIVALI,',
          DispatchFromAddress_3: 'N.H - 8,VASAI ( E),PALGHAR - 401208',
          DispatchFromAddress_4: '',
          DispatchFromStateName: 'Maharashtra',
          DispatchFromPinCode: '401208',
          DispatchFromGSTIN: SELLER.gstin,
          SalesLedger: salesLedger,
          TotalAmount: totalRupees,
          CompanyGSTIN: SELLER.gstin,
          CompanyState: 'Maharashtra',
          IsInterState: isInterState,
          ItemDetails: itemDetails,
          LedgerDetails: ledgerDetails,
          PartyLedgerName: partyLedger,
          PartyAddress: `${order.shippingAddress?.addressLine1 || ''}, ${order.shippingAddress?.city || ''}, ${customerStateName}, ${order.shippingAddress?.postalCode || ''}`,
          PartyContactDetails: customerPhone,
          ReferenceNumber: order.orderNumber,
          OrderNo: order.orderNumber,
          OrderDate: formattedDate,
          BuyerOrderNo: order.orderNumber,
          BuyerOrderDate: formattedDate,
          PONumber: order.orderNumber,
          PODate: formattedDate,
          TotalQty: totalQty,
          TotalQuantity: totalQty,
        },
      ],
    };

    logger.info('tally_sync_initiating', { orderNumber: order.orderNumber, url: TALLY_IMPORT_URL });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const apiKey = process.env.TALLY_API_KEY;
    if (apiKey) {
      headers['x-api-key'] = apiKey;
      headers['api-key'] = apiKey;
      headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
    }

    const response = await fetch(TALLY_IMPORT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    if (response.ok) {
      logger.info('tally_sync_success', { orderNumber: order.orderNumber, response: responseText.slice(0, 200) });
      await patchOrder(order.id, { tallyStatus: 'SENT', tallySyncedAt: new Date().toISOString() }).catch(() => {});
      return true;
    } else {
      logger.error('tally_sync_failed', { orderNumber: order.orderNumber, status: response.status, body: responseText.slice(0, 200) });
      await patchOrder(order.id, { tallyStatus: 'FAILED' }).catch(() => {});
      return false;
    }
  } catch (err) {
    logger.error('tally_sync_error', { orderNumber: order.orderNumber, error: String(err) });
    await patchOrder(order.id, { tallyStatus: 'FAILED' }).catch(() => {});
    return false;
  }
}
