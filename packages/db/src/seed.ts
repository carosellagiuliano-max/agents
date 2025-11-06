/**
 * Database Seed Script
 * Populates the database with initial data for development and testing
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString!);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Seed Roles
    console.log('📝 Seeding roles...');
    const rolesData = [
      { name: 'owner', description: 'Full system access' },
      { name: 'admin', description: 'Administrative access' },
      { name: 'manager', description: 'Operations and reporting' },
      { name: 'reception', description: 'Booking and customer management' },
      { name: 'stylist', description: 'Own schedule and customer info' },
      { name: 'customer', description: 'Customer access' },
    ];

    const roles = await db.insert(schema.roles).values(rolesData).returning();
    console.log(`✅ Created ${roles.length} roles`);

    // 2. Seed Demo Users
    console.log('📝 Seeding demo users...');
    const usersData = [
      {
        email: 'vanessa@schnittwerk.ch',
        firstName: 'Vanessa',
        lastName: 'Carosella',
        emailVerified: true,
      },
      {
        email: 'admin@schnittwerk.ch',
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: true,
      },
      {
        email: 'stylist1@schnittwerk.ch',
        firstName: 'Maria',
        lastName: 'Schmidt',
        emailVerified: true,
      },
      {
        email: 'stylist2@schnittwerk.ch',
        firstName: 'Lisa',
        lastName: 'Müller',
        emailVerified: true,
      },
      {
        email: 'customer@example.com',
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+41 79 123 45 67',
        emailVerified: true,
      },
    ];

    const users = await db.insert(schema.users).values(usersData).returning();
    console.log(`✅ Created ${users.length} users`);

    // 3. Assign Roles
    console.log('📝 Assigning roles...');
    const ownerRole = roles.find((r) => r.name === 'owner');
    const adminRole = roles.find((r) => r.name === 'admin');
    const stylistRole = roles.find((r) => r.name === 'stylist');
    const customerRole = roles.find((r) => r.name === 'customer');

    const roleAssignmentsData = [
      { userId: users[0].id, roleId: ownerRole!.id },
      { userId: users[1].id, roleId: adminRole!.id },
      { userId: users[2].id, roleId: stylistRole!.id },
      { userId: users[3].id, roleId: stylistRole!.id },
      { userId: users[4].id, roleId: customerRole!.id },
    ];

    await db.insert(schema.roleAssignments).values(roleAssignmentsData);
    console.log(`✅ Assigned ${roleAssignmentsData.length} roles`);

    // 4. Seed Staff
    console.log('📝 Seeding staff...');
    const staffData = [
      {
        userId: users[0].id,
        displayName: 'Vanessa Carosella',
        bio: 'Inhaberin und Meisterfriseurin mit über 15 Jahren Erfahrung',
        isActive: true,
        bookingEnabled: true,
      },
      {
        userId: users[2].id,
        displayName: 'Maria Schmidt',
        bio: 'Spezialistin für Colorationen und moderne Schnitte',
        isActive: true,
        bookingEnabled: true,
      },
      {
        userId: users[3].id,
        displayName: 'Lisa Müller',
        bio: 'Expertin für Hochsteckfrisuren und Styling',
        isActive: true,
        bookingEnabled: true,
      },
    ];

    const staff = await db.insert(schema.staff).values(staffData).returning();
    console.log(`✅ Created ${staff.length} staff members`);

    // 5. Seed Customers
    console.log('📝 Seeding customers...');
    const customersData = [
      {
        userId: users[4].id,
        email: 'customer@example.com',
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+41 79 123 45 67',
        marketingConsent: true,
        marketingConsentDate: new Date(),
      },
    ];

    const customers = await db.insert(schema.customers).values(customersData).returning();
    console.log(`✅ Created ${customers.length} customers`);

    // 6. Seed Services
    console.log('📝 Seeding services...');
    const servicesData = [
      {
        name: 'Damenhaarschnitt',
        description: 'Professioneller Haarschnitt mit Styling',
        duration: 60,
        price: '75.00',
        category: 'Schnitte',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: 'Herrenhaarschnitt',
        description: 'Klassischer oder moderner Herrenschnitt',
        duration: 45,
        price: '55.00',
        category: 'Schnitte',
        isActive: true,
        displayOrder: 2,
      },
      {
        name: 'Coloration',
        description: 'Komplette Haarfärbung mit Premium-Produkten',
        duration: 120,
        price: '150.00',
        category: 'Farbe',
        isActive: true,
        displayOrder: 3,
      },
      {
        name: 'Strähnen',
        description: 'Highlights und Lowlights für natürlichen Look',
        duration: 90,
        price: '120.00',
        category: 'Farbe',
        isActive: true,
        displayOrder: 4,
      },
      {
        name: 'Dauerwelle',
        description: 'Moderne Dauerwelle für mehr Volumen',
        duration: 120,
        price: '140.00',
        category: 'Spezial',
        isActive: true,
        displayOrder: 5,
      },
      {
        name: 'Hochsteckfrisur',
        description: 'Elegante Hochsteckfrisur für besondere Anlässe',
        duration: 90,
        price: '95.00',
        category: 'Styling',
        isActive: true,
        displayOrder: 6,
      },
    ];

    const services = await db.insert(schema.services).values(servicesData).returning();
    console.log(`✅ Created ${services.length} services`);

    // 7. Assign Services to Staff
    console.log('📝 Assigning services to staff...');
    const staffServicesData = [];
    for (const staffMember of staff) {
      for (const service of services) {
        staffServicesData.push({
          staffId: staffMember.id,
          serviceId: service.id,
        });
      }
    }

    await db.insert(schema.staffServices).values(staffServicesData);
    console.log(`✅ Assigned ${staffServicesData.length} service-staff relationships`);

    // 8. Seed Opening Hours
    console.log('📝 Seeding opening hours...');
    const openingHoursData = [
      { dayOfWeek: 'monday', openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 'tuesday', openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 'wednesday', openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 'thursday', openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 'friday', openTime: '09:00', closeTime: '19:00', isClosed: false },
      { dayOfWeek: 'saturday', openTime: '08:00', closeTime: '16:00', isClosed: false },
      { dayOfWeek: 'sunday', openTime: '00:00', closeTime: '00:00', isClosed: true },
    ];

    await db.insert(schema.openingHours).values(openingHoursData as any);
    console.log(`✅ Created ${openingHoursData.length} opening hours`);

    // 9. Seed Products
    console.log('📝 Seeding products...');
    const productsData = [
      {
        name: 'Kerastase Elixir Ultime',
        description: 'Luxuriöses Haaröl für alle Haartypen',
        brand: 'Kerastase',
        category: 'Haarpflege',
        basePrice: '45.00',
        taxRate: 'standard' as const,
        isActive: true,
        slug: 'kerastase-elixir-ultime',
      },
      {
        name: 'Olaplex No. 3',
        description: 'Hair Perfector zur Stärkung und Reparatur',
        brand: 'Olaplex',
        category: 'Haarpflege',
        basePrice: '28.00',
        taxRate: 'standard' as const,
        isActive: true,
        slug: 'olaplex-no-3',
      },
      {
        name: 'Redken All Soft Shampoo',
        description: 'Sanftes Shampoo für trockenes Haar',
        brand: 'Redken',
        category: 'Shampoo',
        basePrice: '22.00',
        taxRate: 'standard' as const,
        isActive: true,
        slug: 'redken-all-soft-shampoo',
      },
    ];

    const products = await db.insert(schema.products).values(productsData).returning();
    console.log(`✅ Created ${products.length} products`);

    // 10. Seed Product Variants
    console.log('📝 Seeding product variants...');
    const variantsData = [
      {
        productId: products[0].id,
        sku: 'KER-ELIXIR-100',
        name: '100ml',
        stockQuantity: 15,
        lowStockThreshold: 5,
      },
      {
        productId: products[1].id,
        sku: 'OLA-NO3-100',
        name: '100ml',
        stockQuantity: 20,
        lowStockThreshold: 5,
      },
      {
        productId: products[2].id,
        sku: 'RED-ALLSOFT-300',
        name: '300ml',
        stockQuantity: 12,
        lowStockThreshold: 5,
      },
    ];

    await db.insert(schema.productVariants).values(variantsData);
    console.log(`✅ Created ${variantsData.length} product variants`);

    // 11. Seed System Settings
    console.log('📝 Seeding system settings...');
    const settingsData = [
      {
        key: 'booking_enabled',
        value: 'true',
        description: 'Enable online booking system',
        category: 'booking',
        isPublic: true,
      },
      {
        key: 'booking_advance_days',
        value: '60',
        description: 'How many days in advance customers can book',
        category: 'booking',
        isPublic: true,
      },
      {
        key: 'cancellation_hours',
        value: '24',
        description: 'Hours before appointment when free cancellation is allowed',
        category: 'booking',
        isPublic: true,
      },
      {
        key: 'deposit_required',
        value: 'false',
        description: 'Require deposit for bookings',
        category: 'payment',
        isPublic: true,
      },
      {
        key: 'tax_rate_standard',
        value: '8.1',
        description: 'Standard Swiss VAT rate (%)',
        category: 'tax',
        isPublic: false,
      },
      {
        key: 'tax_rate_reduced',
        value: '2.6',
        description: 'Reduced Swiss VAT rate (%)',
        category: 'tax',
        isPublic: false,
      },
    ];

    await db.insert(schema.settings).values(settingsData);
    console.log(`✅ Created ${settingsData.length} settings`);

    // 12. Seed Email Templates
    console.log('📝 Seeding email templates...');
    const templatesData = [
      {
        name: 'appointment_confirmation',
        subject: 'Terminbestätigung - Schnittwerk',
        bodyHtml:
          '<p>Hallo {{customer_name}},</p><p>Ihr Termin am {{date}} um {{time}} wurde bestätigt.</p>',
        bodyText: 'Hallo {{customer_name}},\n\nIhr Termin am {{date}} um {{time}} wurde bestätigt.',
        variables: JSON.stringify(['customer_name', 'date', 'time', 'service', 'staff']),
      },
      {
        name: 'appointment_reminder',
        subject: 'Erinnerung an Ihren Termin - Schnittwerk',
        bodyHtml:
          '<p>Hallo {{customer_name}},</p><p>Erinnerung: Ihr Termin ist morgen um {{time}}.</p>',
        bodyText: 'Hallo {{customer_name}},\n\nErinnerung: Ihr Termin ist morgen um {{time}}.',
        variables: JSON.stringify(['customer_name', 'time', 'service']),
      },
      {
        name: 'order_confirmation',
        subject: 'Bestellbestätigung - Schnittwerk',
        bodyHtml: '<p>Vielen Dank für Ihre Bestellung {{order_number}}!</p>',
        bodyText: 'Vielen Dank für Ihre Bestellung {{order_number}}!',
        variables: JSON.stringify(['customer_name', 'order_number', 'items', 'total']),
      },
    ];

    await db.insert(schema.emailTemplates).values(templatesData);
    console.log(`✅ Created ${templatesData.length} email templates`);

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${roles.length} roles`);
    console.log(`  - ${users.length} users`);
    console.log(`  - ${staff.length} staff members`);
    console.log(`  - ${customers.length} customers`);
    console.log(`  - ${services.length} services`);
    console.log(`  - ${products.length} products`);
    console.log(`  - ${settingsData.length} settings`);
    console.log(`  - ${templatesData.length} email templates`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
