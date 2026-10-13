import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl, siteMeta } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy — EVM India',
  description:
    'Official Shipping and Delivery Policy for EVM India. Free express delivery across 19,000+ pin codes in India via BlueDart, with dispatch in 24-48 business hours.',
  alternates: { canonical: absoluteUrl('/shipping-policy') },
  openGraph: { title: 'Shipping & Delivery Policy — EVM India', url: absoluteUrl('/shipping-policy'), type: 'website' },
};

export default function ShippingPolicyPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Shipping & Delivery Policy', path: '/shipping-policy' },
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
              { name: 'Shipping & Delivery Policy', path: '/shipping-policy' },
            ]}
            className="mb-4"
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-2">
            Pan-India Delivery
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-950"
            style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
          >
            Shipping &amp; Delivery Policy
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-2xl">
            Fast, insured, and tracked doorstep delivery powered by India&apos;s leading express logistics networks.
          </p>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-neutral-800 text-xs sm:text-sm leading-relaxed">
            
            {/* Highlights */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm text-center sm:text-left">
                <span className="text-2xl mb-1 block">📦</span>
                <h3 className="font-semibold text-neutral-950 text-xs sm:text-sm">24–48H Dispatch</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Prompt packing &amp; hand-off from our central hub.</p>
              </div>
              <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm text-center sm:text-left">
                <span className="text-2xl mb-1 block">🚀</span>
                <h3 className="font-semibold text-neutral-950 text-xs sm:text-sm">Express Logistics</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Shipped via BlueDart across 19,000+ PIN codes.</p>
              </div>
              <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm text-center sm:text-left">
                <span className="text-2xl mb-1 block">📍</span>
                <h3 className="font-semibold text-neutral-950 text-xs sm:text-sm">Live SMS Tracking</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Real-time status updates from dispatch to doorstep.</p>
              </div>
            </div>

            {/* Coverage & Locations */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                1. Domestic Delivery Coverage
              </h2>
              <p>
                EVM provides pan-India shipping coverage across <strong>19,000+ serviceable PIN codes in 625+ cities</strong> spanning all 28 states and 8 union territories of India.
              </p>
              <p>
                Our central distribution hub is located at <strong>Paramount LOGITRADE, Bhiwandi / Mumbai, Maharashtra</strong>. Parcels are secured with tamper-evident security tape to ensure product integrity.
              </p>
            </div>

            {/* Estimated Timelines */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950">
                2. Dispatch &amp; Estimated Delivery Timelines
              </h2>
              <p>
                Orders confirmed before 2:00 PM IST on business days are processed for same-day or next-day dispatch. Standard transit timelines are outlined below:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-neutral-200 divide-y divide-neutral-200">
                  <thead className="bg-neutral-100 font-semibold text-neutral-900">
                    <tr>
                      <th className="p-3">Destination Region</th>
                      <th className="p-3">Primary Logistics</th>
                      <th className="p-3">Estimated Transit Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-3 font-medium">Mumbai, Thane &amp; Navi Mumbai</td>
                      <td className="p-3">BlueDart Express (Surface/Air)</td>
                      <td className="p-3 text-emerald-700 font-semibold">1 to 2 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Metro Cities (Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad)</td>
                      <td className="p-3">BlueDart Air / Express</td>
                      <td className="p-3 text-emerald-700 font-semibold">2 to 4 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Rest of India (Tier 2 &amp; Tier 3 Cities)</td>
                      <td className="p-3">BlueDart Ground Express</td>
                      <td className="p-3 text-neutral-800 font-medium">4 to 6 Business Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Special / Remote Regions (J&amp;K, North-East, Island territories)</td>
                      <td className="p-3">Insured Express Speed Post / BlueDart</td>
                      <td className="p-3 text-neutral-800 font-medium">5 to 8 Business Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-neutral-500">
                * Note: Working days exclude Sundays and national public holidays. Deliveries may experience minor delays during regional lockdowns, severe weather, or festival sale peaks.
              </p>
            </div>

            {/* Shipping Charges */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                3. Shipping Fees &amp; Transparent Pricing
              </h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Prepaid Orders:</strong> We provide <strong>Free Shipping</strong> on prepaid orders across India (UPI, Net Banking, Credit/Debit cards).</li>
                <li><strong>All-Inclusive GST:</strong> Shipping charges, where applicable, are transparently presented at checkout before payment confirmation and itemized on your official GST invoice.</li>
                <li><strong>Zero Hidden Costs:</strong> No additional fuel surcharge, entry tax, or octroi is charged to the customer at the time of delivery.</li>
              </ul>
            </div>

            {/* Order Tracking */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                4. Real-Time Tracking &amp; Notifications
              </h2>
              <p>
                As soon as your parcel is packed and handed over to BlueDart, you will receive:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>An automated <strong>SMS notification</strong> containing your BlueDart AWB tracking number.</li>
                <li>An <strong>Email dispatch confirmation</strong> with a live direct tracking hyperlink.</li>
                <li>In-app tracking on our website under your <Link href="/account/orders" className="text-neutral-950 font-semibold underline">Order History</Link>.</li>
              </ul>
            </div>

            {/* Delivery Protocol */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                5. Delivery Verification &amp; Parcel Inspection
              </h2>
              <p>
                For high-value electronics:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>The courier delivery personnel may request an OTP (One-Time Password) shared on your registered phone number prior to parcel handover.</li>
                <li><strong>Tamper Check:</strong> Please inspect the outer EVM packaging before accepting delivery. If the packaging appears opened, punctured, or retaped with non-EVM tape, please decline to accept the parcel and inform our support team immediately.</li>
                <li>In case of delivery discrepancies, notify us within <strong>48 hours</strong> at <a href={`mailto:${siteMeta.supportEmail}`} className="text-neutral-950 font-semibold underline">{siteMeta.supportEmail}</a>.</li>
              </ul>
            </div>

            {/* Support Box */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-5 text-neutral-700 text-xs">
              <p className="font-semibold text-neutral-900 mb-1">Track or expedite your shipment:</p>
              <p>
                Connect with our dispatch desk toll-free at <strong>{siteMeta.supportTollFree}</strong> (Monday–Saturday, 10 AM to 6:30 PM) or email <strong>{siteMeta.supportEmail}</strong> with your Order Reference ID.
              </p>
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}
