import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl, siteMeta } from '@/lib/config/site';
import { SELLER } from '@/services/tax/gst.config';

export const metadata: Metadata = {
  title: 'Disclaimer — EVM India',
  description:
    'Legal and product disclaimer for EVM India (Hundia Infosolutions Pvt Ltd). Technical specifications, third-party services, and general usage terms.',
  alternates: { canonical: absoluteUrl('/disclaimer') },
  openGraph: { title: 'Disclaimer — EVM India', url: absoluteUrl('/disclaimer'), type: 'website' },
};

export default function DisclaimerPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Disclaimer', path: '/disclaimer' },
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
              { name: 'Disclaimer', path: '/disclaimer' },
            ]}
            className="mb-4"
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-2">
            Legal &amp; Information
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-950"
            style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
          >
            Website &amp; Product Disclaimer
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-2xl">
            Important notices regarding technical claims, external payment integrations, and warranties.
          </p>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-neutral-800 text-xs sm:text-sm leading-relaxed">
            
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950">
                1. Product Performance &amp; Technical Benchmarks
              </h2>
              <p>
                All product technical specifications, battery capacities (e.g. 10,000mAh, 20,000mAh), audio playback hours, fast charging outputs (e.g. 20W MagSafe, 65W GaN), and noise cancellation decibel measurements advertised on <strong>{siteMeta.parentDomain}</strong> are evaluated under standard controlled laboratory test conditions.
              </p>
              <p>
                Actual real-world performance, charging speed, and battery longevity may vary depending on connected smartphone/laptop models, ambient temperature, battery health of the host device, wireless charging alignment, and usage conditions.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                2. Third-Party Payment Gateway Disclaimer
              </h2>
              <p>
                Financial transactions and electronic payment authorizations on this platform are conducted via licensed external third-party payment aggregators and banking gateways (including <strong>HDFC Bank Ltd</strong> and partner payment gateway systems). While we maintain industry-standard encrypted communication with payment switches, {SELLER.legalName} is not responsible for issuing bank server failures, OTP transmission latencies by telecom operators, or unauthorized use of personal credentials on unsecured customer devices.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                3. Logistics &amp; External Carrier Timelines
              </h2>
              <p>
                Shipment transit estimates presented on our platform are indicative guidelines provided by our logistics partners (BlueDart / eShipz). Transit schedules are subject to regional transit disruptions, force majeure, bad weather, or public holidays.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                4. Trademarks &amp; Compatibility Disclaimers
              </h2>
              <p>
                References to third-party brands, trademarks, or operating systems (such as Apple&reg;, MagSafe&reg;, iPhone&reg;, Android&trade;, Type-C&reg;) are used strictly for compatibility identification and descriptive purposes. EVM is an independent Indian electronics brand manufactured and marketed by {SELLER.legalName}.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-5 text-neutral-700 text-xs">
              <p className="font-semibold text-neutral-900 mb-1">Corporate Office &amp; Inquiries:</p>
              <p>
                {SELLER.legalName}, {SELLER.addressLine1} {SELLER.addressLine2}. Email: <a href={`mailto:${siteMeta.supportEmail}`} className="underline font-medium text-neutral-900">{siteMeta.supportEmail}</a> | Toll-Free Helpline: {siteMeta.supportTollFree}.
              </p>
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}
