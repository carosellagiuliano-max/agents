import { createEvent } from 'ics';
import { DateTime } from 'luxon';

import { getResendClient } from '../../../../lib/resend';
import { BUSINESS_TIMEZONE } from './time';

type AppointmentEmailContext = {
  appointmentId: string;
  serviceName: string;
  staffName: string;
  start: DateTime;
  end: DateTime;
  customerName: string;
  customerEmail: string;
  locale: string;
  location?: string;
};

function buildConfirmationSubject(context: AppointmentEmailContext): string {
  return context.locale.startsWith('de')
    ? `Terminbestätigung: ${context.serviceName}`
    : `Appointment confirmed: ${context.serviceName}`;
}

function buildConfirmationBody(context: AppointmentEmailContext): {
  text: string;
  html: string;
} {
  const startFormatted = context.start
    .setZone(BUSINESS_TIMEZONE)
    .setLocale(context.locale)
    .toFormat('cccc, dd. LLLL yyyy HH:mm');
  const staffLine = context.locale.startsWith('de')
    ? `Stylist: ${context.staffName}`
    : `Stylist: ${context.staffName}`;
  const locationLine = context.location
    ? context.locale.startsWith('de')
      ? `Ort: ${context.location}`
      : `Location: ${context.location}`
    : '';

  const greeting = context.locale.startsWith('de') ? 'Liebe Kundin, lieber Kunde' : 'Dear guest';
  const closing = context.locale.startsWith('de')
    ? 'Bis bald im Schnittwerk!'
    : 'We look forward to seeing you!';

  const textLines = [
    greeting,
    '',
    context.locale.startsWith('de')
      ? `Wir bestätigen deinen Termin für ${context.serviceName}.`
      : `We confirm your appointment for ${context.serviceName}.`,
    `Wann: ${startFormatted}`,
    staffLine,
    locationLine,
    '',
    closing,
  ].filter(Boolean);

  const text = textLines.join('\n');
  const html = textLines
    .map((line) => (line ? `<p>${line}</p>` : '<p>&nbsp;</p>'))
    .join('');

  return { text, html };
}

export function buildAppointmentIcs(context: AppointmentEmailContext): string {
  const startUtc = context.start.toUTC();
  const endUtc = context.end.toUTC();
  const { error, value } = createEvent({
    productId: 'schnittwerk/booking',
    uid: `schnittwerk-${context.appointmentId}`,
    title: context.locale.startsWith('de')
      ? `Termin: ${context.serviceName}`
      : `Appointment: ${context.serviceName}`,
    description: context.locale.startsWith('de')
      ? `Termin mit ${context.staffName}`
      : `Appointment with ${context.staffName}`,
    location: context.location,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: {
      name: 'Schnittwerk by Vanessa Carosella',
      email: process.env.SITE_EMAIL || 'termin@schnittwerk.dev',
    },
    start: [
      startUtc.year,
      startUtc.month,
      startUtc.day,
      startUtc.hour,
      startUtc.minute,
    ],
    end: [
      endUtc.year,
      endUtc.month,
      endUtc.day,
      endUtc.hour,
      endUtc.minute,
    ],
    startInputType: 'utc',
    startOutputType: 'utc',
    endInputType: 'utc',
    endOutputType: 'utc',
    calName: 'Schnittwerk Termine',
  });

  if (error || !value) {
    throw error ?? new Error('Failed to generate ICS payload');
  }

  return value;
}

export async function sendAppointmentConfirmationEmail(
  context: AppointmentEmailContext,
): Promise<void> {
  const resend = getResendClient();
  const { text, html } = buildConfirmationBody(context);
  const subject = buildConfirmationSubject(context);
  const ics = buildAppointmentIcs(context);

  if (!resend) {
    console.info('[booking-email] Resend API key not configured. Skipping send.');
    return;
  }

  await resend.emails.send({
    from: `Schnittwerk <${process.env.SITE_EMAIL || 'termin@schnittwerk.dev'}>`,
    to: context.customerEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `termin-${context.appointmentId}.ics`,
        content: Buffer.from(ics, 'utf8').toString('base64'),
        content_type: 'text/calendar',
      },
    ],
  });
}
