import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl, siteMeta } from '@/lib/config/site';
import { SELLER } from '@/services/tax/gst.config';

export const metadata: Metadata = {
  title: 'Privacy Policy — EVM India',
  description:
    'Official Privacy Policy for EVM India (Hundia Infosolutions Pvt Ltd). Learn how we collect, protect, and use your personal data in accordance with the Information Technology Act, 2000.',
  alternates: { canonical: absoluteUrl('/privacy-policy') },
  openGraph: { title: 'Privacy Policy — EVM India', url: absoluteUrl('/privacy-policy'), type: 'website' },
};

export default function PrivacyPolicyPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Privacy Policy', path: '/privacy-policy' },
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
              { name: 'Privacy Policy', path: '/privacy-policy' },
            ]}
            className="mb-4"
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-2">
            Legal &amp; Data Protection
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-950"
            style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
          >
            Privacy Policy
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-2xl">
            Last Updated: October 2026 • Governed under the Information Technology Act, 2000 and Digital Personal Data Protection guidelines.
          </p>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-neutral-800 text-xs sm:text-sm leading-relaxed">
            
            {/* Overview Box */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 mb-3">
                1. Introduction &amp; Commitment to Privacy
              </h2>
              <p className="mb-3">
                <strong>{SELLER.legalName}</strong> (hereinafter referred to as <strong>&ldquo;EVM&rdquo;</strong>, <strong>&ldquo;We&rdquo;</strong>, <strong>&ldquo;Our&rdquo;</strong>, or <strong>&ldquo;Us&rdquo;</strong>) operates the official e-commerce platform and brand services at <strong>{siteMeta.parentDomain}</strong>. We are committed to safeguarding the privacy and personal information of every visitor, customer, and user (<strong>&ldquo;You&rdquo;</strong> or <strong>&ldquo;User&rdquo;</strong>).
              </p>
              <p>
                This Privacy Policy explains how we collect, record, process, store, disclose, and protect your personal information when you access our website, purchase our consumer electronics products (power banks, audio equipment, chargers, and accessories), or utilize our customer warranty and support services.
              </p>
            </div>

            {/* Information Collected */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                2. Information We Collect
              </h2>
              <p>
                To provide seamless order fulfillment, customer support, and warranty coverage, we collect the following categories of information:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Contact &amp; Identification Data:</strong> Your name, phone number, email address, billing address, and doorstep delivery shipping address.
                </li>
                <li>
                  <strong>Order &amp; Transaction Details:</strong> Products purchased, order amounts, invoice references, GST identification (where applicable for B2B input tax credit), delivery tracking numbers, and order history.
                </li>
                <li>
                  <strong>Payment Data:</strong> Payments on our website are processed through <strong>RBI-authorized Payment Gateways</strong> (including HDFC Bank Payment Gateway, Razorpay, and compliant UPI/card networks). <em>We do not store or capture your raw debit/credit card numbers, CVV, or net banking passwords on our servers.</em> All payment card processing is 100% tokenized and encrypted according to PCI-DSS Level 1 standards.
                </li>
                <li>
                  <strong>Device &amp; Technical Usage Data:</strong> IP address, browser type, operating system, device identifiers, and pages viewed, gathered via standard cookies and log files to ensure security, prevent fraud, and improve site performance.
                </li>
              </ul>
            </div>

            {/* Use of Information */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                3. Purpose of Processing Your Information
              </h2>
              <p>We process your personal data strictly for legitimate operational purposes, including:</p>
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="font-semibold text-neutral-900 mb-1">Order Fulfillment &amp; Delivery</h3>
                  <p className="text-xs text-neutral-600">Processing checkout, generating GST tax invoices, and handing over consignments to logistics partners (BlueDart / eShipz) for doorstep delivery.</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="font-semibold text-neutral-900 mb-1">Warranty &amp; Service Care</h3>
                  <p className="text-xs text-neutral-600">Managing product serial numbers, warranty registrations, and doorstep pickup &amp; drop service requests across 625+ Indian cities.</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="font-semibold text-neutral-900 mb-1">Transactional Communications</h3>
                  <p className="text-xs text-neutral-600">Sending order confirmations, shipping dispatch tracking links, and delivery status alerts via SMS and email.</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="font-semibold text-neutral-900 mb-1">Security &amp; Legal Compliance</h3>
                  <p className="text-xs text-neutral-600">Detecting fraudulent transactions, verifying bank gateway authorizations, and maintaining statutory tax and accounting records under Indian law.</p>
                </div>
              </div>
            </div>

            {/* Sharing with Third Parties */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                4. Third-Party Disclosures &amp; Service Partners
              </h2>
              <p>
                <strong>We never sell, rent, or trade your personal information to third-party data brokers.</strong> Your data is shared strictly on a need-to-know basis with vetted technology and fulfillment partners who adhere to high security standards:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Payment Aggregators &amp; Banking Partners:</strong> HDFC Bank Ltd, authorized card processing networks, and payment gateway providers to execute secure electronic payments.</li>
                <li><strong>Logistics &amp; Courier Partners:</strong> BlueDart Express, eShipz, and designated courier personnel solely to deliver packages to your specified address.</li>
                <li><strong>Transactional Notification Services:</strong> Telecom/SMS gateways (KapSystem) to deliver OTPs, order updates, and delivery confirmations.</li>
                <li><strong>Government Authorities:</strong> Law enforcement or judicial bodies if required by applicable Indian statutes, summons, or GST verification procedures.</li>
              </ul>
            </div>

            {/* Data Retention & Security */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                5. Data Security &amp; Storage
              </h2>
              <p>
                We implement comprehensive administrative, technical, and physical safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>End-to-end <strong>256-bit SSL/TLS 1.3 encryption</strong> for all browser-to-server communications.</li>
                <li>Strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and role-based access control.</li>
                <li>Cloud database architecture hosted in enterprise-grade certified Indian data centers complying with ISO 27001 standards.</li>
              </ul>
            </div>

            {/* Cookies */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                6. Cookies &amp; Browser Tracking
              </h2>
              <p>
                Our store uses essential and analytical cookies to remember items in your shopping bag, maintain user login sessions, and measure page load speeds. You can configure your browser to decline cookies, but please note that some essential checkout features may not function properly without cookies enabled.
              </p>
            </div>

            {/* User Rights */}
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-950 border-b border-neutral-300/80 pb-2">
                7. Your Rights &amp; Choices
              </h2>
              <p>
                Under applicable Indian privacy regulations, you have the right to access, rectify, or request deletion of your personal account data. To request data updates or opt out of non-transactional marketing communications, email us at <a href={`mailto:${siteMeta.supportEmail}`} className="text-neutral-950 font-semibold underline">{siteMeta.supportEmail}</a>.
              </p>
            </div>

            {/* Grievance Officer Box (Mandatory under IT Act, 2000) */}
            <div className="rounded-2xl border border-neutral-300 bg-neutral-900 text-white p-6 sm:p-8 shadow-md">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
                8. Grievance Redressal Officer (IT Act, 2000 Compliance)
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 mb-4">
                In accordance with the Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the details of our designated Grievance Officer are provided below:
              </p>
              <div className="space-y-1.5 text-xs text-neutral-300 font-mono bg-neutral-950/60 p-4 rounded-xl border border-white/10">
                <p><span className="text-white/60">Entity:</span> {SELLER.legalName}</p>
                <p><span className="text-white/60">Designation:</span> Nodal Grievance Redressal Officer</p>
                <p><span className="text-white/60">Corporate Address:</span> {SELLER.addressLine1} {SELLER.addressLine2}</p>
                <p><span className="text-white/60">Email:</span> <a href={`mailto:${siteMeta.supportEmail}`} className="text-white underline">{siteMeta.supportEmail}</a></p>
                <p><span className="text-white/60">Helpline:</span> {siteMeta.supportTollFree} (Toll-Free)</p>
                <p><span className="text-white/60">Hours:</span> Monday to Saturday, 10:00 AM – 6:30 PM IST</p>
              </div>
            </div>

            {/* Updates to Policy */}
            <div className="pt-2 text-xs text-neutral-500">
              <p>
                We reserve the right to modify or update this Privacy Policy at any time. Any changes will be posted immediately on this page with an updated &ldquo;Last Updated&rdquo; date. Continued use of our website signifies your acceptance of the revised policy.
              </p>
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}
