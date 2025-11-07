import { sql } from "drizzle-orm";
import type { Database } from "./postgres";
import {
  appointmentEvents,
  appointments,
  auditLog,
  coupons,
  customers,
  emailTemplates,
  giftCards,
  notifications,
  openingExceptions,
  openingHours,
  orderItems,
  orders,
  payments,
  products,
  productVariants,
  refunds,
  roleAssignments,
  roles,
  services,
  settings,
  staff,
  staffServices,
  stockItems,
  stockMovements,
  users,
} from "./schema";

export const seedIds = {
  ownerUserId: "11111111-1111-1111-1111-111111111111",
  adminUserId: "22222222-2222-2222-2222-222222222222",
  receptionUserId: "33333333-3333-3333-3333-333333333333",
  stylistUserId: "44444444-4444-4444-4444-444444444444",
  customerUserId: "55555555-5555-5555-5555-555555555555",
  stylistStaffId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  haircutServiceId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  colorRefreshServiceId: "ccccbbbb-cccc-bbbb-cccc-bbbbbbbbbbbb",
  appointmentId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  orderId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  paymentId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  couponId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  giftCardId: "abababab-abab-abab-abab-abababababab",
  productId: "99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  productVariantId: "99999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};

const roleSeeds = [
  { code: "owner", name: "Owner", description: "Business owner" },
  { code: "admin", name: "Administrator", description: "Full administrative access" },
  { code: "manager", name: "Manager", description: "Manages day-to-day operations" },
  { code: "reception", name: "Reception", description: "Front desk and booking" },
  { code: "stylist", name: "Stylist", description: "Service provider" },
  { code: "customer", name: "Customer", description: "Client with online account" },
  { code: "service", name: "Service Role", description: "System integrations" },
];

export async function seedDatabase(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`truncate table audit_log, notifications, email_templates, refunds, payments, order_items, orders, stock_movements, stock_items, product_variants, products, appointment_events, appointments, opening_exceptions, opening_hours, staff_services, services, staff, role_assignments, customers, coupons, gift_cards, settings, users, roles restart identity cascade`,
    );

    await tx.insert(roles).values(roleSeeds);

    await tx.insert(users).values([
      {
        id: seedIds.ownerUserId,
        email: "owner@schnittwerk.dev",
        fullName: "Vanessa Carosella",
        preferredName: "Vanessa",
        status: "active",
      },
      {
        id: seedIds.adminUserId,
        email: "admin@schnittwerk.dev",
        fullName: "Admin Example",
        status: "active",
      },
      {
        id: seedIds.receptionUserId,
        email: "reception@schnittwerk.dev",
        fullName: "Reception Example",
        status: "active",
      },
      {
        id: seedIds.stylistUserId,
        email: "stylist@schnittwerk.dev",
        fullName: "Luca Style",
        preferredName: "Luca",
        status: "active",
      },
      {
        id: seedIds.customerUserId,
        email: "customer@schnittwerk.dev",
        fullName: "Mara Kundin",
        status: "active",
      },
    ]);

    await tx.insert(roleAssignments).values([
      { userId: seedIds.ownerUserId, roleCode: "owner" },
      { userId: seedIds.ownerUserId, roleCode: "admin" },
      { userId: seedIds.adminUserId, roleCode: "admin" },
      { userId: seedIds.receptionUserId, roleCode: "reception" },
      { userId: seedIds.stylistUserId, roleCode: "stylist" },
      { userId: seedIds.customerUserId, roleCode: "customer" },
    ]);

    await tx.insert(staff).values([
      {
        id: seedIds.stylistStaffId,
        userId: seedIds.stylistUserId,
        displayName: "Luca Style",
        bio: "Spezialisiert auf Balayage und moderne Schnitte.",
        colorHex: "#f97316",
      },
    ]);

    await tx.insert(services).values([
      {
        id: seedIds.haircutServiceId,
        slug: "signature-haarschnitt",
        name: "Signature Haarschnitt",
        description: "Personalisierter Haarschnitt inklusive Styling-Beratung.",
        durationMinutes: 60,
        priceCents: 12500,
      },
      {
        id: seedIds.colorRefreshServiceId,
        slug: "color-refresh",
        name: "Color Refresh",
        description: "Farbauffrischung mit Pflegebooster.",
        durationMinutes: 90,
        priceCents: 18000,
        isOnlineBookable: true,
      },
    ]);

    await tx.insert(staffServices).values([
      {
        staffId: seedIds.stylistStaffId,
        serviceId: seedIds.haircutServiceId,
      },
      {
        staffId: seedIds.stylistStaffId,
        serviceId: seedIds.colorRefreshServiceId,
        durationMinutes: 105,
      },
    ]);

    const defaultHours = [
      { day: 1, opens: "09:00", closes: "18:00" },
      { day: 2, opens: "09:00", closes: "18:00" },
      { day: 3, opens: "09:00", closes: "18:00" },
      { day: 4, opens: "10:00", closes: "20:00" },
      { day: 5, opens: "09:00", closes: "16:00" },
    ];

    await tx.insert(openingHours).values(
      defaultHours.map((row) => ({
        dayOfWeek: row.day,
        opensAt: row.opens,
        closesAt: row.closes,
      })),
    );

    await tx.insert(openingExceptions).values([
      {
        date: new Date("2024-12-25"),
        isClosed: true,
        reason: "Weihnachten",
      },
    ]);

    await tx.insert(customers).values([
      {
        id: seedIds.customerUserId,
        userId: seedIds.customerUserId,
        email: "customer@schnittwerk.dev",
        firstName: "Mara",
        lastName: "Kundin",
        marketingOptIn: true,
      },
    ]);

    await tx.insert(appointments).values([
      {
        id: seedIds.appointmentId,
        customerId: seedIds.customerUserId,
        staffId: seedIds.stylistStaffId,
        serviceId: seedIds.haircutServiceId,
        status: "confirmed",
        slot: sql`tstzrange('2024-05-01T07:00:00Z', '2024-05-01T08:00:00Z', '[)')`,
        priceCents: 12500,
        notes: "Bitte zusätzliche Pflegeprodukte empfehlen.",
      },
    ]);

    await tx.insert(appointmentEvents).values([
      {
        appointmentId: seedIds.appointmentId,
        eventType: "created",
        payload: { source: "online", idempotencyKey: "seed-booking" },
        createdBy: seedIds.customerUserId,
      },
      {
        appointmentId: seedIds.appointmentId,
        eventType: "confirmed",
        payload: { confirmed_by: "reception" },
        createdBy: seedIds.receptionUserId,
      },
    ]);

    await tx.insert(products).values([
      {
        id: seedIds.productId,
        slug: "home-care-kit",
        name: "Home Care Kit",
        description: "Pflegeset für glänzende Haare zwischen den Terminen.",
        defaultPriceCents: 8900,
        taxRate: "8.10",
      },
    ]);

    await tx.insert(productVariants).values([
      {
        id: seedIds.productVariantId,
        productId: seedIds.productId,
        name: "Standard",
        sku: "CARE-KIT-STD",
        priceCents: 8900,
      },
    ]);

    await tx.insert(stockItems).values([
      {
        variantId: seedIds.productVariantId,
        quantity: 25,
        location: "Salon",
      },
    ]);

    await tx.insert(stockMovements).values([
      {
        variantId: seedIds.productVariantId,
        movementType: "restock",
        quantityChange: 25,
        reason: "Initial stock",
        createdBy: seedIds.ownerUserId,
      },
    ]);

    await tx.insert(orders).values([
      {
        id: seedIds.orderId,
        customerId: seedIds.customerUserId,
        appointmentId: seedIds.appointmentId,
        status: "paid",
        totalCents: 21400,
        taxCents: 1540,
        notes: "Verknüpft mit Termin",
      },
    ]);

    await tx.insert(orderItems).values([
      {
        orderId: seedIds.orderId,
        serviceId: seedIds.haircutServiceId,
        description: "Signature Haarschnitt",
        quantity: 1,
        unitPriceCents: 12500,
        totalCents: 12500,
      },
      {
        orderId: seedIds.orderId,
        variantId: seedIds.productVariantId,
        description: "Home Care Kit",
        quantity: 1,
        unitPriceCents: 8900,
        totalCents: 8900,
      },
    ]);

    await tx.insert(payments).values([
      {
        id: seedIds.paymentId,
        orderId: seedIds.orderId,
        amountCents: 21400,
        provider: "sumup",
        status: "captured",
        capturedAt: new Date("2024-05-01T08:05:00Z"),
      },
    ]);

    await tx.insert(refunds).values([
      {
        paymentId: seedIds.paymentId,
        amountCents: 2000,
        reason: "customer_request",
        notes: "Rabatt nach Reklamation",
      },
    ]);

    await tx.insert(coupons).values([
      {
        id: seedIds.couponId,
        code: "WELCOME15",
        description: "15% Rabatt für Erstkunden",
        discountType: "percentage",
        discountValue: "15.00",
        maxRedemptions: 100,
        redeemedCount: 5,
        startsAt: new Date("2024-01-01T00:00:00Z"),
        endsAt: new Date("2024-12-31T23:59:59Z"),
      },
    ]);

    await tx.insert(giftCards).values([
      {
        id: seedIds.giftCardId,
        code: "GIFT-2024-001",
        initialBalanceCents: 10000,
        balanceCents: 6000,
        issuedToCustomerId: seedIds.customerUserId,
        issuedBy: seedIds.ownerUserId,
        expiresAt: new Date("2025-12-31T23:59:59Z"),
      },
    ]);

    await tx.insert(settings).values([
      {
        key: "booking.buffer_minutes",
        value: { before: 10, after: 5 },
        updatedBy: seedIds.ownerUserId,
      },
      {
        key: "booking.cancellation_window_hours",
        value: 24,
        updatedBy: seedIds.ownerUserId,
      },
    ]);

    await tx.insert(notifications).values([
      {
        channel: "email",
        recipient: "customer@schnittwerk.dev",
        subject: "Terminbestätigung",
        payload: { appointmentId: seedIds.appointmentId },
        status: "sent",
        sentAt: new Date("2024-04-30T07:05:00Z"),
        createdBy: seedIds.receptionUserId,
      },
    ]);

    await tx.insert(emailTemplates).values([
      {
        slug: "appointment-confirmation",
        name: "Terminbestätigung",
        subject: "Dein Termin bei Schnittwerk",
        bodyMarkdown: "## Liebe Kundin,\n\nwir freuen uns auf dich!",
      },
    ]);

    await tx.insert(auditLog).values([
      {
        actorId: seedIds.ownerUserId,
        actorType: "user",
        action: "seed_database",
        targetTable: "system",
        targetId: null,
        description: "Initial Phase-1 Seeds",
        metadata: { source: "seed" },
        ipAddress: "127.0.0.1",
      },
    ]);
  });
}
