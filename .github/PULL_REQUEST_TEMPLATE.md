## Description

<!-- Provide a clear description of what this PR does -->

## Type of Change

<!-- Mark relevant items with an 'x' -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test update

## Related Issues

<!-- Link related issues: Fixes #123, Relates to #456 -->

## Phase

<!-- Which phase does this belong to? -->

- [ ] Phase 0 - Architecture and Foundation
- [ ] Phase 1 - Database and RLS
- [ ] Phase 2 - Booking and Email
- [ ] Phase 3 - Shop and Payments
- [ ] Phase 4 - Admin Portal and Inventory
- [ ] Phase 5 - Security, Privacy, Performance

## Checklist

<!-- Ensure all items are completed before requesting review -->

### Code Quality

- [ ] Code follows the established coding standards
- [ ] Self-review completed
- [ ] No TODO comments in production paths
- [ ] All new/changed code has appropriate comments where needed
- [ ] Naming conventions followed (German for domain, English for technical)

### Testing

- [ ] New tests added for new functionality
- [ ] All tests pass locally (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build completes successfully (`pnpm build`)

### Security & Privacy

- [ ] No hardcoded secrets or credentials
- [ ] RLS policies implemented for new tables (if applicable)
- [ ] Input validation added (Zod schemas)
- [ ] Audit logging added for data changes (if applicable)
- [ ] DSGVO/DSG compliance verified (if handling personal data)

### Accessibility (if UI changes)

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels added where needed
- [ ] Color contrast meets WCAG 2.2 AA
- [ ] Screen reader tested

### Performance (if applicable)

- [ ] Images optimized and lazy loaded
- [ ] No unnecessary client-side JavaScript
- [ ] Database queries optimized
- [ ] Caching strategy considered

### Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Architecture diagrams updated (if significant changes)
- [ ] DECISIONS.md updated (if architectural decisions made)

## Testing Instructions

<!-- Describe how reviewers can test this PR -->

1.
2.
3.

## Screenshots (if applicable)

<!-- Add screenshots or videos for UI changes -->

## Additional Notes

<!-- Any additional information that would be helpful for reviewers -->

## Definition of Done (for Phase completions)

<!-- Only for PRs that complete a phase -->

- [ ] All acceptance criteria met
- [ ] CI pipeline green
- [ ] Documentation complete
- [ ] Phase review requested
