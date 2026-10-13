'use client';

import { SELLER, resolveStateCode } from '@/services/tax/gst.config';
import { numberToWordsInr } from '@/lib/amount-to-words';
import type { PublicOrder } from '@/services/orders/order.types';

interface TaxInvoiceProps {
  order: PublicOrder;
  showPrintButton?: boolean;
}

function formatAmount(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TaxInvoice({ order, showPrintButton = true }: TaxInvoiceProps) {
  const dateObj = new Date(order.createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const printedAt = `${dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} at ${dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

  const subtotalPaise = order.subtotal;
  const shippingPaise = order.shipping.amount ?? 0;
  const taxBreakdown = order.tax.breakdown;
  const cgstPaise = taxBreakdown?.cgst ?? 0;
  const sgstPaise = taxBreakdown?.sgst ?? 0;
  const igstPaise = taxBreakdown?.igst ?? 0;
  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;

  const grandTotalPaise = order.total;
  const grandTotalRupees = Math.round(grandTotalPaise / 100);
  const totalTaxRupees = Math.round(totalTaxPaise / 100);

  const customerStateName = order.billingAddress?.state || order.shippingAddress?.state || 'Maharashtra';
  const customerStateCode = resolveStateCode(customerStateName) ?? '27';
  const isIntraState = taxBreakdown ? taxBreakdown.intraState : customerStateCode === SELLER.stateCode;

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="tax-invoice-printable mx-auto max-w-[850px] bg-white p-4 sm:p-6 font-sans text-[10.5px] leading-tight text-black print:p-0 print:max-w-none print:shadow-none">
      <style>{`
        @media print {
          /* Hide storefront header, footer, navigation, and print control button */
          header, footer, nav, aside, [role="banner"], [role="contentinfo"], .print\\:hidden {
            display: none !important;
          }

          /* Force 1-page A4 paper setup */
          @page {
            size: A4 portrait;
            margin: 4mm 6mm 4mm 6mm;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          .tax-invoice-printable {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Print Control Bar (Hidden on print) */}
      {showPrintButton && (
        <div className="mb-4 flex items-center justify-between border-b border-neutral-300 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span className="text-xs font-semibold text-neutral-800">Official Hundia Tax Invoice (1-Page Print Format)</span>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-neutral-800 active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save as PDF
          </button>
        </div>
      )}

      {/* Outer Invoice Container */}
      <div className="border border-black p-1.5 space-y-1 bg-white">
        {/* Top Header Title */}
        <div className="flex justify-between items-start text-center border-b border-black pb-1 px-1">
          <div className="w-24" />
          <div>
            <h1 className="text-sm font-bold tracking-wide uppercase">Tax Invoice</h1>
            <p className="text-[9px] font-semibold tracking-wider uppercase">SHREE SHANKESHWAR PARAS NATHAYA NAMAH</p>
          </div>
          <div className="text-right text-[9px] italic">
            <p>Printed on {printedAt}</p>
            <p className="font-semibold uppercase not-italic">(ORIGINAL FOR RECIPIENT)</p>
          </div>
        </div>

        {/* Seller & Logistics Grid */}
        <div className="grid grid-cols-12 border-b border-black divide-x divide-black text-[10px]">
          {/* Left Column: Seller & Addresses */}
          <div className="col-span-7 flex flex-col divide-y divide-black">
            {/* Seller Info */}
            <div className="p-2 space-y-0.5">
              <p className="font-black text-xs uppercase tracking-tight">{SELLER.legalName}</p>
              <p>{SELLER.addressLine1}</p>
              <p>{SELLER.addressLine2}</p>
              <p>TEL. {SELLER.tel}</p>
              <p>UDYAM : {SELLER.udyam}</p>
              <p>GSTIN/UIN: <span className="font-bold">{SELLER.gstin}</span></p>
              <p>State Name : {SELLER.stateName}, Code : {SELLER.stateCode}</p>
              <p>CIN: {SELLER.cin}</p>
            </div>

            {/* Consignee (Ship to) */}
            <div className="p-2 space-y-0.5">
              <p className="font-bold uppercase text-[9px] text-neutral-800">Consignee (Ship to)</p>
              <p className="font-bold uppercase">{order.customerName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
              <p>State Name : {order.shippingAddress.state}, Code : {customerStateCode}</p>
            </div>

            {/* Buyer (Bill to) */}
            <div className="p-2 space-y-0.5">
              <p className="font-bold uppercase text-[9px] text-neutral-800">Buyer (Bill to)</p>
              <p className="font-bold uppercase">{order.customerName}</p>
              <p>{order.billingAddress.addressLine1}</p>
              {order.billingAddress.addressLine2 && <p>{order.billingAddress.addressLine2}</p>}
              <p>{order.billingAddress.city}, {order.billingAddress.state} - {order.billingAddress.postalCode}</p>
              <p>State Name : {order.billingAddress.state}, Code : {customerStateCode}</p>
              <p>Place of Supply : {customerStateName}</p>
            </div>
          </div>

          {/* Right Column: Order Meta Grid */}
          <div className="col-span-5 divide-y divide-black text-[10px]">
            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">Invoice No.</p>
                <p className="font-bold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">Dated</p>
                <p className="font-bold">{formattedDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">Delivery Note</p>
                <p className="font-medium">—</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">Mode/Terms of Payment</p>
                <p className="font-bold">{order.paymentStatus === 'CAPTURED' ? 'Prepaid Online' : 'Standard'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">Reference No. & Date.</p>
                <p className="font-bold">{order.orderNumber} dt. {formattedDate}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">Other References</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">Buyer&apos;s Order No.</p>
                <p className="font-mono">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">Dated</p>
                <p>{formattedDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">Dispatched through</p>
                <p className="font-medium">{order.carrier || 'eShipz Courier'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">Destination</p>
                <p className="font-medium">{order.shippingAddress.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">AWB No.</p>
                <p className="font-mono font-bold">{order.awbNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">No. Of Boxes</p>
                <p className="font-bold">1</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black p-1.5 min-h-[36px]">
              <div>
                <p className="text-[9px] text-neutral-600">Courier Name</p>
                <p className="font-medium">{order.carrier || 'BlueDart'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-600">Total Weight</p>
                <p className="font-bold">0.5 kg</p>
              </div>
            </div>

            <div className="p-1.5 min-h-[30px]">
              <p className="text-[9px] text-neutral-600">Terms of Delivery</p>
              <p>Standard Door Delivery</p>
            </div>
          </div>
        </div>

        {/* Main Line Items Table */}
        <table className="w-full text-left border-collapse border-b border-black text-[10px]">
          <thead>
            <tr className="border-b border-black text-[9px] font-bold uppercase text-center bg-neutral-50">
              <th className="border-r border-black p-1 w-8">Sl No.</th>
              <th className="border-r border-black p-1 text-left">Description of Goods</th>
              <th className="border-r border-black p-1 w-20">HSN/SAC</th>
              <th className="border-r border-black p-1 w-16">Quantity</th>
              <th className="border-r border-black p-1 w-16 text-right">Rate</th>
              <th className="border-r border-black p-1 w-10">per</th>
              <th className="border-r border-black p-1 w-12 text-right">Disc. %</th>
              <th className="p-1 w-20 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-transparent">
            {order.items.map((item, idx) => {
              const lineAmount = item.lineSubtotal;
              return (
                <tr key={idx} className="align-top">
                  <td className="border-r border-black p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="border-r border-black p-1.5 space-y-1">
                    <p className="font-bold uppercase">{item.productTitleSnapshot}</p>
                    <div className="pl-4 italic text-[9px] space-y-0.5 font-medium">
                      {isIntraState ? (
                        <>
                          <div className="flex justify-between pr-4">
                            <span>CGST OUTPUT</span>
                            <span>{formatAmount(cgstPaise / order.items.length)}</span>
                          </div>
                          <div className="flex justify-between pr-4">
                            <span>SGST OUTPUT</span>
                            <span>{formatAmount(sgstPaise / order.items.length)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between pr-4">
                          <span>IGST OUTPUT</span>
                          <span>{formatAmount(igstPaise / order.items.length)}</span>
                        </div>
                      )}
                      {shippingPaise > 0 && (
                        <div className="flex justify-between pr-4">
                          <span>Shipping Fee</span>
                          <span>{formatAmount(shippingPaise)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="border-r border-black p-1.5 text-center font-mono">85044030</td>
                  <td className="border-r border-black p-1.5 text-center font-bold">{item.quantity} PCS</td>
                  <td className="border-r border-black p-1.5 text-right">{formatAmount(item.unitPrice)}</td>
                  <td className="border-r border-black p-1.5 text-center">PCS</td>
                  <td className="border-r border-black p-1.5 text-right">—</td>
                  <td className="p-1.5 text-right font-bold">{formatAmount(lineAmount)}</td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t border-black font-bold text-[11px] bg-neutral-50">
              <td className="border-r border-black p-1 text-center" />
              <td className="border-r border-black p-1 text-right uppercase">Total</td>
              <td className="border-r border-black p-1" />
              <td className="border-r border-black p-1 text-center">{totalQuantity} PCS</td>
              <td className="border-r border-black p-1" />
              <td className="border-r border-black p-1" />
              <td className="border-r border-black p-1" />
              <td className="p-1 text-right">₹ {formatAmount(grandTotalPaise)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount Chargeable in Words */}
        <div className="flex justify-between items-center border-b border-black p-1.5">
          <div>
            <p className="text-[9px] text-neutral-600">Amount Chargeable (in words)</p>
            <p className="font-black text-xs uppercase">{numberToWordsInr(grandTotalRupees)}</p>
          </div>
          <span className="text-[9px] italic font-bold">E. & O.E</span>
        </div>

        {/* GST Tax Breakdown Grid Table */}
        <div className="border-b border-black text-[9.5px]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-black font-bold text-[9px] bg-neutral-50">
                <th className="border-r border-black p-1 text-left">HSN/SAC</th>
                <th className="border-r border-black p-1 text-right">Taxable Value</th>
                {isIntraState ? (
                  <>
                    <th className="border-r border-black p-1 col-span-2" colSpan={2}>CGST</th>
                    <th className="border-r border-black p-1 col-span-2" colSpan={2}>SGST/UTGST</th>
                  </>
                ) : (
                  <th className="border-r border-black p-1 col-span-2" colSpan={2}>IGST</th>
                )}
                <th className="p-1 text-right">Total Tax Amount</th>
              </tr>
              <tr className="border-b border-black text-[8.5px] font-semibold">
                <th className="border-r border-black p-0.5" />
                <th className="border-r border-black p-0.5" />
                <th className="border-r border-black p-0.5 w-12">Rate</th>
                <th className="border-r border-black p-0.5 text-right">Amount</th>
                {isIntraState && (
                  <>
                    <th className="border-r border-black p-0.5 w-12">Rate</th>
                    <th className="border-r border-black p-0.5 text-right">Amount</th>
                  </>
                )}
                <th className="p-0.5 text-right" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-black p-1 text-left font-mono">85044030</td>
                <td className="border-r border-black p-1 text-right font-medium">{formatAmount(subtotalPaise)}</td>
                {isIntraState ? (
                  <>
                    <td className="border-r border-black p-1">9%</td>
                    <td className="border-r border-black p-1 text-right font-medium">{formatAmount(cgstPaise)}</td>
                    <td className="border-r border-black p-1">9%</td>
                    <td className="border-r border-black p-1 text-right font-medium">{formatAmount(sgstPaise)}</td>
                  </>
                ) : (
                  <>
                    <td className="border-r border-black p-1">18%</td>
                    <td className="border-r border-black p-1 text-right font-medium">{formatAmount(igstPaise)}</td>
                  </>
                )}
                <td className="p-1 text-right font-bold">{formatAmount(totalTaxPaise)}</td>
              </tr>
              <tr className="border-t border-black font-bold bg-neutral-50">
                <td className="border-r border-black p-1 text-right">Total</td>
                <td className="border-r border-black p-1 text-right">{formatAmount(subtotalPaise)}</td>
                {isIntraState ? (
                  <>
                    <td className="border-r border-black p-1" />
                    <td className="border-r border-black p-1 text-right">{formatAmount(cgstPaise)}</td>
                    <td className="border-r border-black p-1" />
                    <td className="border-r border-black p-1 text-right">{formatAmount(sgstPaise)}</td>
                  </>
                ) : (
                  <>
                    <td className="border-r border-black p-1" />
                    <td className="border-r border-black p-1 text-right">{formatAmount(igstPaise)}</td>
                  </>
                )}
                <td className="p-1 text-right">₹ {formatAmount(totalTaxPaise)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax Amount in Words */}
        <div className="p-1.5 border-b border-black">
          <p className="text-[9px] text-neutral-600">Tax Amount (in words) : <span className="font-bold text-black uppercase">{numberToWordsInr(totalTaxRupees)}</span></p>
        </div>

        {/* Declaration Section */}
        <div className="p-2 space-y-1 text-[9px]">
          <p className="font-bold uppercase">Declaration</p>
          <p className="text-[8.5px] leading-snug text-neutral-700">
            I/We hereby certify that my/our Registration Certificate under the GST Act 2017 is force on the date on which the sales of the goods specified in this TAX INVOICE is made by me/us and that the transcation sale covered by this TAX INVOICE has been effected by me/us and it shall be accounted for in the turnover of sales wehile filing of return and the due tax in any payable on the sale has been paid or shall be paid.
          </p>
        </div>
      </div>

      {/* Invoice Bottom Footer Notices */}
      <div className="mt-2 text-center text-[9px] font-bold tracking-wider uppercase">
        <p className="text-neutral-500 font-normal">This is a Computer Generated Invoice</p>
      </div>
    </div>
  );
}

