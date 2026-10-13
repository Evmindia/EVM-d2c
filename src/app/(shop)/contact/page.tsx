import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl, siteMeta } from '@/lib/config/site';
import { SELLER } from '@/services/tax/gst.config';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us — EVM India',
  description:
    'Get in touch with the official EVM customer care and corporate office of Hundia Infosolutions Pvt Ltd. Doorstep warranty, order queries, and business support.',
  alternates: { canonical: absoluteUrl('/contact') },
  openGraph: { title: 'Contact Us — EVM India', url: absoluteUrl('/contact'), type: 'website' },
};

export default function ContactPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Contact Us', path: '/contact' },
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
              { name: 'Contact Us', path: '/contact' },
            ]}
            className="mb-4"
          />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#b3a291] mb-2">
            We Are Here To Help
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-950"
            style={{ fontFamily: 'Didot, Bodoni MT, "Times New Roman", serif' }}
          >
            Contact Customer Care
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-2xl">
            Have questions about your order, product specifications, or warranty service? Reach our dedicated Mumbai team.
          </p>
        </Container>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-start">
            
            {/* Left Column: Official Contact & Company Info */}
            <div className="space-y-6">
              
              {/* Registered Office Box */}
              <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 border border-emerald-200 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Registered Corporate Office
                </span>
                <h2 className="text-base sm:text-lg font-bold text-neutral-950">
                  {SELLER.legalName}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {SELLER.addressLine1}<br />
                  {SELLER.addressLine2}<br />
                  India
                </p>
                <div className="mt-4 pt-4 border-t border-neutral-200/80 grid grid-cols-2 gap-3 text-xs text-neutral-600 font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 block font-sans">GSTIN</span>
                    <span className="font-semibold text-neutral-900">{SELLER.gstin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 block font-sans">CIN</span>
                    <span className="font-semibold text-neutral-900">{SELLER.cin}</span>
                  </div>
                </div>
              </div>

              {/* Direct Support Channels */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-300 bg-white p-5 shadow-sm">
                  <div className="text-xl mb-2">📞</div>
                  <h3 className="font-bold text-neutral-950 text-xs sm:text-sm">Phone Helpline</h3>
                  <p className="text-xs text-neutral-600 mt-1">Official customer care helpline</p>
                  <a
                    href={`tel:${siteMeta.supportTollFree.replace(/\s+/g, '')}`}
                    className="mt-3 block text-sm font-semibold text-neutral-900 hover:text-black underline"
                  >
                    {siteMeta.supportTollFree} (Toll-Free)
                  </a>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Mon–Sat: 10:00 AM – 6:30 PM IST</p>
                </div>

                <div className="rounded-xl border border-neutral-300 bg-white p-5 shadow-sm">
                  <div className="text-xl mb-2">✉️</div>
                  <h3 className="font-bold text-neutral-950 text-xs sm:text-sm">Email Support</h3>
                  <p className="text-xs text-neutral-600 mt-1">Average response within 24h</p>
                  <a
                    href={`mailto:${siteMeta.supportEmail}`}
                    className="mt-3 block text-sm font-semibold text-neutral-900 hover:text-black underline break-all"
                  >
                    {siteMeta.supportEmail}
                  </a>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Order &amp; Warranty Helpdesk</p>
                </div>
              </div>

              {/* Operating Hours & Doorstep Warranty Banner */}
              <div className="rounded-xl border border-neutral-300 bg-neutral-900 text-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white">Support Operating Hours</h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                    IST (GMT+5:30)
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Monday to Saturday: <strong>10:00 AM – 6:30 PM IST</strong><br />
                  Sundays &amp; National Public Holidays: <em>Closed</em>
                </p>
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">Doorstep Warranty Care</p>
                    <p className="text-[11px] text-neutral-400">Pickup &amp; drop service across 625+ cities</p>
                  </div>
                  <a
                    href="https://evmzone.com/evm-pickup-and-drop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200 shrink-0"
                  >
                    Claim Warranty ↗
                  </a>
                </div>
              </div>

            </div>

            {/* Right Column: Interactive Contact Form */}
            <div className="rounded-2xl border border-neutral-300 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 mb-1">
                Send Us a Message
              </h2>
              <p className="text-xs text-neutral-600 mb-6">
                Fill in your details below and our customer support team will get back to you shortly.
              </p>
              <ContactForm />
            </div>

          </div>
        </Container>
      </section>
    </div>
  );
}
