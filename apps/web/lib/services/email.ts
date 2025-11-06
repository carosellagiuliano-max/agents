import { Resend } from 'resend';
import ical from 'ical-generator';
import { db, schema } from '@schnittwerk/db';
import { eq } from 'drizzle-orm';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface AppointmentEmailData {
  appointmentId: string;
  customerEmail: string;
  customerName: string;
  staffName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  appointmentNotes?: string;
}

/**
 * Generate ICS calendar file for appointment
 * Timezone: Europe/Zurich (Swiss timezone)
 */
export function generateICS(data: AppointmentEmailData): string {
  const calendar = ical({ name: 'Schnittwerk by Vanessa Carosella' });

  calendar.createEvent({
    start: data.startTime,
    end: data.endTime,
    summary: `${data.serviceName} - Schnittwerk`,
    description: `Termin mit ${data.staffName}\n${data.appointmentNotes ? `\nNotizen: ${data.appointmentNotes}` : ''}`,
    location: 'Schnittwerk by Vanessa Carosella, Rorschacher Str. 152, 9000 St. Gallen',
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/appointments/${data.appointmentId}`,
    organizer: {
      name: 'Schnittwerk by Vanessa Carosella',
      email: process.env.SITE_EMAIL || 'info@schnittwerk-vanessa.ch',
    },
    attendees: [
      {
        name: data.customerName,
        email: data.customerEmail,
        rsvp: true,
      },
    ],
    timezone: 'Europe/Zurich',
  });

  return calendar.toString();
}

/**
 * Send appointment confirmation email with ICS attachment
 */
export async function sendAppointmentConfirmation(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch appointment details
    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, appointmentId),
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Fetch related records separately
    const customer = await db.query.customers.findFirst({
      where: eq(schema.customers.id, appointment.customerId),
    });

    const staff = await db.query.staff.findFirst({
      where: eq(schema.staff.id, appointment.staffId),
    });

    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, appointment.serviceId),
    });

    if (!customer || !staff || !service) {
      return { success: false, error: 'Related data not found' };
    }

    // Fetch email template
    const template = await db.query.emailTemplates.findFirst({
      where: eq(schema.emailTemplates.name, 'appointment_confirmation'),
    });

    if (!template) {
      return { success: false, error: 'Email template not found' };
    }

    const emailData: AppointmentEmailData = {
      appointmentId: appointment.id,
      customerEmail: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`,
      staffName: staff.displayName,
      serviceName: service.name,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      appointmentNotes: appointment.customerNotes || undefined,
    };

    // Generate ICS file
    const icsContent = generateICS(emailData);

    // Replace template variables
    const subject = template.subject
      .replace('{{serviceName}}', emailData.serviceName)
      .replace('{{date}}', emailData.startTime.toLocaleDateString('de-CH'))
      .replace(
        '{{time}}',
        emailData.startTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      );

    const body = template.bodyHtml
      .replace('{{customerName}}', emailData.customerName)
      .replace('{{serviceName}}', emailData.serviceName)
      .replace('{{staffName}}', emailData.staffName)
      .replace(
        '{{date}}',
        emailData.startTime.toLocaleDateString('de-CH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      )
      .replace(
        '{{time}}',
        emailData.startTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      )
      .replace('{{duration}}', `${service.duration} Minuten`)
      .replace('{{salonName}}', process.env.SITE_NAME || 'Schnittwerk by Vanessa Carosella')
      .replace(
        '{{salonAddress}}',
        process.env.SITE_ADDRESS || 'Rorschacher Str. 152, 9000 St. Gallen'
      )
      .replace('{{salonPhone}}', process.env.SITE_PHONE || '')
      .replace(
        '{{appointmentUrl}}',
        `${process.env.NEXT_PUBLIC_BASE_URL}/appointments/${appointmentId}`
      );

    // Send email via Resend
    const result = await resend.emails.send({
      from: `${process.env.SITE_NAME} <${process.env.SITE_EMAIL || 'noreply@schnittwerk-vanessa.ch'}>`,
      to: emailData.customerEmail,
      subject,
      html: body,
      attachments: [
        {
          filename: 'appointment.ics',
          content: Buffer.from(icsContent),
        },
      ],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending appointment confirmation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send appointment reminder email (24 hours before)
 */
export async function sendAppointmentReminder(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, appointmentId),
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Fetch related records separately
    const customer = await db.query.customers.findFirst({
      where: eq(schema.customers.id, appointment.customerId),
    });

    const staff = await db.query.staff.findFirst({
      where: eq(schema.staff.id, appointment.staffId),
    });

    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, appointment.serviceId),
    });

    if (!customer || !staff || !service) {
      return { success: false, error: 'Related data not found' };
    }

    const template = await db.query.emailTemplates.findFirst({
      where: eq(schema.emailTemplates.name, 'appointment_reminder'),
    });

    if (!template) {
      return { success: false, error: 'Email template not found' };
    }

    const customerName = `${customer.firstName} ${customer.lastName}`;
    const staffName = staff.displayName;

    const subject = template.subject
      .replace('{{serviceName}}', service.name)
      .replace('{{date}}', appointment.startTime.toLocaleDateString('de-CH'))
      .replace(
        '{{time}}',
        appointment.startTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      );

    const body = template.bodyHtml
      .replace('{{customerName}}', customerName)
      .replace('{{serviceName}}', service.name)
      .replace('{{staffName}}', staffName)
      .replace(
        '{{date}}',
        appointment.startTime.toLocaleDateString('de-CH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      )
      .replace(
        '{{time}}',
        appointment.startTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      )
      .replace('{{salonName}}', process.env.SITE_NAME || 'Schnittwerk by Vanessa Carosella')
      .replace(
        '{{salonAddress}}',
        process.env.SITE_ADDRESS || 'Rorschacher Str. 152, 9000 St. Gallen'
      )
      .replace('{{salonPhone}}', process.env.SITE_PHONE || '')
      .replace(
        '{{appointmentUrl}}',
        `${process.env.NEXT_PUBLIC_BASE_URL}/appointments/${appointmentId}`
      );

    const result = await resend.emails.send({
      from: `${process.env.SITE_NAME} <${process.env.SITE_EMAIL || 'noreply@schnittwerk-vanessa.ch'}>`,
      to: customer.email,
      subject,
      html: body,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send cancellation confirmation email
 */
export async function sendCancellationConfirmation(
  appointmentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const appointment = await db.query.appointments.findFirst({
      where: eq(schema.appointments.id, appointmentId),
    });

    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    // Fetch related records separately
    const customer = await db.query.customers.findFirst({
      where: eq(schema.customers.id, appointment.customerId),
    });

    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, appointment.serviceId),
    });

    if (!customer || !service) {
      return { success: false, error: 'Related data not found' };
    }

    const customerName = `${customer.firstName} ${customer.lastName}`;

    const subject = `Stornierung bestätigt: ${service.name}`;
    const body = `
      <h2>Terminabsage bestätigt</h2>
      <p>Hallo ${customerName},</p>
      <p>Ihr Termin wurde erfolgreich storniert:</p>
      <ul>
        <li><strong>Service:</strong> ${service.name}</li>
        <li><strong>Datum:</strong> ${appointment.startTime.toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li><strong>Uhrzeit:</strong> ${appointment.startTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</li>
        ${reason ? `<li><strong>Grund:</strong> ${reason}</li>` : ''}
      </ul>
      <p>Wir freuen uns darauf, Sie bald wieder bei uns begrüssen zu dürfen.</p>
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit freundlichen Grüssen,<br/>
      ${process.env.SITE_NAME || 'Schnittwerk by Vanessa Carosella'}</p>
      <hr/>
      <p style="font-size: 12px; color: #666;">
        ${process.env.SITE_ADDRESS || 'Rorschacher Str. 152, 9000 St. Gallen'}<br/>
        ${process.env.SITE_PHONE || ''}<br/>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}">${process.env.NEXT_PUBLIC_BASE_URL}</a>
      </p>
    `;

    const result = await resend.emails.send({
      from: `${process.env.SITE_NAME} <${process.env.SITE_EMAIL || 'noreply@schnittwerk-vanessa.ch'}>`,
      to: customer.email,
      subject,
      html: body,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending cancellation confirmation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
