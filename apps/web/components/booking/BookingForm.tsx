'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';

const BUSINESS_TIMEZONE = 'Europe/Zurich';
const currencyFormatter = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
});

export type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

export type StaffOption = {
  id: string;
  name: string;
  colorHex: string | null;
  serviceIds: string[];
};

type AvailabilitySlot = {
  staffId: string;
  start: string;
  end: string;
  durationMinutes: number;
};

type BookingFormProps = {
  services: ServiceOption[];
  staff: StaffOption[];
};

type FormState = 'idle' | 'loading' | 'submitting' | 'success' | 'error';

type ConfirmationState = {
  appointmentId: string;
  start: string;
  end: string;
  serviceName: string;
  staffName: string;
};

const today = DateTime.now().setZone(BUSINESS_TIMEZONE).toISODate();

export function BookingForm({ services, staff }: BookingFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id ?? '');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(today ?? '');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string>('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  const staffForService = useMemo(() => {
    return staff.filter((member) => member.serviceIds.includes(selectedServiceId));
  }, [staff, selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId || !staffForService.length) {
      setSelectedStaffId('');
      return;
    }

    if (!staffForService.some((member) => member.id === selectedStaffId)) {
      setSelectedStaffId(staffForService[0]?.id ?? '');
    }
  }, [selectedServiceId, staffForService, selectedStaffId]);

  useEffect(() => {
    if (!selectedServiceId || !selectedStaffId || !selectedDate) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();

    async function fetchAvailability() {
      setFormState((state) => (state === 'submitting' ? state : 'loading'));
      setErrorMessage(null);
      try {
        const dayStart = DateTime.fromISO(selectedDate, {
          zone: BUSINESS_TIMEZONE,
        }).startOf('day');
        const from = dayStart.toISO();
        const to = dayStart.plus({ days: 1 }).toISO();

        const response = await fetch(
          `/api/booking/availability?serviceId=${selectedServiceId}&staffId=${selectedStaffId}&from=${encodeURIComponent(
            from ?? '',
          )}&to=${encodeURIComponent(to ?? '')}`,
          {
            method: 'GET',
            headers: {
              'X-Request-Id': crypto.randomUUID(),
            },
            signal: controller.signal,
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error('Verfügbarkeit konnte nicht geladen werden');
        }

        const data = await response.json();
        const staffAvailability = (data.staff as { staffId: string; slots: AvailabilitySlot[] }[]).find(
          (entry) => entry.staffId === selectedStaffId,
        );
        setSlots(staffAvailability?.slots ?? []);
        setSelectedSlotStart('');
        setFormState((state) => (state === 'submitting' ? state : 'idle'));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setErrorMessage('Die freien Termine konnten nicht geladen werden. Bitte versuche es erneut.');
        setSlots([]);
        setFormState('error');
      }
    }

    fetchAvailability();

    return () => controller.abort();
  }, [selectedServiceId, selectedStaffId, selectedDate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedServiceId || !selectedStaffId || !selectedSlotStart) {
      setErrorMessage('Bitte wähle Service, Teammitglied und Zeitpunkt aus.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      idempotencyKey,
      serviceId: selectedServiceId,
      staffId: selectedStaffId,
      start: selectedSlotStart,
      locale: typeof navigator !== 'undefined' ? navigator.language : 'de-CH',
      notes: formData.get('notes')?.toString() || undefined,
      customer: {
        firstName: formData.get('firstName')?.toString() ?? '',
        lastName: formData.get('lastName')?.toString() ?? '',
        email: formData.get('email')?.toString() ?? '',
        phone: formData.get('phone')?.toString() || undefined,
        marketingOptIn: formData.get('marketingOptIn') === 'on',
        notes: formData.get('customerNotes')?.toString() || undefined,
      },
    };

    if (!payload.customer.firstName || !payload.customer.lastName || !payload.customer.email) {
      setErrorMessage('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setFormState('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/booking/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Termin konnte nicht gespeichert werden');
      }

      setConfirmation({
        appointmentId: data.appointmentId as string,
        start: data.start as string,
        end: data.end as string,
        serviceName: data.serviceName as string,
        staffName: data.staffName as string,
      });
      setFormState('success');
      setSelectedSlotStart('');
      setIdempotencyKey(crypto.randomUUID());
      if (formRef.current) {
        formRef.current.reset();
      }
    } catch (error) {
      console.error(error);
      setFormState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Der Termin konnte nicht gespeichert werden. Bitte versuche es erneut.',
      );
    }
  }

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const slotOptions = slots.map((slot) => ({
    value: slot.start,
    label: DateTime.fromISO(slot.start, { zone: BUSINESS_TIMEZONE }).toFormat('dd.LL.yyyy HH:mm'),
  }));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
      <form className="space-y-8" ref={formRef} onSubmit={handleSubmit}>
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-slate-900">Service wählen</legend>
          <select
            aria-label="Service"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base"
            value={selectedServiceId}
            onChange={(event) => {
              setSelectedServiceId(event.target.value);
              setConfirmation(null);
            }}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          {selectedService ? (
            <p className="text-sm text-slate-600">
              {selectedService.description}
              <br />
              Dauer: {selectedService.durationMinutes} Minuten · Preis:{' '}
              {currencyFormatter.format(selectedService.priceCents / 100)}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-slate-900">Teammitglied</legend>
          <select
            aria-label="Teammitglied"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base"
            disabled={!staffForService.length}
            value={selectedStaffId}
            onChange={(event) => {
              setSelectedStaffId(event.target.value);
              setConfirmation(null);
            }}
          >
            {staffForService.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {!staffForService.length ? (
            <p className="text-sm text-slate-600">Für diesen Service steht derzeit kein Teammitglied zur Onlinebuchung bereit.</p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-slate-900">Wunschtermin</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-slate-700">
              Datum
              <input
                className="mt-1 rounded-xl border border-slate-300 p-3"
                min={today ?? undefined}
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setConfirmation(null);
                }}
              />
            </label>
            <label className="flex flex-col text-sm text-slate-700">
              Uhrzeit
              <select
                className="mt-1 rounded-xl border border-slate-300 p-3"
                disabled={!slotOptions.length}
                value={selectedSlotStart}
                onChange={(event) => setSelectedSlotStart(event.target.value)}
              >
                <option value="">Bitte wählen</option>
                {slotOptions.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!slotOptions.length && selectedServiceId && selectedStaffId ? (
            <p className="text-sm text-slate-600">
              Für dieses Datum sind aktuell keine freien Slots verfügbar. Bitte wähle ein anderes Datum oder Teammitglied.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-slate-900">Kontaktdaten</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-slate-700">
              Vorname*
              <input className="mt-1 rounded-xl border border-slate-300 p-3" name="firstName" required type="text" />
            </label>
            <label className="flex flex-col text-sm text-slate-700">
              Nachname*
              <input className="mt-1 rounded-xl border border-slate-300 p-3" name="lastName" required type="text" />
            </label>
            <label className="flex flex-col text-sm text-slate-700">
              E-Mail*
              <input className="mt-1 rounded-xl border border-slate-300 p-3" name="email" required type="email" />
            </label>
            <label className="flex flex-col text-sm text-slate-700">
              Telefon
              <input className="mt-1 rounded-xl border border-slate-300 p-3" name="phone" type="tel" />
            </label>
          </div>
          <label className="flex flex-col text-sm text-slate-700">
            Hinweise für das Team
            <textarea className="mt-1 rounded-xl border border-slate-300 p-3" name="notes" rows={3} />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input className="mt-1" name="marketingOptIn" type="checkbox" />
            <span>
              Ich möchte Styling-News und exklusive Angebote per E-Mail erhalten. Du bekommst eine Bestätigungs-Mail zur
              Aktivierung (Double Opt-In).
            </span>
          </label>
          <label className="flex flex-col text-sm text-slate-700">
            Nachricht für Newsletter-Team
            <textarea className="mt-1 rounded-xl border border-slate-300 p-3" name="customerNotes" rows={2} />
          </label>
        </fieldset>

        {errorMessage ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {confirmation ? (
          <div aria-live="polite" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
            <p className="font-semibold">Termin bestätigt!</p>
            <p>
              {confirmation.serviceName} bei {confirmation.staffName} am{' '}
              {DateTime.fromISO(confirmation.start, { zone: BUSINESS_TIMEZONE }).setLocale('de-CH').toFormat(
                'cccc, dd. LLLL yyyy HH:mm',
              )}
              . Du erhältst gleich eine E-Mail inklusive Kalenderanhang.
            </p>
          </div>
        ) : null}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Mit * markierte Felder sind Pflichtfelder.</p>
            <button
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={formState === 'loading' || formState === 'submitting'}
            type="submit"
            >
              {formState === 'submitting' ? 'Termin wird gespeichert …' : 'Termin verbindlich buchen'}
            </button>
          </div>
      </form>
    </div>
  );
}

export default BookingForm;
