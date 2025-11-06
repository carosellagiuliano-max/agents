# Security Guidelines

**Schnittwerk Web Application - Security Documentation**

Version: 0.1.0  
Last Updated: 2024-11-06  
Owner: Security and Privacy

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Application Security](#application-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Incident Response](#incident-response)
7. [Security Checklist](#security-checklist)

---

## Security Principles

### Defense in Depth

Multiple layers of security controls to protect against threats:

1. Network security (HTTPS, firewalls)
2. Application security (input validation, CSRF protection)
3. Database security (RLS, least privilege)
4. Secrets management (environment variables, rotation)

### Least Privilege

- Users have minimum permissions needed
- Service accounts scoped to specific resources
- RLS policies enforce access at database level
- Regular permission audits

### Privacy by Default

- Minimal data collection
- Explicit consent for optional features
- Data retention limits
- Right to deletion honored

---

## Authentication & Authorization

### Authentication (Phase 1+)

**Supabase Auth**

- Email/password authentication
- Magic link support (passwordless)
- Session management with JWT
- Multi-factor authentication (MFA) for admin users

**Password Requirements**

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special chars
- No common passwords (dictionary check)
- Password reset via secure token

**Session Management**

- JWT tokens with expiration
- Refresh token rotation
- Secure, httpOnly cookies
- Session invalidation on logout
- Concurrent session limits

### Authorization

**Role-Based Access Control (RBAC)**

- `owner`: Full system access
- `admin`: User and business management
- `manager`: Operations and reporting
- `reception`: Booking and customer management
- `stylist`: Own schedule and customer info
- `customer`: Own bookings and profile

**Implementation**

- JWT claims contain user roles
- RLS policies enforce at database level
- UI conditionally renders based on role
- API validates roles on every request

---

## Data Protection

### Data Classification

**Public**: Marketing content, service listings
**Internal**: Business metrics, staff schedules
**Confidential**: Customer PII, payment details
**Restricted**: Passwords, API keys, tokens

### Encryption

**In Transit**

- HTTPS/TLS 1.3 only
- HSTS enabled (max-age 1 year)
- Certificate pinning for mobile apps (future)

**At Rest**

- Database encrypted by default (Supabase)
- Backup encryption enabled
- Sensitive fields encrypted in application layer (if needed)

### Personal Data (DSGVO/DSG)

**Data Minimization**

- Collect only necessary information
- Clear purpose for each data point
- Regular data cleanup of old records

**Data Subject Rights**

- Right to access: Export feature in admin portal
- Right to rectification: Edit profile
- Right to erasure: Delete account with grace period
- Right to portability: JSON export

**Consent Management**

- Explicit consent for marketing
- Consent log with timestamp
- Easy withdrawal mechanism
- Double opt-in for newsletters

---

## Application Security

### Input Validation

**Zod Schemas**

- All API inputs validated with Zod
- Type safety enforced
- Sanitization of user inputs
- Reject invalid data early

**SQL Injection Prevention**

- Use Drizzle ORM (parameterized queries)
- Never construct raw SQL from user input
- Audit all database queries

**XSS Prevention**

- React auto-escapes by default
- CSP headers configured
- No `dangerouslySetInnerHTML` without sanitization
- User-generated content sanitized

### CSRF Protection

**Implementation**

- CSRF tokens for state-changing operations
- SameSite cookie attribute
- Origin/Referer validation
- Double-submit cookie pattern

### Content Security Policy (CSP)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.supabase.io https://sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### Rate Limiting

**Endpoints**

- `/api/auth/*`: 5 requests per minute per IP
- `/api/booking/create`: 10 requests per hour per user
- `/api/booking/availability`: 60 requests per minute per IP
- `/api/contact`: 3 requests per hour per IP

**Implementation**

- Upstash Redis for rate limit storage
- Sliding window algorithm
- Return 429 (Too Many Requests) with Retry-After header

### API Security

**Best Practices**

- Authentication required by default
- Explicit public endpoints only
- Request validation with Zod
- Response doesn't leak implementation details
- No stack traces in production
- Idempotency keys for mutations

---

## Infrastructure Security

### Environment Variables

**Rules**

- Never commit secrets to version control
- Use `.env.local` for local development
- Vercel for production secrets
- Rotate credentials regularly
- Separate keys per environment

**Secret Types**

- Database credentials
- API keys (Resend, SumUp, Stripe)
- JWT signing keys
- Sentry DSN
- Encryption keys

### Database Security

**Row Level Security (RLS)**

```sql
-- Example policy for customers table
CREATE POLICY "Users can view own data"
ON customers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all data"
ON customers
FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');
```

**Best Practices**

- RLS enabled on all tables
- Policies tested (positive and negative tests)
- Service role key used only in backend
- Regular permission audits
- Least privilege for application user

### Network Security

**Firewall Rules**

- Database: Allow only from application IPs
- Admin panel: Optional IP whitelist
- API: Cloudflare or similar DDoS protection

**Headers**

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Incident Response

### Incident Types

**P0 - Critical**

- Data breach
- Service completely down
- Payment system compromised

**P1 - High**

- Partial service outage
- Security vulnerability discovered
- Performance severely degraded

**P2 - Medium**

- Minor security issue
- Data inconsistency
- Non-critical feature broken

### Response Process

**Detection**

1. Automated monitoring alerts
2. User reports via support
3. Security scan findings
4. Third-party disclosure

**Response**

1. Acknowledge incident (log in incident tracker)
2. Assess severity and impact
3. Contain the threat
4. Eradicate the cause
5. Recover services
6. Document lessons learned

**Communication**

- P0: Immediate notification to stakeholders
- P1: Notify within 1 hour
- P2: Notify within 24 hours
- Public disclosure if customer data affected (GDPR requirement)

### Data Breach Protocol

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and data affected
3. **Notify**: Inform authorities within 72 hours (GDPR)
4. **Communicate**: Notify affected users
5. **Remediate**: Fix vulnerability
6. **Review**: Post-mortem and improvements

---

## Security Checklist

### Development

- [ ] All inputs validated with Zod schemas
- [ ] No secrets in code or version control
- [ ] SQL injection prevention via ORM
- [ ] XSS prevention (React escaping + CSP)
- [ ] CSRF protection on mutations
- [ ] Rate limiting on public endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Authentication required by default
- [ ] Authorization checked on every request

### Database

- [ ] RLS enabled on all tables
- [ ] RLS policies tested (positive/negative)
- [ ] Least privilege for application user
- [ ] Encryption at rest enabled
- [ ] Backup encryption enabled
- [ ] Audit logging for sensitive tables
- [ ] No default credentials

### Infrastructure

- [ ] HTTPS/TLS only (HSTS enabled)
- [ ] Security headers configured
- [ ] Environment variables for secrets
- [ ] Secrets rotated regularly
- [ ] Firewall rules configured
- [ ] DDoS protection active
- [ ] Monitoring and alerting set up

### Deployment

- [ ] Dependencies scanned for vulnerabilities
- [ ] Container images scanned (if applicable)
- [ ] Deployment requires approval
- [ ] Rollback plan tested
- [ ] Incident response plan documented
- [ ] Security contacts up to date

### Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie notice (if needed)
- [ ] Data processing agreements (DPAs) in place
- [ ] Data retention policy defined
- [ ] Right to deletion implemented
- [ ] Consent management working

---

## Security Tools

### Static Analysis

- ESLint with security plugins
- TypeScript strict mode
- Semgrep for security patterns

### Dependency Scanning

- Dependabot (GitHub)
- `pnpm audit` in CI
- OWASP Dependency-Check

### Runtime Protection

- Sentry for error tracking
- Upstash for rate limiting
- Vercel for DDoS protection

### Testing

- Unit tests for auth logic
- Integration tests for RLS policies
- E2E tests for critical flows
- Penetration testing (annual)

---

## Security Training

**Required for All Developers**

- OWASP Top 10 awareness
- Secure coding practices
- Data protection principles (GDPR/DSG)
- Incident response procedures

**Role-Specific**

- **Frontend**: XSS, CSP, CSRF
- **Backend**: SQL injection, authentication, authorization
- **Database**: RLS, encryption, backups
- **DevOps**: Infrastructure security, secrets management

---

## Contact

**Security Issues**: security@schnittwerk-vanessa.ch  
**Responsible Disclosure**: Follow coordinated disclosure  
**PGP Key**: [To be added in production]

---

## Appendix

### Useful Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

### Compliance

- **GDPR**: General Data Protection Regulation (EU)
- **DSG**: Datenschutzgesetz (Swiss Data Protection Act)
- **PCI DSS**: Payment Card Industry Data Security Standard (via payment processors)

---

**Note**: This document evolves with the project. Review quarterly and after security incidents.
