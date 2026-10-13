import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl, siteMeta } from '@/lib/config/site';
import { SELLER } from '@/services/tax/gst.config';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — EVM India',
  description:
    'Official Return, Replacement, Cancellation & Refund Policy for EVM products. Learn about our 7-day replacement warranty and 5-7 business day refund turnaround.',
  alternates: { canonical: absoluteUrl('/refund-policy') },
  openGraph: { title: 'Refund & Cancellation Policy — EVM India', url: absoluteUrl('/refund-policy'), type: 'website' },
};

export default function RefundPolicyPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Refund & Cancellation Policy', path: '/refund-policy' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-[#f4f1ec] text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header Banner */}
      <section className="border-b border-neutral-300/60 bg-white/70 backdrop-blur-md py-10 sm:py-14">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Home', path: '/' },
              { name: 'Refund & Cancellation Policy', path: '/refund-policy' },
            ]}
            className="mb-4"
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-2">
            Customer Guarantee &amp; Transparency
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-950"
            style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
          >
            Refund &amp; Cancellation Policy
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-2xl">
            Customer-first returns, hassle-free replacements, and clear refund timelines compliant with Indian consumer protection guidelines.
          </p>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-neutral-800 text-xs sm:text-sm leading-relaxed">
            
            {/* Quick Summary Cards */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm text-center sm:text-left">
                <span className="text-2xl mb-1 block">⏱️</span>
                <h3 className="font-semibold text-neutral-950 text-xs sm:text-sm">Easy Cancellation</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Cancel anytime before package dispatch from warehouse.</p>
              </div>
              <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm text-center sm:text-left">
                <span className="text-2xl mb-1 block">🔄</span>
                <h3 className="font-semibold text-neutral-950 text-xs sm:text-sm">7-Day Replacement</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Free replacement for defective or damaged in-transit goods.</p>
              </div>
              <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm text-center sm:text-left">
                <span className="text-2xl mb-1 block">💳</span>
                <h3 className="font-semibold text-neutral-950 text-xs sm:text-sm">5-7 Days Refund</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Direct bank reversal to original payment source upon approval.</p>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                1. Order Cancellation Policy
              </h2>
              <div className="space-y-2">
                <p>
                  <strong>Cancellation by Customer:</strong> You may cancel your order free of cost at any time <em>before the order is packed and dispatched</em> from our central logistics facility. Once an AWB (Air Waybill) number is generated and handed over to BlueDart, the consignment cannot be cancelled in transit and must follow the standard return process upon arrival.
                </p>
                <p>
                  To request a pre-dispatch cancellation, please email us immediately at <a href={`mailto:${siteMeta.supportEmail}`} className="text-neutral-950 font-semibold underline">{siteMeta.supportEmail}</a> or call our customer care helpline at <strong>{siteMeta.supportTollFree}</strong> (Toll Free) with your Order Reference ID.
                </p>
                <p>
                  <strong>Cancellation by EVM:</strong> We reserve the right to cancel an order under extraordinary circumstances such as:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Unserviceable delivery PIN code or courier restriction.</li>
                  <li>Inaccurate contact information or non-response to address verification.</li>
                  <li>Inadvertent pricing or inventory listing errors on the website.</li>
                  <li>Suspected unauthorized or fraudulent payment gateway attempts.</li>
                </ul>
                <p className="text-xs text-neutral-600">
                  In case of cancellation initiated by EVM, a 100% full refund is issued automatically to your original payment method.
                </p>
              </div>
            </div>

            {/* Return & Replacement Policy */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                2. Replacement &amp; Return Eligibility (7 Days)
              </h2>
              <p>
                At EVM, we take pride in rigorous quality control. We provide a <strong>7-Day Replacement Guarantee</strong> for products purchased directly from our official online store:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Damaged in Transit or Missing Items:</strong> If your parcel arrives tampered, physically damaged, or with missing accessories, please notify us within <strong>48 hours of delivery</strong>. We strongly recommend capturing a quick video or photograph while unboxing the outer packaging to expedite verification.
                </li>
                <li>
                  <strong>Dead on Arrival (DOA) / Functional Defects:</strong> If the product does not power on, does not charge, or displays an electronic defect out of the box, you are eligible for an immediate brand replacement within 7 days of delivery.
                </li>
                <li>
                  <strong>Incorrect Product Received:</strong> If the item delivered does not match your order invoice (wrong model or color), we will arrange a reverse pickup and deliver the correct item at zero additional cost.
                </li>
              </ul>
            </div>

            {/* Non-Returnable Scenarios */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                3. Conditions Where Returns / Refunds Are Not Applicable
              </h2>
              <p>Returns or refunds cannot be accepted in the following situations:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Physical damage caused by drops, burns, electrical surges, or liquid ingress not covered under product specifications.</li>
                <li>Missing serial number, tampered warranty stickers, or missing original retail packaging and bundled accessories.</li>
                <li>Products returned without original GST Tax Invoice.</li>
                <li>Subjective dissatisfaction regarding cosmetic preference or sound signature when the product operates fully within technical specifications.</li>
                <li>Items reported after the expiration of the 7-day replacement window (subsequent claims fall under the comprehensive manufacturer warranty).</li>
              </ul>
            </div>

            {/* Refund Timeline (Mandatory for HDFC Bank) */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950">
                4. Refund Processing &amp; Turnaround Timelines
              </h2>
              <p>
                When a return or cancellation is approved, refunds are credited <strong>strictly to the original payment source</strong> used during checkout (in compliance with Reserve Bank of India and Payment Gateway regulations):
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-neutral-200 divide-y divide-neutral-200">
                  <thead className="bg-neutral-100 font-semibold text-neutral-900">
                    <tr>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Refund Destination</th>
                      <th className="p-3">Estimated Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-3 font-medium">Credit / Debit Cards</td>
                      <td className="p-3">Issuing Bank Account</td>
                      <td className="p-3 text-emerald-700 font-medium">5 to 7 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">UPI (GPay, PhonePe, Paytm)</td>
                      <td className="p-3">Linked VPA / Bank Account</td>
                      <td className="p-3 text-emerald-700 font-medium">2 to 4 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Net Banking</td>
                      <td className="p-3">Originating Bank Account</td>
                      <td className="p-3 text-emerald-700 font-medium">5 to 7 Business Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-neutral-600 mt-2">
                * Note: Timelines represent standard banking clearance cycles. EVM initiates the payment gateway refund command immediately upon return inspection. If your refund is delayed beyond 7 business days, please contact your card issuing bank with the RRN (Refund Reference Number) provided by us.
              </p>
            </div>

            {/* How to Initiate a Return */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                5. How to Initiate a Return or Replacement
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Contact Support:</strong> Email <a href={`mailto:${siteMeta.supportEmail}`} className="text-neutral-950 font-semibold underline">{siteMeta.supportEmail}</a> or call our toll-free helpline at <strong>{siteMeta.supportTollFree}</strong> with your Order Number and issue details.
                </li>
                <li>
                  <strong>Inspection &amp; Approval:</strong> Our team will review the claim and share reverse courier pickup details or a pre-paid shipping waybill.
                </li>
                <li>
                  <strong>Packaging:</strong> Securely place the item in its original box with all cables, manuals, and invoice.
                </li>
                <li>
                  <strong>Resolution:</strong> Once the consignment reaches our inspection hub, our engineers verify the unit within 48 business hours and immediately process your replacement dispatch or refund.
                </li>
              </ol>
            </div>

            {/* Helpdesk Box */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-5 text-neutral-700 text-xs">
              <p className="font-semibold text-neutral-900 mb-1">Need help with an ongoing refund?</p>
              <p>
                Reach our Customer Support Desk toll-free at <strong>{siteMeta.supportTollFree}</strong> (Mon–Sat, 10 AM to 6:30 PM). Corporate Office: {SELLER.legalName}, {SELLER.addressLine1} {SELLER.addressLine2}.
              </p>
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}
