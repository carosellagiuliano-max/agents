# Architecture Documentation

**Schnittwerk by Vanessa Carosella - Web Application**

Version: 0.1.0  
Last Updated: 2024-11-06  
Owner: Lead Architect

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Architecture Diagrams](#architecture-diagrams)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## System Overview

Schnittwerk is a production-ready web application for a hair salon business in St. Gallen, Switzerland. The system provides:

- **Public Website**: Marketing pages with SEO optimization
- **Online Booking**: Real-time appointment scheduling with staff availability
- **E-Commerce Shop**: Product sales with payment processing
- **Admin Portal**: Business management, analytics, and configuration
- **Customer Portal**: Booking history, profile management

### Core Principles

1. **Privacy by Default**: DSGVO/DSG compliant, minimal data collection
2. **Security First**: RLS on all tables, audit logging, secure by design
3. **Accessibility**: WCAG 2.2 AA compliant
4. **Performance**: Core Web Vitals optimized, edge caching
5. **Observability**: Structured logging, health checks, error tracking

---

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Server Components + URL state

### Backend

- **Runtime**: Node.js 20+
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL 15+)
- **ORM**: Drizzle ORM
- **Cache**: Upstash Redis
- **Queue**: Upstash Queue (for async jobs)

### Infrastructure

- **Hosting**: Vercel
- **Database**: Supabase (managed PostgreSQL)
- **Email**: Resend
- **Payments**: SumUp (primary), Stripe (fallback)
- **Monitoring**: Sentry
- **Analytics**: Plausible or Matomo (privacy-focused)

### Development

- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces
- **CI/CD**: GitHub Actions
- **Testing**: Vitest (unit), Playwright (e2e)
- **Linting**: ESLint, Prettier
- **Type Safety**: TypeScript strict mode

---

## Repository Structure

```
.
├── apps/
│   └── web/                    # Next.js application
│       ├── app/               # App Router pages and layouts
│       │   ├── (marketing)/   # Public marketing pages
│       │   ├── (booking)/     # Booking flow
│       │   ├── (shop)/        # E-commerce
│       │   ├── admin/         # Admin portal
│       │   └── api/           # API routes
│       └── lib/               # App-specific utilities
│
├── packages/
│   ├── db/                    # Database schema and migrations
│   │   ├── src/
│   │   │   ├── schema/        # Drizzle schemas
│   │   │   ├── migrations/    # SQL migrations
│   │   │   └── seed/          # Seed data
│   │   └── tests/             # RLS policy tests
│   │
│   ├── ui/                    # Shared UI components
│   │   └── src/
│   │       ├── components/    # React components
│   │       └── hooks/         # Custom hooks
│   │
│   ├── lib/                   # Shared utilities
│   │   └── src/
│   │       ├── validation/    # Zod schemas
│   │       ├── utils/         # Helper functions
│   │       └── constants/     # Constants
│   │
│   └── payments/              # Payment adapters
│       └── src/
│           ├── sumup/         # SumUp integration
│           ├── stripe/        # Stripe integration
│           └── reconciliation/ # Payment reconciliation
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # This file
│   ├── DECISIONS.md           # Architectural decisions
│   ├── SECURITY.md            # Security guidelines
│   ├── PRIVACY.md             # Privacy and compliance
│   └── RUNBOOK.md             # Operations guide
│
└── .github/
    └── workflows/             # CI/CD pipelines
        └── ci.yml             # Main CI pipeline
```

---

## Architecture Diagrams

### Context Diagram

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- External Actors -->
  <rect x="50" y="50" width="120" height="80" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>
  <text x="110" y="95" text-anchor="middle" font-size="14" font-weight="bold">Customer</text>

  <rect x="50" y="200" width="120" height="80" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>
  <text x="110" y="245" text-anchor="middle" font-size="14" font-weight="bold">Staff/Admin</text>

  <!-- System -->
  <rect x="300" y="150" width="200" height="300" fill="#fff3e0" stroke="#e65100" stroke-width="3"/>
  <text x="400" y="180" text-anchor="middle" font-size="16" font-weight="bold">Schnittwerk</text>
  <text x="400" y="200" text-anchor="middle" font-size="16" font-weight="bold">Web App</text>

  <rect x="320" y="220" width="160" height="40" fill="#ffffff" stroke="#666" stroke-width="1"/>
  <text x="400" y="245" text-anchor="middle" font-size="12">Booking System</text>

  <rect x="320" y="270" width="160" height="40" fill="#ffffff" stroke="#666" stroke-width="1"/>
  <text x="400" y="295" text-anchor="middle" font-size="12">Shop & Payments</text>

  <rect x="320" y="320" width="160" height="40" fill="#ffffff" stroke="#666" stroke-width="1"/>
  <text x="400" y="345" text-anchor="middle" font-size="12">Admin Portal</text>

  <rect x="320" y="370" width="160" height="40" fill="#ffffff" stroke="#666" stroke-width="1"/>
  <text x="400" y="395" text-anchor="middle" font-size="12">Customer Data</text>

  <!-- External Systems -->
  <rect x="630" y="50" width="120" height="80" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
  <text x="690" y="80" text-anchor="middle" font-size="12" font-weight="bold">Email Service</text>
  <text x="690" y="100" text-anchor="middle" font-size="10">(Resend)</text>

  <rect x="630" y="150" width="120" height="80" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
  <text x="690" y="180" text-anchor="middle" font-size="12" font-weight="bold">Payment</text>
  <text x="690" y="200" text-anchor="middle" font-size="10">(SumUp/Stripe)</text>

  <rect x="630" y="250" width="120" height="80" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
  <text x="690" y="280" text-anchor="middle" font-size="12" font-weight="bold">Database</text>
  <text x="690" y="300" text-anchor="middle" font-size="10">(Supabase)</text>

  <rect x="630" y="350" width="120" height="80" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
  <text x="690" y="380" text-anchor="middle" font-size="12" font-weight="bold">Monitoring</text>
  <text x="690" y="400" text-anchor="middle" font-size="10">(Sentry)</text>

  <!-- Arrows -->
  <line x1="170" y1="90" x2="300" y2="200" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="170" y1="240" x2="300" y2="300" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="500" y1="90" x2="630" y2="90" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="500" y1="190" x2="630" y2="190" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="500" y1="290" x2="630" y2="290" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="500" y1="390" x2="630" y2="390" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>

  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#666" />
    </marker>
  </defs>
</svg>
```

### Booking Flow Sequence Diagram

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700">
  <!-- Actors -->
  <text x="50" y="30" font-size="14" font-weight="bold">Customer</text>
  <line x1="100" y1="40" x2="100" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="220" y="30" font-size="14" font-weight="bold">Web App</text>
  <line x1="270" y1="40" x2="270" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="400" y="30" font-size="14" font-weight="bold">API</text>
  <line x1="430" y1="40" x2="430" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="550" y="30" font-size="14" font-weight="bold">Database</text>
  <line x1="600" y1="40" x2="600" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="720" y="30" font-size="14" font-weight="bold">Email</text>
  <line x1="760" y1="40" x2="760" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <!-- Interactions -->
  <!-- Step 1 -->
  <line x1="100" y1="80" x2="270" y2="80" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="120" y="75" font-size="11">1. Select service & staff</text>

  <!-- Step 2 -->
  <line x1="270" y1="120" x2="430" y2="120" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="290" y="115" font-size="11">2. GET /api/booking/availability</text>

  <!-- Step 3 -->
  <line x1="430" y1="160" x2="600" y2="160" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="450" y="155" font-size="11">3. Query slots</text>

  <!-- Step 4 -->
  <line x1="600" y1="200" x2="430" y2="200" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="450" y="195" font-size="11">4. Available slots</text>

  <!-- Step 5 -->
  <line x1="430" y1="240" x2="270" y2="240" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="290" y="235" font-size="11">5. Return slots</text>

  <!-- Step 6 -->
  <line x1="100" y1="280" x2="270" y2="280" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="120" y="275" font-size="11">6. Choose slot & submit</text>

  <!-- Step 7 -->
  <line x1="270" y1="320" x2="430" y2="320" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="290" y="315" font-size="11">7. POST /api/booking/create</text>

  <!-- Step 8 -->
  <rect x="430" y="340" width="30" height="120" fill="#e3f2fd"/>
  <text x="480" y="365" font-size="10">Validate input</text>
  <text x="480" y="385" font-size="10">Check availability</text>
  <text x="480" y="405" font-size="10">Lock slot</text>
  <text x="480" y="425" font-size="10">Create appointment</text>
  <text x="480" y="445" font-size="10">(transaction)</text>

  <!-- Step 9 -->
  <line x1="430" y1="480" x2="600" y2="480" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="450" y="475" font-size="11">9. INSERT appointment</text>

  <!-- Step 10 -->
  <line x1="600" y1="520" x2="430" y2="520" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="450" y="515" font-size="11">10. Success</text>

  <!-- Step 11 -->
  <line x1="430" y1="560" x2="760" y2="560" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="500" y="555" font-size="11">11. Send confirmation</text>

  <!-- Step 12 -->
  <line x1="430" y1="600" x2="270" y2="600" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="290" y="595" font-size="11">12. Return booking ID</text>

  <!-- Step 13 -->
  <line x1="270" y1="640" x2="100" y2="640" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="120" y="635" font-size="11">13. Show confirmation</text>

  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#1976d2" />
    </marker>
  </defs>
</svg>
```

### Payment Flow Sequence Diagram

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 650">
  <!-- Actors -->
  <text x="50" y="30" font-size="14" font-weight="bold">Customer</text>
  <line x1="100" y1="40" x2="100" y2="630" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="220" y="30" font-size="14" font-weight="bold">Shop</text>
  <line x1="260" y1="40" x2="260" y2="630" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="380" y="30" font-size="14" font-weight="bold">API</text>
  <line x1="420" y1="40" x2="420" y2="630" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="530" y="30" font-size="14" font-weight="bold">Payment Provider</text>
  <line x1="600" y1="40" x2="600" y2="630" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="730" y="30" font-size="14" font-weight="bold">Database</text>
  <line x1="780" y1="40" x2="780" y2="630" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <!-- Interactions -->
  <line x1="100" y1="80" x2="260" y2="80" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="120" y="75" font-size="11">1. Add to cart</text>

  <line x1="100" y1="120" x2="260" y2="120" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="120" y="115" font-size="11">2. Checkout</text>

  <line x1="260" y1="160" x2="420" y2="160" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="280" y="155" font-size="11">3. POST /api/checkout</text>

  <line x1="420" y1="200" x2="780" y2="200" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="500" y="195" font-size="11">4. Create order (pending)</text>

  <line x1="780" y1="240" x2="420" y2="240" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="500" y="235" font-size="11">5. Order ID</text>

  <line x1="420" y1="280" x2="600" y2="280" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="440" y="275" font-size="11">6. Create payment session</text>

  <line x1="600" y1="320" x2="420" y2="320" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="440" y="315" font-size="11">7. Payment URL</text>

  <line x1="420" y1="360" x2="260" y2="360" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="280" y="355" font-size="11">8. Redirect URL</text>

  <line x1="260" y1="400" x2="100" y2="400" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="120" y="395" font-size="11">9. Redirect to payment</text>

  <line x1="100" y1="440" x2="600" y2="440" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="250" y="435" font-size="11">10. Complete payment</text>

  <line x1="600" y1="480" x2="420" y2="480" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="440" y="475" font-size="11">11. Webhook: payment success</text>

  <line x1="420" y1="520" x2="780" y2="520" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="500" y="515" font-size="11">12. Update order (paid)</text>

  <line x1="600" y1="560" x2="100" y2="560" stroke="#2e7d32" stroke-width="2" marker-end="url(#greenarrow)"/>
  <text x="250" y="555" font-size="11">13. Redirect to success page</text>

  <defs>
    <marker id="greenarrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#2e7d32" />
    </marker>
  </defs>
</svg>
```

### Cancellation Flow Sequence Diagram

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 550">
  <!-- Actors -->
  <text x="50" y="30" font-size="14" font-weight="bold">Customer</text>
  <line x1="100" y1="40" x2="100" y2="530" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="220" y="30" font-size="14" font-weight="bold">Web App</text>
  <line x1="270" y1="40" x2="270" y2="530" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="400" y="30" font-size="14" font-weight="bold">API</text>
  <line x1="430" y1="40" x2="430" y2="530" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="550" y="30" font-size="14" font-weight="bold">Database</text>
  <line x1="600" y1="40" x2="600" y2="530" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="720" y="30" font-size="14" font-weight="bold">Email</text>
  <line x1="760" y1="40" x2="760" y2="530" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <!-- Interactions -->
  <line x1="100" y1="80" x2="270" y2="80" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="120" y="75" font-size="11">1. Request cancellation</text>

  <line x1="270" y1="120" x2="430" y2="120" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="290" y="115" font-size="11">2. POST /api/booking/cancel</text>

  <line x1="430" y1="160" x2="600" y2="160" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="450" y="155" font-size="11">3. Load appointment</text>

  <line x1="600" y1="200" x2="430" y2="200" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="450" y="195" font-size="11">4. Appointment data</text>

  <rect x="430" y="220" width="30" height="80" fill="#ffebee"/>
  <text x="480" y="245" font-size="10">Check time</text>
  <text x="480" y="265" font-size="10">(&gt;24h before?)</text>
  <text x="480" y="285" font-size="10">Update status</text>

  <line x1="430" y1="320" x2="600" y2="320" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="450" y="315" font-size="11">5. UPDATE status=cancelled</text>

  <line x1="430" y1="360" x2="760" y2="360" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="500" y="355" font-size="11">6. Send cancellation email</text>

  <line x1="430" y1="400" x2="270" y2="400" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="290" y="395" font-size="11">7. Success response</text>

  <line x1="270" y1="440" x2="100" y2="440" stroke="#d32f2f" stroke-width="2" marker-end="url(#redarrow)"/>
  <text x="120" y="435" font-size="11">8. Show confirmation</text>

  <text x="100" y="490" font-size="11" fill="#666">Note: If &lt;24h, creates reschedule request instead</text>

  <defs>
    <marker id="redarrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#d32f2f" />
    </marker>
  </defs>
</svg>
```

### Shop Checkout Flow Sequence Diagram

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700">
  <!-- Actors -->
  <text x="30" y="30" font-size="14" font-weight="bold">Customer</text>
  <line x1="80" y1="40" x2="80" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="180" y="30" font-size="14" font-weight="bold">Frontend</text>
  <line x1="230" y1="40" x2="230" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="340" y="30" font-size="14" font-weight="bold">API</text>
  <line x1="380" y1="40" x2="380" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="480" y="30" font-size="14" font-weight="bold">Database</text>
  <line x1="530" y1="40" x2="530" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="630" y="30" font-size="14" font-weight="bold">Payment</text>
  <line x1="680" y1="40" x2="680" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <text x="770" y="30" font-size="14" font-weight="bold">Email</text>
  <line x1="810" y1="40" x2="810" y2="680" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/>

  <!-- Interactions -->
  <line x1="80" y1="80" x2="230" y2="80" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="100" y="75" font-size="10">1. Browse products</text>

  <line x1="80" y1="120" x2="230" y2="120" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="100" y="115" font-size="10">2. Add to cart</text>

  <line x1="80" y1="160" x2="230" y2="160" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="100" y="155" font-size="10">3. Proceed to checkout</text>

  <line x1="230" y1="200" x2="380" y2="200" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="250" y="195" font-size="10">4. POST /api/checkout</text>

  <rect x="380" y="220" width="30" height="100" fill="#fff3e0"/>
  <text x="425" y="245" font-size="9">Validate cart</text>
  <text x="425" y="265" font-size="9">Check stock</text>
  <text x="425" y="285" font-size="9">Calculate totals</text>
  <text x="425" y="305" font-size="9">Apply tax (CH)</text>

  <line x1="380" y1="340" x2="530" y2="340" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="400" y="335" font-size="10">5. Create order</text>

  <line x1="530" y1="380" x2="380" y2="380" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="400" y="375" font-size="10">6. Order ID</text>

  <line x1="380" y1="420" x2="680" y2="420" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="450" y="415" font-size="10">7. Init payment (SumUp/Stripe)</text>

  <line x1="680" y1="460" x2="380" y2="460" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="450" y="455" font-size="10">8. Payment URL</text>

  <line x1="380" y1="500" x2="230" y2="500" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="250" y="495" font-size="10">9. Redirect URL</text>

  <line x1="230" y1="540" x2="80" y2="540" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="100" y="535" font-size="10">10. Navigate to payment</text>

  <line x1="80" y1="580" x2="680" y2="580" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="280" y="575" font-size="10">11. Complete payment</text>

  <line x1="680" y1="620" x2="380" y2="620" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="450" y="615" font-size="10">12. Webhook notification</text>

  <line x1="380" y1="660" x2="810" y2="660" stroke="#f57c00" stroke-width="2" marker-end="url(#orangearrow)"/>
  <text x="500" y="655" font-size="10">13. Send receipt</text>

  <defs>
    <marker id="orangearrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#f57c00" />
    </marker>
  </defs>
</svg>
```

---

## Data Flow

### Request Flow

1. **Client Request** → Next.js App Router
2. **Middleware** → Authentication, Logging, Rate Limiting
3. **Route Handler/Server Component** → Business Logic
4. **Database Layer** → Drizzle ORM + RLS Policies
5. **Response** → JSON or React Component

### Authentication Flow

1. User authenticates via Supabase Auth
2. JWT token issued with user claims (role, permissions)
3. Token passed in Authorization header
4. RLS policies enforce access control at database level
5. Application-level RBAC for UI and API

### Logging Flow

1. Each request assigned unique `request_id`
2. Structured JSON logs with correlation
3. Logged to stdout (captured by Vercel)
4. Errors sent to Sentry with context
5. Performance metrics tracked

---

## Security Architecture

### Defense in Depth

**Layer 1: Network**

- HTTPS only (HSTS enabled)
- CSP headers configured
- Rate limiting on all endpoints

**Layer 2: Application**

- Input validation (Zod schemas)
- CSRF protection
- XSS prevention (React escaping + CSP)
- SQL injection prevention (Drizzle ORM)

**Layer 3: Database**

- RLS policies on all tables
- Least privilege access
- Audit logging for sensitive operations
- Encrypted at rest (Supabase default)

**Layer 4: Secrets**

- Environment variables only
- Never in code or version control
- Rotated regularly
- Separate keys per environment

### Row Level Security (RLS)

All database tables have RLS enabled with policies for:

- `public`: Anonymous users (read-only, limited)
- `authenticated`: Logged-in customers
- `staff`: Salon employees
- `admin`: Administrative users
- `service_role`: Backend services only

---

## Deployment Architecture

### Environments

**Development**

- Local: `pnpm dev`
- Database: Supabase local or dev project
- Environment: `.env.local`

**Preview**

- Trigger: Pull requests
- Platform: Vercel preview deployments
- Database: Supabase preview branch
- URL: Auto-generated per PR

**Staging**

- Trigger: Merge to `develop`
- Platform: Vercel
- Database: Supabase staging
- URL: `staging.schnittwerk-vanessa.ch`
- Purpose: QA and client review

**Production**

- Trigger: Release tag
- Platform: Vercel
- Database: Supabase production
- URL: `www.schnittwerk-vanessa.ch`
- Monitoring: Full observability enabled

### CI/CD Pipeline

```
Commit → GitHub Actions
  ├─ Install dependencies
  ├─ Lint & Type check
  ├─ Run unit tests
  ├─ Run integration tests
  ├─ Build application
  ├─ Run migrations (staging/prod)
  ├─ Run RLS policy tests
  ├─ Lighthouse CI (marketing pages)
  └─ Deploy to Vercel
       └─ Run E2E tests (smoke)
```

### Rollback Strategy

1. **Immediate**: Revert Vercel deployment (keeps old version)
2. **Database**: Forward-only migrations (no rollback)
3. **Data**: Point-in-time recovery available (Supabase)

---

## Performance Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s

### Optimization Strategies

- Server-side rendering for marketing pages
- Static generation where possible
- Edge caching with Vercel
- Image optimization (next/image)
- Code splitting and lazy loading
- Database query optimization
- Redis caching for hot data

---

## Monitoring & Observability

### Health Checks

- `/api/health`: Basic liveness
- `/api/ready`: Readiness (dependencies check)

### Logging

- Structured JSON logs
- Request ID correlation
- Log levels: error, warn, info, debug
- Retention: 30 days (Vercel), indefinite (Sentry)

### Error Tracking

- Sentry for exceptions
- Source maps uploaded
- User context attached
- Release tracking

### Metrics

- Vercel Analytics: Web Vitals
- Plausible/Matomo: Privacy-focused analytics
- Database: Query performance (Supabase dashboard)
- Custom: Business metrics in admin portal

---

## Future Considerations

### Phase 1+

- Database schema and RLS implementation
- Migration strategy and versioning

### Phase 2+

- Real-time features (booking conflicts)
- Email template management
- Calendar integrations

### Phase 3+

- Payment reconciliation automation
- Inventory management
- Multi-location support (if needed)

### Phase 4+

- Advanced analytics and reporting
- Customer segmentation
- Marketing automation

### Phase 5+

- Performance optimization
- SEO enhancements
- Advanced security features

---

## Appendix

### Key Technologies

| Category   | Technology   | Version | Purpose             |
| ---------- | ------------ | ------- | ------------------- |
| Framework  | Next.js      | 14.x    | App framework       |
| UI Library | React        | 18.x    | Component library   |
| Language   | TypeScript   | 5.x     | Type safety         |
| Styling    | Tailwind CSS | 3.x     | Utility CSS         |
| Database   | PostgreSQL   | 15+     | Primary datastore   |
| ORM        | Drizzle      | 0.29+   | Type-safe queries   |
| Cache      | Redis        | 7.x     | Session & caching   |
| Email      | Resend       | Latest  | Transactional email |
| Payments   | SumUp/Stripe | Latest  | Payment processing  |
| Monitoring | Sentry       | 7.x     | Error tracking      |
| Analytics  | Plausible    | Latest  | Privacy analytics   |
| Hosting    | Vercel       | Latest  | Deployment platform |

### Contact

**Project Owner**: Lead Architect  
**Documentation**: `/docs/`  
**Issue Tracker**: GitHub Issues  
**CI/CD**: GitHub Actions
