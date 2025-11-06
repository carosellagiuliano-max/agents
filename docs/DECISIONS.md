# Architectural Decision Records

This document tracks all significant architectural decisions made during the development of Schnittwerk.

## Format

Each decision follows this structure:

- **Date**: When the decision was made
- **Owner**: Who made the decision
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Why the decision was needed
- **Decision**: What was decided
- **Consequences**: Positive and negative outcomes

---

## ADR-001: Monorepo with pnpm Workspaces

**Date**: 2024-11-06  
**Owner**: Lead Architect  
**Status**: Accepted

**Context**:
We need to manage multiple packages (web app, database, UI components, payment adapters) that share code and dependencies.

**Decision**:
Use pnpm workspaces for a monorepo structure with packages organized by domain.

**Consequences**:

- ✅ Code sharing simplified
- ✅ Consistent dependency versions
- ✅ Faster installs with pnpm
- ⚠️ Learning curve for team members unfamiliar with monorepos
- ⚠️ CI complexity increases slightly

---

## ADR-002: Next.js 14 App Router

**Date**: 2024-11-06  
**Owner**: Lead Architect  
**Status**: Accepted

**Context**:
Need modern React framework with SSR, SEO support, and API routes. Chose between Next.js Pages Router, App Router, or alternatives like Remix.

**Decision**:
Use Next.js 14 with App Router for better performance, React Server Components, and modern patterns.

**Consequences**:

- ✅ Better performance with RSC
- ✅ Improved SEO capabilities
- ✅ Simplified data fetching
- ✅ Built-in optimization features
- ⚠️ Newer API, less community examples
- ⚠️ Some libraries may not be compatible yet

---

## ADR-003: Supabase for Database

**Date**: 2024-11-06  
**Owner**: Database and RLS  
**Status**: Accepted

**Context**:
Need managed PostgreSQL with built-in auth, RLS, and real-time capabilities. Alternatives: AWS RDS, self-hosted Postgres, PlanetScale.

**Decision**:
Use Supabase for managed PostgreSQL with Row Level Security, authentication, and API.

**Consequences**:

- ✅ Built-in RLS support
- ✅ Authentication included
- ✅ Real-time subscriptions available
- ✅ Excellent developer experience
- ⚠️ Vendor lock-in risk
- ⚠️ Pricing scales with usage

---

## ADR-004: Drizzle ORM

**Date**: 2024-11-06  
**Owner**: Database and RLS  
**Status**: Accepted

**Context**:
Need type-safe database queries with good PostgreSQL support. Alternatives: Prisma, TypeORM, Kysely.

**Decision**:
Use Drizzle ORM for type-safe queries and migrations.

**Consequences**:

- ✅ Excellent TypeScript support
- ✅ SQL-like syntax, less abstraction
- ✅ Lightweight, fast runtime
- ✅ Migration generation
- ⚠️ Smaller community than Prisma
- ⚠️ Fewer ecosystem tools

---

## ADR-005: SumUp as Primary Payment Provider

**Date**: 2024-11-06  
**Owner**: Payments  
**Status**: Accepted

**Context**:
Need payment provider supporting online and in-person (terminal) payments in Switzerland. Must support CHF and Swiss regulations.

**Decision**:
Use SumUp as primary provider with Stripe as fallback.

**Consequences**:

- ✅ Swiss market focus
- ✅ Terminal integration
- ✅ Competitive fees for Swiss market
- ✅ Stripe fallback provides redundancy
- ⚠️ Less feature-rich API than Stripe
- ⚠️ Smaller developer community

---

## ADR-006: Tailwind CSS for Styling

**Date**: 2024-11-06  
**Owner**: Frontend UX  
**Status**: Accepted

**Context**:
Need consistent, maintainable styling approach. Alternatives: CSS Modules, Styled Components, vanilla CSS.

**Decision**:
Use Tailwind CSS with custom configuration for brand colors and design system.

**Consequences**:

- ✅ Rapid development
- ✅ Consistent design tokens
- ✅ Small bundle size with purging
- ✅ Good accessibility defaults
- ⚠️ Learning curve for utility classes
- ⚠️ Verbose class names in JSX

---

## ADR-007: Structured Logging with Pino

**Date**: 2024-11-06  
**Owner**: DevOps  
**Status**: Accepted

**Context**:
Need performant, structured logging for production debugging and monitoring.

**Decision**:
Use Pino for structured JSON logging with request correlation IDs.

**Consequences**:

- ✅ Fast performance
- ✅ Structured JSON output
- ✅ Easy to parse and search
- ✅ Request correlation support
- ⚠️ Less human-readable in development

---

## ADR-008: Sentry for Error Tracking

**Date**: 2024-11-06  
**Owner**: DevOps, Security  
**Status**: Accepted

**Context**:
Need error tracking and monitoring for production issues. Alternatives: Rollbar, Bugsnag, LogRocket.

**Decision**:
Use Sentry for error tracking with source map support.

**Consequences**:

- ✅ Excellent error grouping
- ✅ Source map support
- ✅ Performance monitoring included
- ✅ User context and breadcrumbs
- ⚠️ Can be expensive at scale
- ⚠️ Privacy considerations for user data

---

## ADR-009: Plausible for Analytics

**Date**: 2024-11-06  
**Owner**: Content and SEO, Security and Privacy  
**Status**: Accepted

**Context**:
Need web analytics that complies with Swiss DSG and GDPR without cookie banners. Alternatives: Matomo, Google Analytics, Fathom.

**Decision**:
Use Plausible Analytics (or Matomo as alternative) for privacy-focused web analytics.

**Consequences**:

- ✅ GDPR/DSG compliant without cookies
- ✅ No consent banner needed
- ✅ Lightweight script
- ✅ Simple, focused metrics
- ⚠️ Less detailed than Google Analytics
- ⚠️ Subscription cost

---

## ADR-010: Vercel for Hosting

**Date**: 2024-11-06  
**Owner**: DevOps  
**Status**: Accepted

**Context**:
Need hosting platform optimized for Next.js with edge functions and global CDN. Alternatives: AWS, Railway, Netlify.

**Decision**:
Use Vercel for hosting and deployment.

**Consequences**:

- ✅ Optimized for Next.js
- ✅ Automatic deployments
- ✅ Preview deployments per PR
- ✅ Edge network performance
- ✅ Built-in analytics
- ⚠️ Can be expensive at scale
- ⚠️ Vendor lock-in for edge functions

---

## ADR-011: GitHub Actions for CI/CD

**Date**: 2024-11-06  
**Owner**: DevOps  
**Status**: Accepted

**Context**:
Need CI/CD pipeline for automated testing, building, and deployment. Alternatives: GitLab CI, CircleCI, Jenkins.

**Decision**:
Use GitHub Actions for CI/CD pipeline.

**Consequences**:

- ✅ Integrated with GitHub
- ✅ Good free tier
- ✅ Large action marketplace
- ✅ Easy to configure
- ⚠️ Vendor lock-in to GitHub
- ⚠️ Can be slower than specialized CI tools

---

## ADR-012: Phase-Based Development Approach

**Date**: 2024-11-06  
**Owner**: Lead Architect  
**Status**: Accepted

**Context**:
Complex project with multiple systems requires structured approach to avoid scope creep and ensure quality.

**Decision**:
Implement strict phase-based development (Phase 0-5) with acceptance criteria before moving forward.

**Consequences**:

- ✅ Clear milestones and deliverables
- ✅ Quality gates before progression
- ✅ Easier to manage scope
- ✅ Parallel work opportunities
- ⚠️ May slow down rapid changes
- ⚠️ Requires discipline to follow

---

## ADR-013: Row Level Security Everywhere

**Date**: 2024-11-06  
**Owner**: Security and Privacy, Database and RLS  
**Status**: Accepted

**Context**:
Need defense in depth for data access. Cannot rely solely on application-level authorization.

**Decision**:
Implement RLS policies on all database tables with positive and negative tests.

**Consequences**:

- ✅ Defense in depth
- ✅ Protects against application bugs
- ✅ Compliance with least privilege
- ✅ Audit-friendly
- ⚠️ More complex queries
- ⚠️ Must maintain policies alongside code

---

## Template for New Decisions

```markdown
## ADR-XXX: [Title]

**Date**: YYYY-MM-DD  
**Owner**: [Role/Name]  
**Status**: [Proposed/Accepted/Deprecated/Superseded]

**Context**:
[Why this decision is needed, what problem it solves]

**Decision**:
[What was decided, including key details]

**Consequences**:

- ✅ [Positive consequence]
- ⚠️ [Trade-off or risk]
```

---

## Decision Review Process

1. Propose decision with context and alternatives
2. Discuss with relevant stakeholders
3. Document decision in this file
4. Update if circumstances change
5. Mark as deprecated/superseded if no longer valid

## Notes

- All assumptions must be documented here
- Date and owner required for every decision
- Keep decisions focused and actionable
- Link to related issues or PRs where applicable
