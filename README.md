# Schnittwerk by Vanessa Carosella

Production-ready web application for a hair salon in St. Gallen, Switzerland.

## Features

- 🌐 **Public Website**: Marketing pages with SEO optimization
- 📅 **Online Booking**: Real-time appointment scheduling
- 🛒 **E-Commerce Shop**: Product sales with payment processing
- 👨‍💼 **Admin Portal**: Business management and analytics
- 👤 **Customer Portal**: Booking history and profile management

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: Supabase (PostgreSQL with RLS)
- **Payments**: SumUp (primary), Stripe (fallback)
- **Email**: Resend
- **Monitoring**: Sentry
- **Analytics**: Plausible (privacy-focused)
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions

## Project Structure

```
.
├── apps/
│   └── web/                # Next.js application
├── packages/
│   ├── db/                 # Database schemas and migrations
│   ├── ui/                 # Shared UI components
│   ├── lib/                # Shared utilities
│   └── payments/           # Payment adapters
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # Architecture overview
│   ├── DECISIONS.md        # Architectural decisions
│   ├── SECURITY.md         # Security guidelines
│   ├── PRIVACY.md          # Privacy and compliance
│   └── RUNBOOK.md          # Operations guide
└── .github/
    └── workflows/          # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 18+ (20 recommended)
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
pnpm format       # Format code with Prettier
pnpm format:check # Check formatting

# Testing
pnpm test         # Run tests
```

## Development Phases

This project is developed in strict phases:

- **Phase 0**: Architecture and Foundation ✅
- **Phase 1**: Database and RLS ✅
- **Phase 2**: Booking Logic and Email
- **Phase 3**: Shop and Payments
- **Phase 4**: Admin Portal and Inventory
- **Phase 5**: Security, Privacy, Performance

Each phase has specific acceptance criteria and must be completed before moving to the next.

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:

- `NEXT_PUBLIC_BASE_URL`: Base URL of the application
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SENTRY_DSN`: Sentry error tracking DSN
- Payment provider credentials (SumUp, Stripe)
- Email service credentials (Resend)

## Health Checks

- `/api/health`: Basic liveness check
- `/api/ready`: Readiness check with dependency status

## Documentation

- [Architecture](./docs/ARCHITECTURE.md): System design and diagrams
- [Decisions](./docs/DECISIONS.md): Architectural decision records
- [Security](./docs/SECURITY.md): Security guidelines and best practices
- [Privacy](./docs/PRIVACY.md): DSGVO/DSG compliance documentation
- [Runbook](./docs/RUNBOOK.md): Operations and troubleshooting guide

## Contributing

1. Create a feature branch: `git checkout -b feature/description`
2. Make your changes
3. Run tests and quality checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Commit with conventional commit messages
5. Create a pull request (use the PR template)
6. Wait for CI to pass and request review

See [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) for PR guidelines.

## License

UNLICENSED - Private project for Schnittwerk by Vanessa Carosella

## Contact

**Business**: Schnittwerk by Vanessa Carosella  
**Address**: Rorschacher Str. 152, 9000 St. Gallen, Switzerland  
**Website**: https://www.schnittwerk-vanessa.ch (coming soon)

---

Built with ❤️ in St. Gallen
