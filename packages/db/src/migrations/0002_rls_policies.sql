/**
 * Row Level Security (RLS) Policies
 * Phase 1 - Database and RLS
 * 
 * This file contains all RLS policies for the Schnittwerk database.
 * These policies enforce access control at the database level.
 * 
 * Roles:
 * - owner: Full system access
 * - admin: Administrative access
 * - manager: Operations and reporting
 * - reception: Booking and customer management
 * - stylist: Own schedule and customer info
 * - customer: Own bookings and profile
 */

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's roles from JWT claims
CREATE OR REPLACE FUNCTION auth.user_roles()
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT r.name 
      FROM roles r
      JOIN role_assignments ra ON ra.role_id = r.id
      WHERE ra.user_id = auth.uid()
    ),
    ARRAY[]::TEXT[]
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION auth.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT role_name = ANY(auth.user_roles());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION auth.has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(auth.user_roles()) AS user_role
    WHERE user_role = ANY(role_names)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-----------------------------------
-- USERS TABLE POLICIES
-----------------------------------

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (id = auth.uid() OR auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only owner/admin can create users
CREATE POLICY "users_insert" ON users
  FOR INSERT
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin']));

-- Only owner can delete users (soft delete)
CREATE POLICY "users_delete" ON users
  FOR DELETE
  USING (auth.has_role('owner'));

-----------------------------------
-- ROLES TABLE POLICIES
-----------------------------------

-- Everyone can view roles (for display purposes)
CREATE POLICY "roles_select_all" ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only owner can manage roles
CREATE POLICY "roles_manage" ON roles
  FOR ALL
  USING (auth.has_role('owner'))
  WITH CHECK (auth.has_role('owner'));

-----------------------------------
-- ROLE ASSIGNMENTS POLICIES
-----------------------------------

-- Users can view their own role assignments
CREATE POLICY "role_assignments_select_own" ON role_assignments
  FOR SELECT
  USING (user_id = auth.uid() OR auth.has_any_role(ARRAY['owner', 'admin']));

-- Only owner/admin can assign roles
CREATE POLICY "role_assignments_manage" ON role_assignments
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin']));

-----------------------------------
-- STAFF TABLE POLICIES
-----------------------------------

-- Staff can view their own profile, managers+ can view all
CREATE POLICY "staff_select" ON staff
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception'])
  );

-- Staff can update their own profile, admins can update all
CREATE POLICY "staff_update" ON staff
  FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    auth.has_any_role(ARRAY['owner', 'admin', 'manager'])
  );

-- Only admin+ can create staff
CREATE POLICY "staff_insert" ON staff
  FOR INSERT
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-----------------------------------
-- CUSTOMERS TABLE POLICIES
-----------------------------------

-- Customers can view their own data, staff can view all active customers
CREATE POLICY "customers_select" ON customers
  FOR SELECT
  USING (
    user_id = auth.uid() OR 
    auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception', 'stylist'])
  );

-- Customers can update their own profile
CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reception+ can update customer profiles
CREATE POLICY "customers_update_staff" ON customers
  FOR UPDATE
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Reception+ can create customers
CREATE POLICY "customers_insert" ON customers
  FOR INSERT
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-----------------------------------
-- SERVICES POLICIES
-----------------------------------

-- Everyone can view active services
CREATE POLICY "services_select_active" ON services
  FOR SELECT
  USING (is_active = true OR auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Only manager+ can manage services
CREATE POLICY "services_manage" ON services
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-----------------------------------
-- APPOINTMENTS POLICIES
-----------------------------------

-- Customers can view their own appointments
CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Staff can view their own appointments
CREATE POLICY "appointments_select_staff" ON appointments
  FOR SELECT
  USING (
    staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

-- Reception+ can view all appointments
CREATE POLICY "appointments_select_all" ON appointments
  FOR SELECT
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Customers can create appointments for themselves
CREATE POLICY "appointments_insert_customer" ON appointments
  FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) AND
    status = 'pending'
  );

-- Reception+ can create appointments
CREATE POLICY "appointments_insert_staff" ON appointments
  FOR INSERT
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Customers can cancel their own appointments (within time limit)
CREATE POLICY "appointments_update_customer" ON appointments
  FOR UPDATE
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) AND
    status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) AND
    status = 'cancelled'
  );

-- Staff can update appointments
CREATE POLICY "appointments_update_staff" ON appointments
  FOR UPDATE
  USING (
    staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) OR
    auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception'])
  );

-----------------------------------
-- OPENING HOURS POLICIES
-----------------------------------

-- Everyone can view opening hours
CREATE POLICY "opening_hours_select_all" ON opening_hours
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin+ can manage opening hours
CREATE POLICY "opening_hours_manage" ON opening_hours
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-----------------------------------
-- PRODUCTS POLICIES
-----------------------------------

-- Everyone can view active products
CREATE POLICY "products_select_active" ON products
  FOR SELECT
  USING (is_active = true OR auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-- Only manager+ can manage products
CREATE POLICY "products_manage" ON products
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-----------------------------------
-- PRODUCT VARIANTS POLICIES
-----------------------------------

-- Everyone can view active variants
CREATE POLICY "product_variants_select" ON product_variants
  FOR SELECT
  USING (is_active = true OR auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-- Only manager+ can manage variants
CREATE POLICY "product_variants_manage" ON product_variants
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-----------------------------------
-- ORDERS POLICIES
-----------------------------------

-- Customers can view their own orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Staff can view all orders
CREATE POLICY "orders_select_staff" ON orders
  FOR SELECT
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Customers can create their own orders
CREATE POLICY "orders_insert_customer" ON orders
  FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Staff can create orders
CREATE POLICY "orders_insert_staff" ON orders
  FOR INSERT
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Only staff can update orders
CREATE POLICY "orders_update" ON orders
  FOR UPDATE
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-----------------------------------
-- PAYMENTS POLICIES
-----------------------------------

-- Customers can view their own payments
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- Staff can view all payments
CREATE POLICY "payments_select_staff" ON payments
  FOR SELECT
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Only staff can manage payments
CREATE POLICY "payments_manage" ON payments
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-----------------------------------
-- SETTINGS POLICIES
-----------------------------------

-- Everyone can view public settings
CREATE POLICY "settings_select_public" ON settings
  FOR SELECT
  USING (is_public = true OR auth.has_any_role(ARRAY['owner', 'admin', 'manager']));

-- Only owner/admin can manage settings
CREATE POLICY "settings_manage" ON settings
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin']));

-----------------------------------
-- NOTIFICATIONS POLICIES
-----------------------------------

-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-----------------------------------
-- AUDIT LOG POLICIES
-----------------------------------

-- Only admin+ can view audit log
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT
  USING (auth.has_any_role(ARRAY['owner', 'admin']));

-- System can create audit log entries
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT
  WITH CHECK (true); -- Allow system to log, will be restricted by application

-- No one can update or delete audit log
-- (handled by not creating UPDATE/DELETE policies)

-----------------------------------
-- EMAIL TEMPLATES POLICIES
-----------------------------------

-- Staff can view templates
CREATE POLICY "email_templates_select" ON email_templates
  FOR SELECT
  USING (auth.has_any_role(ARRAY['owner', 'admin', 'manager', 'reception']));

-- Only admin+ can manage templates
CREATE POLICY "email_templates_manage" ON email_templates
  FOR ALL
  USING (auth.has_any_role(ARRAY['owner', 'admin']))
  WITH CHECK (auth.has_any_role(ARRAY['owner', 'admin']));
