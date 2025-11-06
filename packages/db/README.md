# @schnittwerk/db

Database package for Schnittwerk application using Drizzle ORM and PostgreSQL.

## Features

- **25+ Tables**: Complete database schema for salon management
- **Row Level Security**: PostgreSQL RLS policies on all tables
- **Type Safety**: Full TypeScript support with Drizzle ORM
- **Exclusion Constraints**: Prevents appointment overlaps using btree_gist
- **Audit Logging**: Complete audit trail for sensitive operations
- **Migrations**: Drizzle Kit for schema migrations
- **Seed Data**: Demo data for development and testing

## Schema Overview

### Authentication & Users

- `users` - User accounts (extends Supabase auth)
- `roles` - System roles (owner, admin, manager, reception, stylist, customer)
- `role_assignments` - User-role mappings

### Staff & Customers

- `staff` - Staff member profiles
- `customers` - Customer profiles
- `staff_working_hours` - Individual staff schedules
- `staff_absences` - Vacations and time off

### Services & Appointments

- `services` - Salon services offered
- `staff_services` - Staff-service assignments
- `appointments` - Bookings with exclusion constraint
- `appointment_events` - Appointment audit trail
- `opening_hours` - Regular business hours
- `opening_exceptions` - Holidays and special hours

### Products & Inventory

- `products` - Products for sale
- `product_variants` - Product variations (size, color, etc.)
- `stock_movements` - Inventory audit trail

### Orders & Payments

- `orders` - Customer orders
- `order_items` - Order line items
- `payments` - Payment transactions
- `refunds` - Refund records

### Promotions

- `coupons` - Discount codes
- `gift_cards` - Gift card balances
- `gift_card_transactions` - Gift card usage history

### System

- `settings` - Application configuration
- `notifications` - User notifications
- `email_templates` - Email template management
- `audit_log` - System audit trail

## Setup

### Prerequisites

- PostgreSQL 15+ (with Supabase)
- Node.js 18+
- pnpm 8+

### Environment Variables

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Installation

```bash
pnpm install
```

## Scripts

### Generate Migrations

```bash
pnpm db:generate
```

Generates SQL migration files from schema changes.

### Run Migrations

```bash
pnpm db:migrate
```

Applies all pending migrations to the database.

### Seed Database

```bash
pnpm db:seed
```

Populates the database with demo data:

- 6 roles (owner, admin, manager, reception, stylist, customer)
- 5 demo users
- 3 staff members
- 1 demo customer
- 6 services
- Opening hours
- 3 products with variants
- System settings
- Email templates

### Push Schema (Development)

```bash
pnpm db:push
```

Push schema changes directly to database (skip migrations). **Development only!**

### Open Drizzle Studio

```bash
pnpm db:studio
```

Opens Drizzle Studio for database browsing.

### Run Tests

```bash
pnpm test
```

Runs RLS policy tests (requires Supabase configuration).

## Database Architecture

### Row Level Security (RLS)

All tables have RLS enabled with policies based on user roles:

**Owner**

- Full system access
- Can manage all data

**Admin**

- User and role management
- System configuration
- Audit log access

**Manager**

- Operations management
- Reporting and analytics
- Service and product management

**Reception**

- Booking management
- Customer management
- Order processing

**Stylist**

- Own schedule management
- Assigned appointments
- Customer interaction

**Customer**

- Own profile
- Own appointments
- Own orders

### Exclusion Constraint

The `appointments` table uses a PostgreSQL exclusion constraint to prevent overlapping bookings:

```sql
EXCLUDE USING GIST (
  staff_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (status NOT IN ('cancelled', 'no_show'))
```

This ensures no two non-cancelled appointments can overlap for the same staff member.

### Audit Trail

- `appointment_events` - Tracks all appointment changes
- `stock_movements` - Tracks all inventory changes
- `audit_log` - Tracks all sensitive system operations

## Migration Files

Migrations are located in `src/migrations/`:

1. **0000_youthful_synch.sql** - Initial schema with all tables and enums
2. **0001_appointment_exclusion.sql** - Exclusion constraint for appointments
3. **0002_rls_policies.sql** - All RLS policies and helper functions

## TypeScript Usage

```typescript
import { db, schema } from '@schnittwerk/db';

// Query with type safety
const users = await db.select().from(schema.users);

// Insert with type checking
await db.insert(schema.appointments).values({
  customerId: '...',
  staffId: '...',
  serviceId: '...',
  startTime: new Date(),
  endTime: new Date(),
  price: '75.00',
  status: 'pending',
});

// Update with RLS
await db
  .update(schema.appointments)
  .set({ status: 'confirmed' })
  .where(eq(schema.appointments.id, appointmentId));
```

## Testing

RLS policy tests are in `tests/rls-policies.test.ts`. They verify:

- Users can only access their own data
- Staff can access assigned data
- Admins have appropriate access
- Exclusion constraints work correctly

Tests require a real Supabase instance for full integration testing.

## Development

### Adding a New Table

1. Create schema file in `src/schema/`
2. Export from `src/schema/index.ts`
3. Run `pnpm db:generate` to create migration
4. Add RLS policies to new migration file
5. Add tests to `tests/rls-policies.test.ts`

### Modifying a Table

1. Update schema file
2. Run `pnpm db:generate`
3. Review generated migration
4. Update RLS policies if needed
5. Test changes

## Production Checklist

- [ ] All migrations tested
- [ ] RLS policies verified
- [ ] Indexes optimized
- [ ] Backup strategy in place
- [ ] Connection pooling configured
- [ ] Monitoring set up

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [btree_gist Extension](https://www.postgresql.org/docs/current/btree-gist.html)
