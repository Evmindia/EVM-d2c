import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl, siteMeta } from '@/lib/config/site';
import { SELLER } from '@/services/tax/gst.config';

export const metadata: Metadata = {
  title: 'Terms & Conditions — EVM India',
  description:
    'Official Terms & Conditions governing the use of the EVM store and purchase of electronics products from Hundia Infosolutions Pvt Ltd.',
  alternates: { canonical: absoluteUrl('/terms-and-conditions') },
  openGraph: { title: 'Terms & Conditions — EVM India', url: absoluteUrl('/terms-and-conditions'), type: 'website' },
};

export default function TermsPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Terms & Conditions', path: '/terms-and-conditions' },
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
              { name: 'Terms & Conditions', path: '/terms-and-conditions' },
            ]}
            className="mb-4"
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-2">
            Legal Agreement
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-950"
            style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
          >
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-2xl">
            Last Updated: October 2026 • Valid for all transactions processed on {siteMeta.parentDomain}.
          </p>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-neutral-800 text-xs sm:text-sm leading-relaxed">
            
            {/* Preamble */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 mb-3">
                1. General Overview &amp; Acceptance of Terms
              </h2>
              <p className="mb-3">
                Welcome to <strong>EVM India</strong>. This website is owned and operated by <strong>{SELLER.legalName}</strong> (CIN: {SELLER.cin}, GSTIN: {SELLER.gstin}), having its registered office at {SELLER.addressLine1} {SELLER.addressLine2}.
              </p>
              <p>
                By visiting our website, browsing products, creating an account, or placing an order, you agree to be legally bound by the following terms, conditions, policies, and notices stated herein (<strong>&ldquo;Terms of Service&rdquo;</strong>, <strong>&ldquo;Terms&rdquo;</strong>). If you do not agree with any part of these Terms, you may not access or use our services.
              </p>
            </div>

            {/* Eligibility */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                2. User Eligibility &amp; Account Responsibility
              </h2>
              <p>
                By agreeing to these Terms, you represent that you are at least 18 years of age (or the age of majority under the Indian Contract Act, 1872) and legally competent to enter into binding commercial contracts.
              </p>
              <p>
                If you create an account, you are solely responsible for maintaining the confidentiality of your login credentials and for all activities conducted under your account. You agree to notify us immediately of any unauthorized access or breach of security.
              </p>
            </div>

            {/* Product Information & Pricing */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                3. Products, Catalog Pricing &amp; GST Invoicing
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Pricing &amp; Currency:</strong> All prices listed on our website are denominated in <strong>Indian Rupees (INR / ₹)</strong>. Pricing displays indicate applicable Goods &amp; Services Tax (GST) in accordance with Indian tax laws.
                </li>
                <li>
                  <strong>Tax Invoices:</strong> Every successful order generates an official GST Tax Invoice specifying our GSTIN ({SELLER.gstin}), HSN codes, and appropriate CGST/SGST (for intra-state supplies in Maharashtra) or IGST (for inter-state supplies across India).
                </li>
                <li>
                  <strong>Product Descriptions:</strong> We make every effort to display the colors, technical specifications, and battery capacities of our products as accurately as possible. However, actual battery performance may vary depending on device compatibility, ambient temperature, and usage patterns.
                </li>
                <li>
                  <strong>Price Adjustments:</strong> Prices for our products are subject to revision without prior notice. We reserve the right at any time to modify or discontinue any product model without liability.
                </li>
              </ul>
            </div>

            {/* Payments & Payment Gateway */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                4. Orders &amp; Payment Gateway Processing
              </h2>
              <p>
                We accept payments through secure, RBI-licensed payment gateways including <strong>HDFC Bank Payment Gateway</strong>, UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking across all major Indian banks, and Visa, MasterCard, RuPay, and American Express cards.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>By initiating a payment, you warrant that you are authorized to use the designated card, bank account, or UPI handle.</li>
                <li>In case of transaction timeout, failure, or multiple deductions due to network latency, funds deducted from your bank account are automatically reversed by your issuing bank within 3 to 7 working days as per standard banking protocol.</li>
                <li>We reserve the right to decline or cancel any order suspected of fraudulent activity, card authorization mismatches, or unauthorized bulk commercial reselling.</li>
              </ul>
            </div>

            {/* Shipping & Delivery */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                5. Shipping, Dispatch &amp; Doorstep Delivery
              </h2>
              <p>
                Products are packaged and dispatched through our trusted logistics partners (including <strong>BlueDart Express</strong>). Consignments are dispatched from our fulfillment facility in Bhiwandi / Mumbai, Maharashtra. Please refer to our detailed <Link href="/shipping-policy" className="text-neutral-950 font-semibold underline">Shipping Policy</Link> for delivery timelines and tracking information.
              </p>
            </div>

            {/* Warranty & Replacements */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                6. Warranty &amp; Doorstep Pickup Service
              </h2>
              <p>
                EVM products come with manufacturer warranty against genuine functional defects. We are proud to provide <strong>Doorstep Pickup &amp; Drop warranty services</strong> across 625+ Indian cities.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Warranty claims must be accompanied by the original GST Tax Invoice.</li>
                <li>Physical breakage, water submersion (beyond rated ingress ratings), tampering of internal circuits, or unauthorized repairs void warranty coverage.</li>
                <li>Detailed service claim instructions can be accessed on our official warranty portal at <a href="https://evmzone.com/evm-pickup-and-drop" target="_blank" rel="noopener noreferrer" className="text-neutral-950 font-semibold underline">evmzone.com/evm-pickup-and-drop</a>.</li>
              </ul>
            </div>

            {/* Intellectual Property */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                7. Intellectual Property Rights
              </h2>
              <p>
                All brand names, trademarks, logos, product design aesthetics, product photographs, videos, marketing copy, and software source code on this website are the proprietary property of <strong>{SELLER.legalName}</strong>. Unauthorized copying, reverse-engineering, distribution, or commercial exploitation is strictly prohibited and subject to civil and criminal prosecution under Indian Intellectual Property laws.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                8. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted under applicable law, in no event shall {SELLER.legalName}, its directors, officers, or employees be liable for any indirect, incidental, punitive, or consequential damages resulting from the use of or inability to use our products or website. Our total aggregate liability for any proven claim arising out of an order shall not exceed the actual purchase price paid by you for the specific product giving rise to the claim.
              </p>
            </div>

            {/* Governing Law & Dispute Resolution */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 mb-3">
                9. Governing Law &amp; Exclusive Jurisdiction
              </h2>
              <p className="mb-3">
                These Terms and Conditions shall be governed by, construed, and enforced in accordance with the <strong>laws of India</strong>, without regard to conflict of law principles.
              </p>
              <p>
                Any legal action, claim, or dispute arising out of or related to these Terms, our website, or purchases made through our platform shall be subject to the <strong>exclusive jurisdiction of the competent courts at Mumbai, Maharashtra, India</strong>.
              </p>
            </div>

            {/* Contact Information */}
            <div className="pt-2 text-xs text-neutral-600">
              <p>
                For any questions regarding these Terms &amp; Conditions, please reach out to our legal and customer support desk at <a href={`mailto:${siteMeta.supportEmail}`} className="text-neutral-950 font-semibold underline">{siteMeta.supportEmail}</a> or call us toll-free at {siteMeta.supportTollFree}.
              </p>
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}
