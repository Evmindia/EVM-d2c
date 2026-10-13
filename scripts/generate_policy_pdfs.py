#!/usr/bin/env python3
"""
Generate official, high-quality PDF compliance documents for EVM India (Hundia Infosolutions Pvt Ltd).
Tailored for HDFC Bank Merchant Onboarding, Payment Gateway verification, and regulatory compliance.
"""

import os
from fpdf import FPDF

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "policies")
os.makedirs(OUTPUT_DIR, exist_ok=True)
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "logo.png")

COMPANY_NAME = "HUNDIA INFOSOLUTIONS PVT LTD"
BRAND_NAME = "EVM India"
CIN = "U74999MH2006PTC161985"
GSTIN = "27AABCH7575H1ZA"
OFFICE_ADDR = "101/102, 1st Flr, 391 Diamond Plaza, Lamington Rd, Mumbai - 400004, MH, India"
EMAIL = "support@evmzone.com"
PHONE = "1800 102 0432 (Toll Free)"
WEBSITE = "https://shop.evmzone.com"


class PolicyPDF(FPDF):
    def __init__(self, doc_title="Official Store Policy"):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.doc_title = doc_title
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)

    def header(self):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(20, 20, 20)
        
        has_logo = os.path.exists(LOGO_PATH)
        if has_logo:
            try:
                self.image(LOGO_PATH, x=18, y=12, w=22)
                self.set_xy(44, 12)
            except Exception:
                self.set_xy(18, 12)
        else:
            self.set_xy(18, 12)

        self.cell(100, 5, BRAND_NAME, new_x="LMARGIN", new_y="NEXT")
        self.set_x(44 if has_logo else 18)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(90, 90, 90)
        self.cell(100, 4, f"{COMPANY_NAME} | CIN: {CIN} | GSTIN: {GSTIN}", new_x="LMARGIN", new_y="NEXT")
        self.set_x(44 if has_logo else 18)
        self.cell(100, 3.5, f"Regd. Office: {OFFICE_ADDR}", new_x="LMARGIN", new_y="NEXT")

        # Right aligned Document title
        self.set_xy(120, 12)
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(140, 115, 90) # Accent gold
        self.cell(72, 4.5, self.doc_title.upper(), align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_xy(120, 16.5)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(120, 120, 120)
        self.cell(72, 4, "Official Merchant Compliance Document", align="R", new_x="LMARGIN", new_y="NEXT")

        # Divider line
        self.set_draw_color(210, 205, 200)
        self.set_line_width(0.3)
        self.line(18, 27, 192, 27)
        self.set_y(32)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.line(18, 283, 192, 283)

        self.set_font("Helvetica", "", 7)
        self.set_text_color(110, 110, 110)
        self.cell(115, 8, f"{COMPANY_NAME} | {WEBSITE} | Support: {EMAIL}", align="L")
        self.cell(59, 8, f"Page {self.page_no()} of {{nb}}", align="R")

    def chapter_title(self, title):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(15, 15, 15)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def subtitle(self, text):
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 4.5, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def section_heading(self, heading):
        self.ln(2)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(20, 20, 20)
        self.cell(0, 5.5, heading, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def paragraph(self, text):
        self.set_font("Helvetica", "", 8.2)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 4.2, text)
        self.ln(2)

    def bullet(self, label, text):
        self.set_font("Helvetica", "B", 8.2)
        self.set_text_color(30, 30, 30)
        bullet_str = "- "
        self.cell(self.get_string_width(bullet_str) + 1, 4.2, bullet_str)
        if label:
            self.cell(self.get_string_width(label + " ") + 1, 4.2, label + " ")
            self.set_font("Helvetica", "", 8.2)
            self.set_text_color(60, 60, 60)
            self.multi_cell(0, 4.2, text)
        else:
            self.set_font("Helvetica", "", 8.2)
            self.set_text_color(60, 60, 60)
            self.multi_cell(0, 4.2, text)
        self.ln(1)

    def callout_box(self, title, lines):
        self.ln(2)
        self.set_fill_color(248, 246, 243)
        self.set_draw_color(210, 205, 198)
        self.set_line_width(0.3)
        
        h = 9 + (len(lines) * 4.2)
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y, 174, h, style="FD")
        
        self.set_xy(x + 4, y + 2.5)
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(20, 20, 20)
        self.cell(166, 4.2, title, new_x="LMARGIN", new_y="NEXT")
        
        self.set_font("Helvetica", "", 7.8)
        self.set_text_color(60, 60, 60)
        for line in lines:
            self.set_x(x + 4)
            self.cell(166, 3.8, line, new_x="LMARGIN", new_y="NEXT")
        
        self.set_y(y + h + 2.5)

    def draw_table(self, headers, rows, col_widths):
        self.ln(2)
        self.set_fill_color(240, 238, 234)
        self.set_draw_color(200, 195, 190)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(20, 20, 20)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 5.5, h, border=1, fill=True, align="L")
        self.ln()

        self.set_font("Helvetica", "", 7.8)
        self.set_text_color(50, 50, 50)
        for row in rows:
            for i, val in enumerate(row):
                self.cell(col_widths[i], 5.2, str(val), border=1, align="L")
            self.ln()
        self.ln(2)


def make_privacy_policy():
    pdf = PolicyPDF("Privacy Policy")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.chapter_title("Privacy Policy & Data Protection")
    pdf.subtitle("Governed under the Information Technology Act, 2000 | Last Updated: October 2026")

    pdf.section_heading("1. Introduction & Scope")
    pdf.paragraph(
        f"{COMPANY_NAME} ('EVM', 'We', 'Us', or 'Our') operates the official e-commerce store at {WEBSITE}. "
        "We are committed to maintaining the confidentiality, integrity, and security of personal information "
        "entrusted to us by our customers and website visitors ('You' or 'User')."
    )
    pdf.paragraph(
        "This Privacy Policy describes our practices regarding the collection, processing, storage, and sharing "
        "of information in connection with purchases of EVM consumer electronics products (power banks, audio, "
        "chargers, and cables), warranty services, and customer care."
    )

    pdf.section_heading("2. Personal Information Collected")
    pdf.bullet("Contact Data:", "Full name, mobile number, email address, billing address, and doorstep shipping address.")
    pdf.bullet("Order & Invoicing Data:", "Items ordered, transaction amounts, GST details for B2B input tax credit, and tax invoice references.")
    pdf.bullet("Payment Data (PCI-DSS & RBI Compliant):", "Payments are processed securely via RBI-licensed Payment Gateways (HDFC Bank Payment Gateway, Razorpay, and authorized card/UPI switches). Raw credit/debit card numbers and CVV codes are NEVER stored on our servers.")
    pdf.bullet("Technical Data:", "IP address, browser type, device information, and diagnostic cookies used to prevent fraudulent activity and optimize site responsiveness.")

    pdf.section_heading("3. Purpose of Processing")
    pdf.paragraph(
        "We process personal information strictly for legitimate commercial and fulfillment purposes:"
    )
    pdf.bullet("Order Fulfillment:", "Processing orders, generating GST Tax Invoices, and arranging doorstep delivery via BlueDart / eShipz.")
    pdf.bullet("Warranty & Service Claims:", "Administering serial number registrations and our Doorstep Pickup & Drop service across 625+ Indian cities.")
    pdf.bullet("Transactional Alerts:", "Delivering order confirmation, dispatch waybill tracking, and OTP verification via SMS (KapSystem) and email.")
    pdf.bullet("Statutory Compliance:", "Complying with applicable Indian commercial, tax (GST), and audit regulations.")

    pdf.section_heading("4. Information Sharing & Third Parties")
    pdf.paragraph(
        "We do not sell, rent, or trade your personal data. We disclose information strictly on a need-to-know basis with trusted partners:"
    )
    pdf.bullet("Payment Gateways:", "HDFC Bank Ltd and licensed payment aggregators to securely clear transactions.")
    pdf.bullet("Logistics Carriers:", "BlueDart Express, eShipz, and postal couriers to execute physical package delivery.")
    pdf.bullet("Legal & Regulatory Bodies:", "Law enforcement or tax authorities when mandated by statutory law.")

    pdf.section_heading("5. Data Security Standards")
    pdf.paragraph(
        "We employ 256-bit SSL/TLS 1.3 encryption for all data in transit, strict Content Security Policies, "
        "and certified enterprise cloud infrastructure complying with ISO 27001 standards."
    )

    pdf.callout_box("Statutory Grievance Redressal Officer (IT Act, 2000)", [
        f"Entity: {COMPANY_NAME}",
        "Designation: Nodal Grievance Redressal Officer",
        f"Address: {OFFICE_ADDR}",
        f"Email: {EMAIL} | Helpline: {PHONE}",
        "Working Hours: Monday to Saturday, 10:00 AM - 6:30 PM IST",
    ])

    out = os.path.join(OUTPUT_DIR, "EVM_Privacy_Policy.pdf")
    pdf.output(out)
    return out


def make_terms_and_conditions():
    pdf = PolicyPDF("Terms & Conditions")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.chapter_title("Terms & Conditions of Service")
    pdf.subtitle("Official Terms of Sale & Platform Agreement | Last Updated: October 2026")

    pdf.section_heading("1. Corporate Identity & Acceptance")
    pdf.paragraph(
        f"This platform is owned and operated by {COMPANY_NAME} (CIN: {CIN}, GSTIN: {GSTIN}), "
        f"having its registered corporate office at {OFFICE_ADDR}. "
        "By accessing our platform or placing an order, you agree to be bound by these Terms & Conditions."
    )

    pdf.section_heading("2. Eligibility")
    pdf.paragraph(
        "You must be at least 18 years of age and legally competent to enter into binding contracts "
        "under the Indian Contract Act, 1872 to make purchases on this website."
    )

    pdf.section_heading("3. Pricing, Products & GST Invoicing")
    pdf.bullet("Indian Currency:", "All prices are listed in Indian Rupees (INR / Rs.) and clearly indicate applicable Goods & Services Tax (GST).")
    pdf.bullet("Tax Invoices:", "Every order receives a compliant GST Tax Invoice specifying our GSTIN, HSN codes, and applicable CGST, SGST, or IGST.")
    pdf.bullet("Product Specifications:", "Specifications and battery capacities are stated accurately based on controlled standard tests. Minor performance differences may occur based on host device usage.")

    pdf.section_heading("4. Payments & Payment Gateway Terms")
    pdf.paragraph(
        "We support electronic payment methods via licensed gateways including HDFC Bank Payment Gateway, "
        "UPI, Net Banking, and major Debit/Credit cards. The customer warrants that they are the authorized holder "
        "of the payment instrument used. Orders suspected of unauthorized card usage or fraud will be cancelled."
    )

    pdf.section_heading("5. Warranty & Doorstep Service Care")
    pdf.paragraph(
        "EVM products come with manufacturer warranty against operational defects. Customers across 625+ Indian cities "
        "can access our Doorstep Pickup & Drop service by registering their GST invoice on our official portal (evmzone.com/evm-pickup-and-drop)."
    )

    pdf.section_heading("6. Intellectual Property")
    pdf.paragraph(
        f"All trademarks, logos, brand content, and digital assets on this site are the exclusive property of {COMPANY_NAME}. "
        "Unauthorized reproduction is strictly prohibited under Indian trademark and copyright statutes."
    )

    pdf.section_heading("7. Governing Law & Exclusive Jurisdiction")
    pdf.paragraph(
        "These Terms shall be governed and interpreted exclusively under the laws of India. "
        "Any disputes or legal actions arising out of transactions on this platform shall be subject to "
        "the exclusive jurisdiction of the competent Courts at Mumbai, Maharashtra, India."
    )

    pdf.callout_box("Corporate Desk & Inquiries", [
        f"Company: {COMPANY_NAME}",
        f"Corporate Office: {OFFICE_ADDR}",
        f"Support Email: {EMAIL} | Phone: {PHONE}",
    ])

    out = os.path.join(OUTPUT_DIR, "EVM_Terms_and_Conditions.pdf")
    pdf.output(out)
    return out


def make_refund_policy():
    pdf = PolicyPDF("Refund & Cancellation Policy")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.chapter_title("Refund & Cancellation Policy")
    pdf.subtitle("Clear Turnaround Standards & 7-Day Replacement Guarantee | Last Updated: October 2026")

    pdf.section_heading("1. Order Cancellation Policy")
    pdf.paragraph(
        "Customers may cancel an order free of charge at any time prior to shipment dispatch from our central fulfillment center. "
        "Once a consignment is handed over to BlueDart and an Air Waybill (AWB) is generated, transit cancellations cannot be accepted, "
        "and the parcel must follow the standard return inspection upon delivery."
    )
    pdf.paragraph(
        f"To cancel a pre-dispatch order, contact customer support at {EMAIL} or call {PHONE} with your Order Reference ID."
    )

    pdf.section_heading("2. 7-Day Replacement Guarantee")
    pdf.paragraph(
        "We provide a 7-Day Replacement Guarantee from the date of physical delivery under the following conditions:"
    )
    pdf.bullet("Damaged in Transit:", "Parcels delivered damaged or tampered must be notified within 48 hours of delivery with photo/video proof.")
    pdf.bullet("Dead on Arrival (DOA):", "Units failing to power on or charge out of the box will be replaced with a fresh unit immediately.")
    pdf.bullet("Wrong Product:", "If an incorrect model or color is received, EVM arranges a complimentary reverse pickup and correct delivery.")

    pdf.section_heading("3. Refund Turnaround & Payment Reversal Timelines")
    pdf.paragraph(
        "Approved refunds are credited directly back to the original payment source utilized during checkout, "
        "in strict adherence to Reserve Bank of India and Payment Gateway regulations:"
    )

    headers = ["Payment Method", "Refund Source", "Turnaround Timeline"]
    rows = [
        ["Credit / Debit Cards", "Issuing Bank Card Account", "5 to 7 Business Days"],
        ["UPI (GPay, PhonePe, Paytm)", "Originating VPA / Bank", "2 to 4 Business Days"],
        ["Net Banking", "Linked Bank Account", "5 to 7 Business Days"],
    ]
    pdf.draw_table(headers, rows, [55, 65, 54])

    pdf.section_heading("4. Non-Refundable Situations")
    pdf.bullet("Physical Abuse:", "Damage from drops, liquid ingress beyond rating, or tampering.")
    pdf.bullet("Missing Assets:", "Missing retail packaging, serial numbers, cables, or tax invoice.")
    pdf.bullet("Cosmetic Dislike:", "Subjective preference changes for a defect-free unit operating within technical specs.")

    pdf.callout_box("Refund & Return Assistance", [
        f"Support Desk: {EMAIL}",
        f"Helpline: {PHONE} (Mon-Sat, 10 AM to 6:30 PM IST)",
        f"Central Inspection Hub: Paramount LOGITRADE, Bhiwandi / Mumbai, MH",
    ])

    out = os.path.join(OUTPUT_DIR, "EVM_Refund_and_Cancellation_Policy.pdf")
    pdf.output(out)
    return out


def make_shipping_policy():
    pdf = PolicyPDF("Shipping & Delivery Policy")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.chapter_title("Shipping & Delivery Policy")
    pdf.subtitle("Express Pan-India Logistics Powered by BlueDart | Last Updated: October 2026")

    pdf.section_heading("1. Pan-India Delivery Coverage")
    pdf.paragraph(
        "EVM delivers to 19,000+ PIN codes across 625+ cities covering all 28 Indian States and 8 Union Territories. "
        "Shipments originate from our central warehouse facility at Paramount LOGITRADE, Bhiwandi / Mumbai, Maharashtra."
    )

    pdf.section_heading("2. Dispatch & Delivery Estimates")
    pdf.paragraph(
        "Orders confirmed before 2:00 PM IST on business days are dispatched within 24 to 48 business hours. "
        "Transit timelines are outlined below:"
    )

    headers = ["Destination Region", "Logistics Mode", "Transit Window"]
    rows = [
        ["Mumbai / Thane / Navi Mumbai", "BlueDart Express Surface/Air", "1 to 2 Business Days"],
        ["Metro Cities (Delhi, BLR, HYD, MAA, CCU, PNQ)", "BlueDart Air Express", "2 to 4 Business Days"],
        ["Rest of India (Tier 2 & 3 Cities)", "BlueDart Ground Express", "4 to 6 Business Days"],
        ["Remote & Special Regions (J&K, North-East)", "Insured Express Speed Post / BlueDart", "5 to 8 Business Days"],
    ]
    pdf.draw_table(headers, rows, [65, 60, 49])

    pdf.section_heading("3. Shipping Charges & Zero Hidden Costs")
    pdf.bullet("Prepaid Orders:", "Free Express Shipping on all prepaid orders across India.")
    pdf.bullet("GST Transparent:", "Any applicable shipping fee is clearly shown before checkout and itemized on the GST Tax Invoice.")
    pdf.bullet("Zero Surcharges:", "No additional octroi or delivery entry tax is collected from the customer upon delivery.")

    pdf.section_heading("4. Tracking & Tamper Inspection")
    pdf.paragraph(
        "Customers receive an automated SMS and email containing the BlueDart AWB tracking number upon dispatch. "
        "Customers must inspect the outer tamper-evident security tape prior to accepting delivery. "
        "Do not accept parcels that have been opened or retaped."
    )

    pdf.callout_box("Dispatch Inquiries", [
        f"Logistics Desk: {EMAIL}",
        f"Phone: {PHONE} (Monday - Saturday, 10:00 AM - 6:30 PM)",
    ])

    out = os.path.join(OUTPUT_DIR, "EVM_Shipping_and_Delivery_Policy.pdf")
    pdf.output(out)
    return out


def make_contact_document():
    pdf = PolicyPDF("Contact & Corporate Details")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.chapter_title("Contact Details & Corporate Identity")
    pdf.subtitle("Official Statutory Contact Reference for Merchant Underwriting | Last Updated: October 2026")

    pdf.section_heading("1. Legal Corporate Entity")
    pdf.bullet("Legal Name:", COMPANY_NAME)
    pdf.bullet("Commercial Brand:", BRAND_NAME)
    pdf.bullet("Corporate Identity No. (CIN):", CIN)
    pdf.bullet("GST Identification No. (GSTIN):", GSTIN)
    pdf.bullet("Registered Office:", OFFICE_ADDR)
    pdf.bullet("Central Fulfillment Hub:", "Paramount LOGITRADE, Bhiwandi / Mumbai, Maharashtra")

    pdf.section_heading("2. Customer Support & Grievance Channels")
    pdf.bullet("Support Email:", EMAIL)
    pdf.bullet("Customer Helpline:", PHONE)
    pdf.bullet("Direct Office Line:", "+91 86554 57098 / +91 73044 97802")
    pdf.bullet("Operating Hours:", "Monday to Saturday, 10:00 AM to 6:30 PM IST (Closed Sundays & Public Holidays)")
    pdf.bullet("Storefront URL:", WEBSITE)
    pdf.bullet("Doorstep Warranty Portal:", "https://evmzone.com/evm-pickup-and-drop")

    pdf.callout_box("Official Banking & Merchant Verification Reference", [
        f"Account Holder: {COMPANY_NAME}",
        "Bank Name: INDUSIND BANK",
        "Branch & IFSC: OPERA HOUSE & INDB0000001",
        "Account Number: 650014044123",
    ])

    out = os.path.join(OUTPUT_DIR, "EVM_Contact_and_Company_Details.pdf")
    pdf.output(out)
    return out


def make_disclaimer():
    pdf = PolicyPDF("Website & Product Disclaimer")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.chapter_title("Website & Product Disclaimer")
    pdf.subtitle("Technical Benchmarks & External Integration Disclaimers | Last Updated: October 2026")

    pdf.section_heading("1. Technical Performance Claims")
    pdf.paragraph(
        "All technical specifications, fast charging ratings (e.g. 20W MagSafe, 65W GaN), battery capacities (mAh), "
        "and audio playback hours advertised on EVM products are measured under standard laboratory test conditions. "
        "Actual user performance may vary based on connected device models, battery health, and operating temperatures."
    )

    pdf.section_heading("2. Payment Gateway Independence")
    pdf.paragraph(
        f"Electronic payment processing is facilitated through third-party banking switches (HDFC Bank Ltd, partner gateways). "
        f"{COMPANY_NAME} does not bear responsibility for technical network downtime at the customer's card-issuing bank "
        "or mobile operator network delays during OTP delivery."
    )

    pdf.section_heading("3. Third-Party Trademarks")
    pdf.paragraph(
        "References to third-party brand names or trademarks (including Apple, iPhone, MagSafe, Android, Type-C) "
        "are used strictly for descriptive compatibility purposes. EVM is an independent brand of consumer electronics."
    )

    out = os.path.join(OUTPUT_DIR, "EVM_Website_and_Product_Disclaimer.pdf")
    pdf.output(out)
    return out


def make_consolidated_policies():
    pdf = PolicyPDF("Comprehensive Store Policies")
    pdf.alias_nb_pages()
    
    # Page 1: Privacy Policy
    pdf.add_page()
    pdf.chapter_title("1. Privacy Policy")
    pdf.subtitle("Governed under Information Technology Act, 2000 & IT Rules 2021")
    pdf.paragraph(
        f"{COMPANY_NAME} ('EVM') is committed to protecting customer data. We collect contact, address, and transaction data strictly for order fulfillment, BlueDart shipping, and warranty verification. Card transactions are processed securely via RBI-authorized Payment Gateways (HDFC Bank / Razorpay); no raw card numbers are stored. Data is protected with 256-bit SSL/TLS 1.3 encryption."
    )
    pdf.callout_box("Grievance Redressal Officer (IT Act, 2000)", [
        f"Entity: {COMPANY_NAME}",
        f"Address: {OFFICE_ADDR}",
        f"Email: {EMAIL} | Phone: {PHONE}",
    ])

    # Page 2: Terms & Conditions
    pdf.add_page()
    pdf.chapter_title("2. Terms & Conditions")
    pdf.subtitle(f"CIN: {CIN} | GSTIN: {GSTIN}")
    pdf.paragraph(
        f"All products sold on {WEBSITE} are priced in Indian Rupees (INR) and include GST Tax Invoices. Payment is accepted via HDFC Bank Payment Gateway, UPI, Cards, and Net Banking. All products carry manufacturer warranty with Doorstep Pickup & Drop coverage across 625+ cities. Governing law is exclusively Indian law with Courts at Mumbai, Maharashtra having sole jurisdiction."
    )

    # Page 3: Refund & Cancellation Policy
    pdf.add_page()
    pdf.chapter_title("3. Refund & Cancellation Policy")
    pdf.subtitle("7-Day Replacement Guarantee & 5-7 Days Bank Refund Turnaround")
    pdf.paragraph(
        "Orders may be cancelled before warehouse dispatch. We offer a 7-day replacement guarantee for damaged in-transit or dead-on-arrival products. Approved refunds are credited directly to the original payment source within the following turnaround times:"
    )
    headers = ["Payment Mode", "Destination", "Timeline"]
    rows = [
        ["Credit / Debit Cards", "Issuing Bank Card", "5 to 7 Business Days"],
        ["UPI (GPay, PhonePe, Paytm)", "Linked Bank / VPA", "2 to 4 Business Days"],
        ["Net Banking", "Originating Bank", "5 to 7 Business Days"],
    ]
    pdf.draw_table(headers, rows, [60, 60, 54])

    # Page 4: Shipping Policy & Contact Details
    pdf.add_page()
    pdf.chapter_title("4. Shipping Policy & Corporate Details")
    pdf.subtitle("Express Pan-India Logistics Powered by BlueDart")
    pdf.paragraph(
        "We deliver to 19,000+ PIN codes across India. Dispatch occurs in 24-48 business hours from Paramount LOGITRADE, Bhiwandi. Transit: Metro cities 2-4 business days, Rest of India 4-6 business days. Free shipping on all prepaid orders with live SMS tracking."
    )
    pdf.callout_box("Official Corporate Contact Information", [
        f"Legal Entity: {COMPANY_NAME}",
        f"Corporate Office: {OFFICE_ADDR}",
        f"Email: {EMAIL} | Customer Helpline: {PHONE}",
        f"Website: {WEBSITE}",
    ])

    out = os.path.join(OUTPUT_DIR, "EVM_All_Store_Policies_Consolidated.pdf")
    pdf.output(out)
    return out


if __name__ == "__main__":
    p1 = make_privacy_policy()
    p2 = make_terms_and_conditions()
    p3 = make_refund_policy()
    p4 = make_shipping_policy()
    p5 = make_contact_document()
    p6 = make_disclaimer()
    p_all = make_consolidated_policies()
    print("Successfully generated all PDF policies:")
    print(" -", p1)
    print(" -", p2)
    print(" -", p3)
    print(" -", p4)
    print(" -", p5)
    print(" -", p6)
    print(" -", p_all)
