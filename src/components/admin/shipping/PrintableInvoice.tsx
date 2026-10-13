'use client';

import React from 'react';
import { SELLER } from '@/services/tax/gst.config';
import { formatInr } from '@/lib/format';
import { numberToWordsInr } from '@/lib/amount-to-words';

export interface InvoiceOrderData {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: {
    amount: number | null;
    breakdown?: {
      cgst: number;
      sgst: number;
      igst: number;
      rate: number | null;
      intraState: boolean;
    } | null;
  };
  shipping: { amount: number | null };
  paymentStatus: string;
  awbNumber?: string | null;
  shipmentProvider?: string | null;
  items: Array<{
    sku: string;
    productTitleSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
  }>;
  shippingAddress: {
    fullName?: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  billingAddress?: {
    fullName?: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

interface PrintableInvoiceProps {
  order: InvoiceOrderData;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function PrintableInvoice({ order }: PrintableInvoiceProps) {
  const isInterstate = Boolean(order.tax.breakdown && !order.tax.breakdown.intraState);
  const totalRupees = Math.round(order.total / 100);
  const words = numberToWordsInr(totalRupees);

  return (
    <div
      className="invoice-page mx-auto bg-white text-black font-sans leading-normal p-6 border border-gray-300 print:border-none print:p-0"
      style={{
        width: '8.27in', // A4 standard width
        minHeight: '11in',
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      {/* 1. Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4">
        <div>
          <div className="w-28 mb-2">
            <svg viewBox="0 0 461 183" className="w-full h-auto fill-black">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 85 178 L 105 178 L 105 177 L 111 177 L 111 176 L 115 176 L 115 175 L 118 175 L 118 174 L 122 174 L 122 173 L 124 173 L 124 172 L 127 172 L 127 171 L 129 171 L 129 170 L 131 170 L 131 169 L 133 169 L 133 168 L 135 168 L 135 167 L 139 166 L 140 164 L 142 164 L 142 163 L 143 163 L 143 162 L 145 162 L 146 160 L 148 160 L 148 159 L 149 159 L 149 158 L 150 158 L 150 157 L 151 157 L 151 156 L 152 156 L 152 155 L 153 155 L 153 154 L 154 154 L 154 153 L 155 153 L 155 152 L 156 152 L 156 151 L 157 151 L 157 150 L 158 150 L 158 149 L 159 149 L 159 148 L 160 148 L 160 147 L 161 147 L 161 146 L 163 145 L 163 143 L 164 143 L 164 142 L 166 141 L 166 139 L 168 138 L 169 134 L 171 133 L 171 131 L 172 131 L 172 129 L 173 129 L 173 127 L 174 127 L 174 124 L 175 124 L 175 122 L 176 122 L 176 119 L 177 119 L 178 113 L 179 113 L 179 108 L 180 108 L 180 102 L 181 102 L 181 80 L 180 80 L 180 74 L 179 74 L 178 66 L 177 66 L 176 60 L 175 60 L 175 58 L 174 58 L 174 56 L 173 56 L 173 53 L 171 52 L 171 50 L 170 50 L 169 46 L 167 45 L 167 43 L 165 42 L 165 40 L 164 40 L 164 39 L 162 38 L 162 36 L 161 36 L 161 35 L 160 35 L 160 34 L 159 34 L 159 33 L 158 33 L 158 32 L 157 32 L 157 31 L 156 31 L 156 30 L 155 30 L 155 29 L 154 29 L 154 28 L 153 28 L 153 27 L 152 27 L 152 26 L 151 26 L 150 24 L 148 24 L 148 23 L 147 23 L 146 21 L 144 21 L 144 20 L 143 20 L 142 18 L 138 17 L 137 15 L 135 15 L 135 14 L 133 14 L 133 13 L 131 13 L 131 12 L 129 12 L 129 11 L 126 11 L 126 10 L 124 10 L 124 9 L 118 8 L 118 7 L 114 7 L 114 6 L 109 6 L 109 5 L 102 5 L 102 4 L 83 4 L 83 5 L 76 5 L 76 6 L 68 7 L 68 8 L 65 8 L 65 9 L 59 10 L 59 11 L 57 11 L 57 12 L 55 12 L 55 13 L 53 13 L 53 14 L 51 14 L 51 15 L 47 16 L 46 18 L 44 18 L 44 19 L 42 19 L 42 20 L 41 20 L 40 22 L 38 22 L 38 23 L 37 23 L 37 24 L 36 24 L 36 25 L 35 25 L 34 27 L 32 27 L 32 28 L 31 28 L 31 29 L 30 29 L 30 30 L 29 30 L 29 31 L 27 32 L 27 34 L 26 34 L 26 35 L 25 35 L 25 36 L 24 36 L 24 37 L 22 38 L 22 40 L 21 40 L 21 41 L 19 42 L 19 44 L 17 45 L 17 47 L 16 47 L 16 49 L 15 49 L 15 51 L 14 51 L 14 53 L 13 53 L 13 55 L 12 55 L 12 57 L 11 57 L 11 59 L 10 59 L 10 62 L 9 62 L 9 65 L 8 65 L 8 68 L 7 68 L 7 72 L 6 72 L 6 77 L 5 77 L 5 86 L 4 86 L 4 97 L 5 97 L 5 105 L 6 105 L 6 110 L 7 110 L 7 114 L 8 114 L 8 118 L 9 118 L 9 121 L 10 121 L 10 123 L 11 123 L 11 125 L 12 125 L 12 128 L 13 128 L 14 132 L 16 133 L 16 135 L 17 135 L 17 137 L 19 138 L 19 140 L 21 141 L 21 143 L 22 143 L 22 144 L 23 144 L 23 145 L 25 146 L 25 148 L 26 148 L 26 149 L 27 149 L 27 150 L 28 150 L 28 151 L 29 151 L 29 152 L 30 152 L 30 153 L 31 153 L 31 154 L 32 154 L 32 155 L 33 155 L 34 157 L 36 157 L 36 158 L 37 158 L 37 159 L 38 159 L 39 161 L 41 161 L 42 163 L 44 163 L 44 164 L 45 164 L 45 165 L 47 165 L 48 167 L 50 167 L 50 168 L 52 168 L 52 169 L 54 169 L 54 170 L 56 170 L 56 171 L 59 171 L 59 172 L 61 172 L 61 173 L 67 174 L 67 175 L 71 175 L 71 176 L 75 176 L 75 177 L 81 177 L 81 178 L 84 178 Z"
              />
            </svg>
          </div>
          <h2 className="text-xs font-bold text-gray-900">{SELLER.legalName}</h2>
          <p className="text-[11px] text-gray-600 max-w-sm">
            {SELLER.addressLine1} {SELLER.addressLine2}
          </p>
          <p className="text-[11px] text-gray-600">
            GSTIN: <strong>{SELLER.gstin}</strong> | CIN: {SELLER.cin}
          </p>
          <p className="text-[11px] text-gray-600">
            State: {SELLER.stateName} (Code: {SELLER.stateCode})
          </p>
        </div>

        <div className="text-right">
          <h1 className="text-lg font-black uppercase tracking-wider text-black">
            TAX INVOICE
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Original for Recipient</p>
          <div className="mt-2 text-xs text-gray-900 space-y-0.5">
            <p>
              Invoice No:{' '}
              <strong className="font-mono">{order.orderNumber}</strong>
            </p>
            <p>Invoice Date: <strong>{formatDate(order.createdAt)}</strong></p>
            <p>
              Payment Mode:{' '}
              <strong className="uppercase">
                {order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'PAID'
                  ? 'Prepaid (Razorpay Online)'
                  : 'Cash on Delivery'}
              </strong>
            </p>
            {order.awbNumber && (
              <p>
                AWB / Waybill: <strong className="font-mono">{order.awbNumber}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Customer Billing & Shipping Addresses */}
      <div className="grid grid-cols-2 gap-4 py-3 border-b border-gray-300 text-xs">
        <div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1">
            Bill To:
          </h3>
          <p className="font-black text-sm text-black">
            {order.billingAddress?.fullName || order.customerName}
          </p>
          <p className="text-gray-700">
            {order.billingAddress?.addressLine1 || order.shippingAddress.addressLine1}
            {order.billingAddress?.addressLine2 ? `, ${order.billingAddress.addressLine2}` : ''}
          </p>
          <p className="text-gray-700">
            {order.billingAddress?.city || order.shippingAddress.city},{' '}
            {order.billingAddress?.state || order.shippingAddress.state} -{' '}
            {order.billingAddress?.postalCode || order.shippingAddress.postalCode}
          </p>
          <p className="text-gray-700 mt-1">Phone: {order.customerPhone}</p>
          <p className="text-gray-700">Email: {order.customerEmail}</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1">
            Ship To (Delivery Address):
          </h3>
          <p className="font-black text-sm text-black">
            {order.shippingAddress.fullName || order.customerName}
          </p>
          <p className="text-gray-700">
            {order.shippingAddress.addressLine1}
            {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
          </p>
          <p className="text-gray-700 font-medium">
            {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
            <strong>{order.shippingAddress.postalCode}</strong>
          </p>
          <p className="text-gray-700 mt-1">Phone: {order.customerPhone}</p>
          <p className="text-gray-700">
            Place of Supply: <strong>{order.shippingAddress.state}</strong>
          </p>
        </div>
      </div>

      {/* 3. Line Items Table */}
      <div className="py-4">
        <table className="w-full text-xs text-left border border-gray-300">
          <thead className="bg-gray-100 text-[10px] font-black uppercase text-gray-800 border-b border-gray-300">
            <tr>
              <th className="p-2 w-8">#</th>
              <th className="p-2">Item & SKU</th>
              <th className="p-2 w-16 text-center">HSN</th>
              <th className="p-2 w-12 text-center">Qty</th>
              <th className="p-2 text-right">Unit Price</th>
              <th className="p-2 text-right">Taxable</th>
              <th className="p-2 text-right">GST Rate</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map((it, idx) => {
              const itemTotal = it.lineSubtotal * 1.18; // approx incl GST
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 text-gray-500 text-center">{idx + 1}</td>
                  <td className="p-2">
                    <div className="font-bold text-black">{it.productTitleSnapshot}</div>
                    <div className="text-[10px] font-mono text-gray-600">{it.sku}</div>
                  </td>
                  <td className="p-2 text-center font-mono text-[11px]">8504</td>
                  <td className="p-2 text-center font-bold">{it.quantity}</td>
                  <td className="p-2 text-right">{formatInr(it.unitPrice)}</td>
                  <td className="p-2 text-right font-medium">{formatInr(it.lineSubtotal)}</td>
                  <td className="p-2 text-right">18%</td>
                  <td className="p-2 text-right font-bold">{formatInr(itemTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Tax Breakdown & Calculations */}
      <div className="grid grid-cols-2 gap-4 py-2 text-xs">
        <div className="space-y-2 border border-gray-200 p-3 rounded">
          <div>
            <span className="font-bold text-gray-700 text-[10px] uppercase">
              Amount in Words:
            </span>
            <p className="font-bold text-black mt-0.5">{words}</p>
          </div>
          <div className="text-[10px] text-gray-600 space-y-0.5 pt-2 border-t border-gray-200">
            <p><strong>Declaration:</strong></p>
            <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            <p className="pt-1">
              <strong>Warranty Terms:</strong> All EVM® products come with standard manufacturer replacement warranty. Retain this invoice and box for warranty support.
            </p>
          </div>
        </div>

        <div className="border border-gray-200 p-3 rounded space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-700">
            <span>Taxable Subtotal:</span>
            <span className="font-medium">{formatInr(order.subtotal)}</span>
          </div>

          {isInterstate ? (
            <div className="flex justify-between text-gray-700">
              <span>Integrated GST (IGST 18%):</span>
              <span className="font-medium">{formatInr(order.tax.amount ?? 0)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-gray-700">
                <span>Central GST (CGST 9%):</span>
                <span className="font-medium">
                  {formatInr(order.tax.breakdown?.cgst ?? (order.tax.amount ? order.tax.amount / 2 : 0))}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>State GST (SGST 9%):</span>
                <span className="font-medium">
                  {formatInr(order.tax.breakdown?.sgst ?? (order.tax.amount ? order.tax.amount / 2 : 0))}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between text-gray-700">
            <span>Shipping & Handling:</span>
            <span className="font-medium">
              {order.shipping.amount ? formatInr(order.shipping.amount) : 'FREE'}
            </span>
          </div>

          {order.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount Applied:</span>
              <span>-{formatInr(order.discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t-2 border-black text-sm font-black text-black">
            <span>Grand Total (INR):</span>
            <span className="text-base">{formatInr(order.total)}</span>
          </div>
        </div>
      </div>

      {/* 5. Signatory Footer */}
      <div className="flex justify-between items-end pt-8 text-xs text-gray-700">
        <div>
          <p>Customer Support: <strong>care@evmzone.com</strong></p>
          <p>Toll Free Helpdesk: <strong>1800 120 4464</strong></p>
        </div>
        <div className="text-center">
          <div className="font-bold text-black mb-6">For HUNDIA INFOSOLUTIONS PVT LTD</div>
          <div className="border-t border-gray-400 pt-1 text-[10px] text-gray-500">
            Authorized Signatory (Computer Generated Invoice)
          </div>
        </div>
      </div>
    </div>
  );
}
