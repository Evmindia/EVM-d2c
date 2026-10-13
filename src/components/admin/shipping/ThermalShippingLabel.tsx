'use client';

import React from 'react';
import { generateCode128Svg } from '@/lib/barcodes/code128';
import { SELLER } from '@/services/tax/gst.config';
import { formatInr } from '@/lib/format';

export interface ShippingLabelOrder {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentStatus?: string;
  total: number;
  awbNumber?: string | null;
  shipmentProvider?: string | null;
  items: Array<{
    sku: string;
    productTitleSnapshot: string;
    quantity: number;
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
}

interface ThermalShippingLabelProps {
  order: ShippingLabelOrder;
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

/**
 * High-contrast, brand-official 4" x 6" Thermal Shipping Sticker component.
 *
 * Engineered specifically for 203/300 DPI thermal roll label printers:
 * - Exact 4in x 6in bounding box with clean margins.
 * - Solid monochrome (#000000) vector artwork (no grey raster dithering).
 * - Vector SVG Code 128 barcode of AWB / Order Reference.
 * - High-visibility PINCODE box for courier sorting hubs.
 * - Warehouse packing checklist for item verification before taping.
 * - Official Vasai logistics hub return address with GSTIN.
 */
export function ThermalShippingLabel({ order }: ThermalShippingLabelProps) {
  const isCod = order.paymentStatus !== 'PAID' && order.paymentStatus !== 'CAPTURED';
  const barcodeValue = order.awbNumber || order.orderNumber;
  const barcode = generateCode128Svg(barcodeValue, {
    height: 48,
    barWidth: 1.5,
    showText: false,
  });

  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div
      className="thermal-label relative mx-auto bg-white text-black font-sans leading-tight border border-black"
      style={{
        width: '4in',
        height: '6in',
        maxHeight: '6in',
        padding: '0.12in',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      {/* 1. Header with Logo & Routing Badge */}
      <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
        <div className="flex items-center gap-2">
          {/* Official EVM Brand Vector Logo */}
          <div className="w-24 text-black">
            <svg viewBox="0 0 461 183" className="w-full h-auto fill-black">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 85 178 L 105 178 L 105 177 L 111 177 L 111 176 L 115 176 L 115 175 L 118 175 L 118 174 L 122 174 L 122 173 L 124 173 L 124 172 L 127 172 L 127 171 L 129 171 L 129 170 L 131 170 L 131 169 L 133 169 L 133 168 L 135 168 L 135 167 L 139 166 L 140 164 L 142 164 L 142 163 L 143 163 L 143 162 L 145 162 L 146 160 L 148 160 L 148 159 L 149 159 L 149 158 L 150 158 L 150 157 L 151 157 L 151 156 L 152 156 L 152 155 L 153 155 L 153 154 L 154 154 L 154 153 L 155 153 L 155 152 L 156 152 L 156 151 L 157 151 L 157 150 L 158 150 L 158 149 L 159 149 L 159 148 L 160 148 L 160 147 L 161 147 L 161 146 L 163 145 L 163 143 L 164 143 L 164 142 L 166 141 L 166 139 L 168 138 L 169 134 L 171 133 L 171 131 L 172 131 L 172 129 L 173 129 L 173 127 L 174 127 L 174 124 L 175 124 L 175 122 L 176 122 L 176 119 L 177 119 L 178 113 L 179 113 L 179 108 L 180 108 L 180 102 L 181 102 L 181 80 L 180 80 L 180 74 L 179 74 L 178 66 L 177 66 L 176 60 L 175 60 L 175 58 L 174 58 L 174 56 L 173 56 L 173 53 L 171 52 L 171 50 L 170 50 L 169 46 L 167 45 L 167 43 L 165 42 L 165 40 L 164 40 L 164 39 L 162 38 L 162 36 L 161 36 L 161 35 L 160 35 L 160 34 L 159 34 L 159 33 L 158 33 L 158 32 L 157 32 L 157 31 L 156 31 L 156 30 L 155 30 L 155 29 L 154 29 L 154 28 L 153 28 L 153 27 L 152 27 L 152 26 L 151 26 L 150 24 L 148 24 L 148 23 L 147 23 L 146 21 L 144 21 L 144 20 L 143 20 L 142 18 L 138 17 L 137 15 L 135 15 L 135 14 L 133 14 L 133 13 L 131 13 L 131 12 L 129 12 L 129 11 L 126 11 L 126 10 L 124 10 L 124 9 L 118 8 L 118 7 L 114 7 L 114 6 L 109 6 L 109 5 L 102 5 L 102 4 L 83 4 L 83 5 L 76 5 L 76 6 L 68 7 L 68 8 L 65 8 L 65 9 L 59 10 L 59 11 L 57 11 L 57 12 L 55 12 L 55 13 L 53 13 L 53 14 L 51 14 L 51 15 L 47 16 L 46 18 L 44 18 L 44 19 L 42 19 L 42 20 L 41 20 L 40 22 L 38 22 L 38 23 L 37 23 L 37 24 L 36 24 L 36 25 L 35 25 L 34 27 L 32 27 L 32 28 L 31 28 L 31 29 L 30 29 L 30 30 L 29 30 L 29 31 L 27 32 L 27 34 L 26 34 L 26 35 L 25 35 L 25 36 L 24 36 L 24 37 L 22 38 L 22 40 L 21 40 L 21 41 L 19 42 L 19 44 L 17 45 L 17 47 L 16 47 L 16 49 L 15 49 L 15 51 L 14 51 L 14 53 L 13 53 L 13 55 L 12 55 L 12 57 L 11 57 L 11 59 L 10 59 L 10 62 L 9 62 L 9 65 L 8 65 L 8 68 L 7 68 L 7 72 L 6 72 L 6 77 L 5 77 L 5 86 L 4 86 L 4 97 L 5 97 L 5 105 L 6 105 L 6 110 L 7 110 L 7 114 L 8 114 L 8 118 L 9 118 L 9 121 L 10 121 L 10 123 L 11 123 L 11 125 L 12 125 L 12 128 L 13 128 L 14 132 L 16 133 L 16 135 L 17 135 L 17 137 L 19 138 L 19 140 L 21 141 L 21 143 L 22 143 L 22 144 L 23 144 L 23 145 L 25 146 L 25 148 L 26 148 L 26 149 L 27 149 L 27 150 L 28 150 L 28 151 L 29 151 L 29 152 L 30 152 L 30 153 L 31 153 L 31 154 L 32 154 L 32 155 L 33 155 L 34 157 L 36 157 L 36 158 L 37 158 L 37 159 L 38 159 L 39 161 L 41 161 L 42 163 L 44 163 L 44 164 L 45 164 L 45 165 L 47 165 L 48 167 L 50 167 L 50 168 L 52 168 L 52 169 L 54 169 L 54 170 L 56 170 L 56 171 L 59 171 L 59 172 L 61 172 L 61 173 L 67 174 L 67 175 L 71 175 L 71 176 L 75 176 L 75 177 L 81 177 L 81 178 L 84 178 Z"
              />
            </svg>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-black border border-black px-1 py-0.5 rounded">
            D2C Express
          </span>
        </div>

        <div className="text-right flex flex-col items-end">
          <div
            className={`px-2 py-0.5 text-xs font-black uppercase tracking-wider rounded ${
              isCod
                ? 'bg-black text-white'
                : 'border-2 border-black text-black bg-white'
            }`}
          >
            {isCod ? `COD: ${formatInr(order.total)}` : 'PREPAID'}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-tight mt-0.5">
            {order.shipmentProvider || 'STANDARD SURFACE / AIR'}
          </div>
        </div>
      </div>

      {/* 2. Barcode Section */}
      <div className="border-b-2 border-black py-1.5 flex flex-col items-center">
        <div
          className="w-full flex justify-center overflow-hidden"
          dangerouslySetInnerHTML={{ __html: barcode.svg }}
        />
        <div className="font-mono text-xs font-black tracking-widest mt-0.5">
          {barcodeValue}
        </div>
        <div className="flex justify-between w-full text-[9px] font-semibold text-black mt-1 px-1">
          <span>Order: <strong className="font-mono font-bold">{order.orderNumber}</strong></span>
          <span>Date: {formatDate(order.createdAt)}</span>
          <span>Items: <strong>{totalQty} Pcs</strong></span>
        </div>
      </div>

      {/* 3. Ship To / Consignee Details */}
      <div className="border-b-2 border-black py-1.5">
        <div className="text-[9px] uppercase font-bold tracking-wider text-gray-700">
          Ship To / Delivery Address:
        </div>
        <div className="text-sm font-black uppercase text-black mt-0.5">
          {order.shippingAddress.fullName || order.customerName}
        </div>
        <div className="text-[11px] font-bold text-black mt-0.5 leading-snug">
          {order.shippingAddress.addressLine1}
          {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-[11px] font-bold uppercase text-black">
            {order.shippingAddress.city}, {order.shippingAddress.state}
          </div>
          {/* High-visibility PINCODE Box */}
          <div className="border-2 border-black bg-black text-white px-2 py-0.5 font-mono font-black text-sm tracking-wider rounded">
            PIN: {order.shippingAddress.postalCode}
          </div>
        </div>
        <div className="text-[11px] font-black text-black mt-1 flex items-center gap-1">
          <span>Contact:</span>
          <span className="font-mono text-xs tracking-wider">
            {order.shippingAddress.phone || order.customerPhone}
          </span>
        </div>
      </div>

      {/* 4. Warehouse Packing Checklist */}
      <div className="border-b border-black py-1">
        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-gray-800 mb-0.5">
          <span>SKU & Description</span>
          <span>Qty</span>
        </div>
        <div className="space-y-0.5 max-h-16 overflow-hidden">
          {order.items.slice(0, 3).map((it, idx) => (
            <div
              key={idx}
              className="flex justify-between items-start text-[9px] leading-tight font-medium"
            >
              <div className="truncate max-w-[2.8in]">
                <strong className="font-mono font-bold">{it.sku}</strong>
                <span className="ml-1 text-gray-800">
                  {it.productTitleSnapshot.slice(0, 32)}
                </span>
              </div>
              <div className="font-mono font-black text-[10px] pl-1">
                x{it.quantity}
              </div>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-[8px] italic text-gray-600">
              +{order.items.length - 3} more items in package
            </div>
          )}
        </div>
      </div>

      {/* 5. Return / Shipper Address */}
      <div className="py-1 text-[8px] leading-tight text-gray-900 border-b border-dashed border-black">
        <div className="font-black uppercase tracking-wider text-black">
          If Undelivered, Return To:
        </div>
        <div className="font-bold text-black">{SELLER.legalName} (EVM® Logistics Hub)</div>
        <div>Square Industrial Park, Tungarreshwar Phata, Sativali, Vasai (E), Palghar, MH - 401208</div>
        <div className="flex justify-between mt-0.5">
          <span>GSTIN: <strong>{SELLER.gstin}</strong></span>
          <span>Support: <strong>care@evmzone.com</strong></span>
        </div>
      </div>

      {/* 6. Footer Notice */}
      <div className="pt-1 flex items-center justify-between text-[7px] font-bold tracking-tight text-gray-700">
        <span>FRAGILE ELECTRONICS · HANDLE WITH CARE</span>
        <span>EVM® GENUINE SEALED PRODUCT</span>
      </div>
    </div>
  );
}
