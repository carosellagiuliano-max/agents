-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Supporting schema for helper functions
create schema if not exists app;

-- Enums
create type user_status as enum ('invited', 'active', 'suspended', 'archived');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type appointment_event as enum ('created', 'updated', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show');
create type order_status as enum ('draft', 'pending', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded');
create type payment_status as enum ('pending', 'authorized', 'captured', 'failed', 'refunded');
create type notification_status as enum ('pending', 'queued', 'sent', 'failed');
create type notification_channel as enum ('email', 'sms', 'webhook', 'push');
create type refund_reason as enum ('customer_request', 'service_issue', 'payment_failure', 'other');
create type coupon_discount_type as enum ('percentage', 'fixed_amount');
create type stock_movement_type as enum ('adjustment', 'sale', 'restock', 'transfer', 'inventory');

-- Tables
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text,
  full_name text,
  preferred_name text,
  locale text not null default 'de-CH',
  status user_status not null default 'invited',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists role_assignments (
  user_id uuid not null references users(id) on delete cascade,
  role_code text not null references roles(code) on delete restrict,
  assigned_by uuid references users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  constraint role_assignments_pkey primary key (user_id, role_code)
);

create index if not exists role_assignments_user_idx on role_assignments(user_id);
create index if not exists role_assignments_role_idx on role_assignments(role_code);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  display_name text not null,
  bio text,
  avatar_url text,
  color_hex varchar(7),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  duration_minutes integer not null,
  price_cents integer not null default 0,
  currency char(3) not null default 'CHF',
  category text,
  tax_rate numeric(4,2) default 7.70,
  is_active boolean not null default true,
  is_online_bookable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_slug_key unique (slug)
);

create index if not exists services_name_idx on services using gin (to_tsvector('simple', coalesce(name, '')));

create table if not exists staff_services (
  staff_id uuid not null references staff(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  duration_minutes integer,
  price_cents integer,
  created_at timestamptz not null default now(),
  constraint staff_services_pkey primary key (staff_id, service_id)
);

create index if not exists staff_services_staff_idx on staff_services(staff_id);
create index if not exists staff_services_service_idx on staff_services(service_id);

create table if not exists opening_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opening_hours_day_idx on opening_hours(day_of_week);

create table if not exists opening_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  constraint opening_exceptions_date_key unique(date)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email text,
  phone text,
  first_name text,
  last_name text,
  preferred_name text,
  notes text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_email_idx on customers(email);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  status appointment_status not null default 'pending',
  slot tstzrange not null,
  price_cents integer not null,
  currency char(3) not null default 'CHF',
  notes text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_staff_idx on appointments(staff_id);
create index if not exists appointments_customer_idx on appointments(customer_id);
create index if not exists appointments_service_idx on appointments(service_id);

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    staff_id with =,
    slot with &&
  )
  where (status in ('pending', 'confirmed'));

create table if not exists appointment_events (
  id bigserial primary key,
  appointment_id uuid not null references appointments(id) on delete cascade,
  event_type appointment_event not null,
  payload jsonb not null default '{}',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_events_appointment_idx on appointment_events(appointment_id);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  default_price_cents integer not null,
  currency char(3) not null default 'CHF',
  tax_rate numeric(4,2) default 7.70,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique(slug)
);

create index if not exists products_name_idx on products using gin (to_tsvector('simple', coalesce(name, '')));

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sku text,
  price_cents integer,
  currency char(3),
  stock_tracking boolean not null default true,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_sku_key unique(sku)
);

create index if not exists product_variants_product_idx on product_variants(product_id);

create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity integer not null default 0,
  location text,
  threshold integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_items_variant_key unique(variant_id)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  movement_type stock_movement_type not null,
  quantity_change integer not null,
  reason text,
  reference_id uuid,
  created_by uuid references users(id) on delete set null,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_variant_idx on stock_movements(variant_id);
create index if not exists stock_movements_occurred_idx on stock_movements(occurred_at);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  status order_status not null default 'draft',
  total_cents integer not null default 0,
  tax_cents integer not null default 0,
  currency char(3) not null default 'CHF',
  notes text,
  source text default 'in_store',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_idx on orders(customer_id);
create index if not exists orders_status_idx on orders(status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  description text,
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  amount_cents integer not null,
  currency char(3) not null default 'CHF',
  provider text not null,
  provider_payment_id text,
  status payment_status not null default 'pending',
  captured_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx on payments(order_id);
create index if not exists payments_provider_idx on payments(provider);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount_cents integer not null,
  currency char(3) not null default 'CHF',
  reason refund_reason not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists refunds_payment_idx on refunds(payment_id);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) not null,
  description text,
  discount_type coupon_discount_type not null,
  discount_value numeric(6,2) not null,
  max_redemptions integer,
  redeemed_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_key unique(code)
);

create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) not null,
  initial_balance_cents integer not null,
  balance_cents integer not null,
  currency char(3) not null default 'CHF',
  expires_at timestamptz,
  issued_to_customer_id uuid references customers(id) on delete set null,
  issued_by uuid references users(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_cards_code_key unique(code)
);

create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id) on delete set null
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  channel notification_channel not null,
  recipient text,
  subject text,
  payload jsonb not null default '{}',
  status notification_status not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references users(id) on delete set null
);

create index if not exists notifications_status_idx on notifications(status);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  subject text not null,
  body_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_slug_key unique(slug)
);

create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references users(id) on delete set null,
  actor_type text not null default 'user',
  action text not null,
  target_table text not null,
  target_id uuid,
  description text,
  changes jsonb not null default '{}',
  metadata jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

-- Helper functions for RLS evaluation
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  with claims as (
    select case
      when coalesce(current_setting('request.jwt.claims', true), '') = '' then null
      else (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    end as sub
  )
  select coalesce(
    nullif(current_setting('app.user_id', true), '')::uuid,
    nullif((select sub from claims), '')::uuid
  );
$$;

create or replace function app.current_roles()
returns text[]
language sql
stable
as $$
  with claims as (
    select case
      when coalesce(current_setting('request.jwt.claims', true), '') = '' then '[]'::jsonb
      else current_setting('request.jwt.claims', true)::jsonb
    end as raw
  )
  select coalesce(
    nullif(current_setting('app.roles', true), '')::text[],
    coalesce(
      array(select jsonb_array_elements_text(raw -> 'roles') from claims),
      array[]::text[]
    )
  )
  from claims
  limit 1;
$$;

create or replace function app.has_role(role text)
returns boolean
language sql
stable
as $$
  select role = any(app.current_roles());
$$;

create or replace function app.current_staff_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result uuid;
  uid uuid;
begin
  uid := app.current_user_id();
  if uid is null then
    return null;
  end if;
  select s.id into result from staff s where s.user_id = uid limit 1;
  return result;
end;
$$;

-- Row level security enablement
alter table users enable row level security;
alter table roles enable row level security;
alter table role_assignments enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table staff_services enable row level security;
alter table opening_hours enable row level security;
alter table opening_exceptions enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table appointment_events enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table stock_items enable row level security;
alter table stock_movements enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table coupons enable row level security;
alter table gift_cards enable row level security;
alter table settings enable row level security;
alter table notifications enable row level security;
alter table email_templates enable row level security;
alter table audit_log enable row level security;

-- Public read policies for marketing data
create policy public_select_services on services for select using (true);
create policy public_select_opening_hours on opening_hours for select using (true);
create policy public_select_opening_exceptions on opening_exceptions for select using (true);
create policy public_select_products on products for select using (is_active);
create policy public_select_variants on product_variants for select using (is_active);

-- Administrative policies
create policy manage_services_admin on services for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_opening_hours_admin on opening_hours for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_opening_exceptions_admin on opening_exceptions for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_products_admin on products for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_variants_admin on product_variants for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_coupons_admin on coupons for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_gift_cards_admin on gift_cards for all to public using (
  app.has_role('owner') or app.has_role('admin')
) with check (
  app.has_role('owner') or app.has_role('admin')
);

create policy manage_settings_admin on settings for all to public using (
  app.has_role('owner') or app.has_role('admin')
) with check (
  app.has_role('owner') or app.has_role('admin')
);

create policy manage_notifications_admin on notifications for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_email_templates_admin on email_templates for all to public using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy manage_audit_log_admin on audit_log for all to public using (
  app.has_role('owner') or app.has_role('admin')
) with check (
  app.has_role('owner') or app.has_role('admin')
);

-- Staff policies
create policy staff_select_staff on staff for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
);

create policy staff_manage_staff on staff for all using (
  app.has_role('owner') or app.has_role('admin')
) with check (
  app.has_role('owner') or app.has_role('admin')
);

create policy staff_services_select on staff_services for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or app.has_role('stylist')
);

create policy staff_services_manage on staff_services for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

-- User self-service policies
create policy users_self_select on users for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or id = app.current_user_id()
);

create policy users_self_update on users for update using (
  app.has_role('owner') or app.has_role('admin') or id = app.current_user_id()
) with check (
  app.has_role('owner') or app.has_role('admin') or id = app.current_user_id()
);

create policy users_manage_roles on role_assignments for all using (
  app.has_role('owner') or app.has_role('admin')
) with check (
  app.has_role('owner') or app.has_role('admin')
);

create policy users_view_roles on role_assignments for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy roles_view on roles for select using (true);
create policy roles_manage on roles for all using (
  app.has_role('owner')
) with check (
  app.has_role('owner')
);

-- Customer centric policies
create policy customers_self_access on customers for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or id = app.current_user_id()
);

create policy customers_manage_admin on customers for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or id = app.current_user_id()
);

create policy appointments_view on appointments for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or customer_id = app.current_user_id() or staff_id = app.current_staff_id()
);

create policy appointments_manage on appointments for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
);

create policy appointment_events_view on appointment_events for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or app.has_role('stylist') or app.has_role('customer')
);

create policy appointment_events_manage on appointment_events for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
);

create policy orders_view on orders for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or customer_id = app.current_user_id()
);

create policy orders_manage on orders for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
);

create policy order_items_view on order_items for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or exists (
    select 1 from orders o where o.id = order_id and o.customer_id = app.current_user_id()
  )
);

create policy payments_view on payments for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception') or exists (
    select 1 from orders o where o.id = order_id and o.customer_id = app.current_user_id()
  )
);

create policy payments_manage on payments for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy refunds_manage on refunds for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy refunds_view on refunds for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or exists (
    select 1 from payments p join orders o on o.id = p.order_id where p.id = refunds.payment_id and o.customer_id = app.current_user_id()
  )
);

create policy stock_items_manage on stock_items for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy stock_movements_manage on stock_movements for all using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
) with check (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager')
);

create policy notifications_view_staff on notifications for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
);

create policy email_templates_view_staff on email_templates for select using (
  app.has_role('owner') or app.has_role('admin') or app.has_role('manager') or app.has_role('reception')
);

create policy audit_log_view_admin on audit_log for select using (
  app.has_role('owner') or app.has_role('admin')
);

-- Shared execution role for RLS testing/non-superuser access
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'schnittwerk_rls') then
    create role schnittwerk_rls;
  end if;
end;
$$;

grant usage on schema public to schnittwerk_rls;
grant select, insert, update, delete on all tables in schema public to schnittwerk_rls;
alter default privileges in schema public grant select, insert, update, delete on tables to schnittwerk_rls;
grant usage on schema app to schnittwerk_rls;
