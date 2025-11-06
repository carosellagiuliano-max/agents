# Privacy and Compliance

**Schnittwerk Web Application - Privacy Documentation**

Version: 0.1.0  
Last Updated: 2024-11-06  
Owner: Security and Privacy

---

## Table of Contents

1. [Privacy Principles](#privacy-principles)
2. [Legal Framework](#legal-framework)
3. [Data Processing](#data-processing)
4. [User Rights](#user-rights)
5. [Consent Management](#consent-management)
6. [Data Protection Impact](#data-protection-impact)
7. [Compliance Checklist](#compliance-checklist)

---

## Privacy Principles

### Privacy by Design

- Minimize data collection
- Purpose limitation
- Data minimization
- Storage limitation
- Integrity and confidentiality

### Privacy by Default

- Strongest privacy settings as default
- No unnecessary data collection
- Opt-in for optional features
- Clear, understandable notices

### Transparency

- Clear privacy policy
- Data usage explained
- Processing purposes stated
- Third-party services disclosed

---

## Legal Framework

### Applicable Laws

**Swiss Data Protection Act (DSG)**

- Applies to all processing in Switzerland
- Effective: September 1, 2023
- Requirements similar to GDPR
- Penalties: Up to CHF 250,000

**GDPR (if applicable)**

- Applies if processing EU residents' data
- Extraterritorial effect
- Requires data protection officer (>250 employees)
- Penalties: Up to €20M or 4% global revenue

**Swiss Price Indication Regulation (PBV)**

- Clear price display required
- All-inclusive pricing
- VAT must be shown
- No hidden fees

### Data Controller

**Controller**: Schnittwerk by Vanessa Carosella  
**Address**: Rorschacher Str. 152, 9000 St. Gallen, Switzerland  
**Contact**: [To be added]  
**DPO**: [Not required for small business, but contact designated]

---

## Data Processing

### Personal Data Categories

**Identity Data**

- First name, last name
- Date of birth (optional, for age-restricted services)
- Gender (optional, for service personalization)

**Contact Data**

- Email address
- Phone number
- Address (for delivery only)

**Financial Data**

- Payment information (processed by payment provider)
- Transaction history
- Invoices

**Technical Data**

- IP address (anonymized after 7 days)
- Browser and device info
- Session data
- Error logs (no PII)

**Usage Data**

- Booking history
- Service preferences
- Product purchases
- Marketing preferences

**Special Categories** (requires explicit consent)

- Health data: Allergies, skin conditions (optional, for service safety)

### Processing Purposes

| Purpose              | Legal Basis         | Data                      |
| -------------------- | ------------------- | ------------------------- |
| Account creation     | Contract            | Identity, Contact         |
| Booking appointments | Contract            | Identity, Contact, Usage  |
| Payment processing   | Contract            | Financial, Identity       |
| Order fulfillment    | Contract            | Contact, Financial, Usage |
| Customer support     | Legitimate interest | Identity, Contact, Usage  |
| Marketing (opt-in)   | Consent             | Contact, Usage            |
| Analytics            | Legitimate interest | Technical (anonymized)    |
| Legal obligations    | Legal requirement   | Financial, Identity       |

### Data Minimization

**Collected**

- Only essential for service delivery
- Optional fields clearly marked
- No collection without purpose
- Regular review of necessity

**Not Collected**

- Social security numbers
- Racial/ethnic data
- Political opinions
- Religious beliefs
- Trade union membership
- Genetic data (unless medical necessity)

---

## User Rights

### Right to Access (Art. 25 DSG, Art. 15 GDPR)

**How to Exercise**

- Login to account portal
- Request via email: privacy@schnittwerk-vanessa.ch
- Response within 30 days (DSG), 1 month (GDPR)

**Information Provided**

- Personal data we hold
- Processing purposes
- Data recipients
- Storage duration
- Right to lodge complaint

**Format**

- Structured, commonly used format
- Machine-readable (JSON)
- Free of charge (first request)

### Right to Rectification (Art. 32 DSG, Art. 16 GDPR)

**Implementation**

- Self-service in account settings
- Request via email for restricted fields
- Verification may be required
- Update within 30 days

### Right to Erasure (Art. 32 DSG, Art. 17 GDPR)

**Process**

1. User requests deletion
2. Verification of identity
3. 30-day grace period (can cancel)
4. Anonymize/delete data
5. Notify third parties (if applicable)
6. Confirmation sent

**Exceptions**

- Legal retention requirements (e.g., invoices: 10 years)
- Ongoing legal proceedings
- Defense of legal claims
- Public health interests

**Implementation**

- Soft delete with 30-day recovery
- Hard delete after grace period
- Anonymize instead of delete where possible
- Audit log of deletions

### Right to Data Portability (Art. 28 DSG, Art. 20 GDPR)

**Format**

- JSON export
- Includes: profile, bookings, orders, preferences
- Excludes: derived/inferred data

**How to Exercise**

- Download from account portal
- Request via email
- Delivered within 30 days

### Right to Object (Art. 30 DSG, Art. 21 GDPR)

**Processing Based on Legitimate Interest**

- Marketing communications: Unsubscribe link
- Profiling: Opt-out in settings
- Direct marketing: Immediate cessation

### Right to Restrict Processing (Art. 32 DSG, Art. 18 GDPR)

**Scenarios**

- Data accuracy disputed
- Processing unlawful
- Data no longer needed but user needs for legal claim
- Objection pending

### Right to Lodge Complaint

**Swiss Authority**

- Federal Data Protection and Information Commissioner (FDPIC)
- Feldeggweg 1, 3003 Bern
- https://www.edoeb.admin.ch

**EU Authority** (if applicable)

- Relevant supervisory authority in EU member state
- List: https://edpb.europa.eu/about-edpb/board/members_en

---

## Consent Management

### Consent Requirements

**Valid Consent**

- Freely given
- Specific
- Informed
- Unambiguous indication
- Easy to withdraw

**Implementation**

- Clear checkboxes (no pre-checked)
- Separate consent for different purposes
- Withdrawal as easy as giving
- Consent log maintained

### Consent Log

**Stored Information**

- User ID
- Consent type (marketing, analytics, etc.)
- Timestamp
- Version of privacy policy
- Method of consent (UI, email, etc.)
- IP address (for verification)
- Withdrawal timestamp (if applicable)

### Double Opt-In (Email Marketing)

**Process**

1. User signs up
2. Confirmation email sent
3. User clicks confirmation link
4. Subscription activated
5. Log consent with timestamp

**Benefits**

- Verifies email address
- Proves consent
- Reduces spam complaints
- GDPR compliant

---

## Data Protection Impact

### Data Retention

| Data Type         | Retention Period           | Reason                |
| ----------------- | -------------------------- | --------------------- |
| Account data      | Until deletion request     | Service provision     |
| Booking history   | 2 years after last booking | Legal, analytics      |
| Financial records | 10 years                   | Swiss tax law         |
| Marketing consent | Until withdrawal           | Consent basis         |
| Technical logs    | 90 days                    | Troubleshooting       |
| Analytics data    | 2 years (anonymized)       | Business intelligence |
| Support tickets   | 3 years                    | Quality assurance     |

### Automated Cleanup

**Scheduled Jobs**

- Daily: Technical logs older than 90 days
- Monthly: Inactive accounts (2 years no login) → notify
- Quarterly: Completed deletion requests → execute
- Annually: Old anonymized data → aggregate

### Third-Party Data Processors

**Current Processors** (DPA required)

| Service   | Purpose             | Data Shared            | Location | DPA Status                      |
| --------- | ------------------- | ---------------------- | -------- | ------------------------------- |
| Supabase  | Database            | All data               | EU/US    | ✅ Standard Contractual Clauses |
| Vercel    | Hosting             | Technical data         | Global   | ✅ DPA available                |
| Resend    | Email               | Email, name            | EU/US    | ✅ DPA available                |
| SumUp     | Payments            | Payment data           | EU       | ✅ DPA available                |
| Stripe    | Payments (fallback) | Payment data           | EU/US    | ✅ DPA available                |
| Sentry    | Error tracking      | Technical, minimal PII | EU/US    | ✅ DPA available                |
| Plausible | Analytics           | Anonymized             | EU       | ✅ DPA available                |

**DPA Requirements**

- Data processing agreement in place
- Adequate safeguards documented
- Regular compliance reviews
- Incident notification procedures
- Audit rights defined

### International Transfers

**Outside Switzerland/EU**

- Standard Contractual Clauses (SCC)
- Adequacy decisions (e.g., UK post-Brexit)
- Privacy Shield (invalidated, not used)
- Explicit consent for transfers

**Data Localization**

- Database: EU region (Supabase)
- Backups: EU region
- Processing: Edge (global) with EU origin preference

---

## Compliance Checklist

### Privacy Policy

- [ ] Published and easily accessible
- [ ] Written in clear, plain language
- [ ] Available in German (de-CH)
- [ ] Covers all processing activities
- [ ] Lists all third-party processors
- [ ] Explains user rights
- [ ] Includes contact information
- [ ] Version dated and archived
- [ ] Updated when processing changes

### Consent Management

- [ ] Consent obtained before processing
- [ ] Separate consents for different purposes
- [ ] Consent log implemented
- [ ] Withdrawal mechanism available
- [ ] Double opt-in for marketing
- [ ] No pre-checked boxes
- [ ] Age verification for minors (if applicable)

### Data Security

- [ ] Encryption in transit (HTTPS)
- [ ] Encryption at rest (database)
- [ ] Access controls (RLS, RBAC)
- [ ] Audit logging for sensitive data
- [ ] Regular security reviews
- [ ] Incident response plan
- [ ] Staff training on data protection

### User Rights

- [ ] Access request process defined
- [ ] Rectification mechanism available
- [ ] Erasure process implemented
- [ ] Data portability feature available
- [ ] Objection mechanism in place
- [ ] Restriction process defined
- [ ] Response within legal timeframes

### Third Parties

- [ ] DPAs signed with all processors
- [ ] Processor list maintained
- [ ] Transfer mechanisms documented
- [ ] Regular compliance checks
- [ ] Incident notification procedures
- [ ] Audit rights exercised annually

### Documentation

- [ ] Processing activities record (ROPA)
- [ ] Privacy policy
- [ ] Cookie policy (if applicable)
- [ ] DPAs with processors
- [ ] Consent logs
- [ ] Data retention policy
- [ ] Incident response plan
- [ ] Staff training records

---

## Privacy by Design Examples

### Feature: User Registration

**Data Minimization**

- Only email and password required
- Phone optional (for SMS notifications)
- No unnecessary personal info

**Purpose Limitation**

- Email: Authentication and service communications only
- Phone: Appointment reminders only (if provided)

**Security**

- Password hashed (bcrypt, Supabase default)
- Email verified before activation
- No password storage in plain text

### Feature: Booking System

**Data Minimization**

- Customer ID linked to booking (not full profile)
- Service and time stored
- Notes optional and clearly marked

**Purpose Limitation**

- Booking data used only for appointment management
- Not shared with third parties
- Staff sees only necessary info

**Security**

- RLS policies: Users see only own bookings
- Staff see only bookings assigned to them
- Admin sees all with audit log

### Feature: Analytics

**Privacy-Focused**

- Plausible: No cookies, no personal data
- Aggregated metrics only
- IP addresses anonymized
- No cross-site tracking

**Transparency**

- Analytics explained in privacy policy
- Opt-out available (browser Do Not Track)
- No user profiling

---

## Training Requirements

### All Staff

- Privacy principles (annually)
- Data protection laws (DSG, GDPR basics)
- User rights and how to respond
- Incident reporting procedures

### Developers

- Privacy by design principles
- Secure coding for data protection
- RLS and access controls
- Data minimization techniques

### Customer-Facing Staff

- How to handle data requests
- Consent collection procedures
- Privacy policy key points
- Escalation procedures

---

## Review Schedule

- **Monthly**: Consent logs review
- **Quarterly**: Third-party compliance check
- **Biannually**: Privacy policy review
- **Annually**: Full compliance audit
- **Ad-hoc**: After significant changes

---

## Contact

**Privacy Questions**: privacy@schnittwerk-vanessa.ch  
**Data Requests**: datarequest@schnittwerk-vanessa.ch  
**Complaints**: Federal Data Protection Commissioner (FDPIC)

---

**Note**: This document is subject to change. Always refer to the latest version. Last reviewed: 2024-11-06
