import { createHmac, timingSafeEqual } from 'node:crypto';

const DATA_SOURCE = '41d538ec-d7b0-81ad-bbaa-000b48f20635';
export const config = { path: '/api/cal-webhook', method: 'POST' };

const STATUS = {
  BOOKING_CREATED: 'Réservé',
  BOOKING_REQUESTED: 'Demandé',
  BOOKING_RESCHEDULED: 'Replanifié',
  BOOKING_CANCELLED: 'Annulé',
  BOOKING_REJECTED: 'Refusé',
  MEETING_STARTED: 'En cours',
  MEETING_ENDED: 'Terminé'
};

const PAYMENT = {
  BOOKING_PAYMENT_INITIATED: 'Initié',
  BOOKING_PAID: 'Payé'
};

const FOLLOW_UP = {
  BOOKING_REQUESTED: 'Examiner la demande',
  BOOKING_PAID: 'Préparer la prestation',
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW: 'Vérifier la présence et proposer un nouveau créneau si nécessaire',
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW: 'Vérifier la présence de l’hôte',
  RECORDING_READY: 'Vérifier si le replay doit être partagé',
  RECORDING_TRANSCRIPTION_GENERATED: 'Préparer le compte rendu'
};

const BOOKING_UPDATES = new Set([
  ...Object.keys(STATUS), ...Object.keys(PAYMENT), ...Object.keys(FOLLOW_UP),
  'BOOKING_NO_SHOW_UPDATED', 'BOOKING_LOCATION_UPDATED', 'BOOKING_TITLE_UPDATED',
  'BOOKING_REASSIGNED', 'BOOKING_SEAT_ACCEPTED', 'BOOKING_SEAT_REJECTED'
]);

const text = value => [{ type: 'text', text: { content: value.slice(0, 1900) } }];
const rich = value => ({ rich_text: text(value) });
const date = value => ({ date: { start: new Date(value).toISOString() } });
const select = name => ({ select: { name } });
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const id = value => typeof value === 'string' && value ? value : null;

async function notion(token, path, method, body) {
  const response = await fetch('https://api.notion.com/v1/' + path, {
    method,
    headers: {
      authorization: 'Bearer ' + token,
      'notion-version': '2025-09-03',
      'content-type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) throw new Error('Notion HTTP ' + response.status);
  return response.json();
}

function validSignature(body, signature, secret) {
  if (!/^[a-f0-9]{64}$/i.test(signature ?? '')) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

function meetingFollowUp(label) {
  if (/audit/i.test(label)) return 'Préparer le compte rendu d’audit';
  if (/découverte|discovery/i.test(label)) return 'Examiner le besoin et préparer un devis si pertinent';
  return 'Consigner les prochaines actions et préparer le suivi';
}

export default async function handler(request) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const secret = process.env.CAL_WEBHOOK_SECRET;
  const token = process.env.NOTION_API_TOKEN;
  if (!secret || !token) return Response.json({ error: 'Webhook configuration incomplete' }, { status: 503 });

  const body = Buffer.from(await request.arrayBuffer());
  if (!validSignature(body, request.headers.get('x-cal-signature-256'), secret)) {
    return new Response(null, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body.toString('utf8'));
  } catch {
    return new Response(null, { status: 400 });
  }

  const trigger = event?.triggerEvent;
  const payload = event?.payload ?? {};
  const booking = payload.booking ?? payload;
  const uid = id(booking.uid) ?? id(payload.bookingUid);
  const previousUid = trigger === 'BOOKING_RESCHEDULED'
    ? id(booking.rescheduleUid) ?? id(payload.rescheduleUid)
    : null;

  try {
    if (trigger === 'PING' || trigger === 'PING_TEST') {
      await notion(token, 'data_sources/' + DATA_SOURCE, 'GET');
      return Response.json({ ok: true, notion: 'reachable' });
    }
    if (!BOOKING_UPDATES.has(trigger) || (!uid && !previousUid)) {
      return Response.json({ ok: true, ignored: true });
    }

    const conditions = [...new Set([uid, previousUid].filter(Boolean))].map(key => ({
      property: 'Identifiant Cal.com', rich_text: { equals: key }
    }));
    const { results } = await notion(token, 'data_sources/' + DATA_SOURCE + '/query', 'POST', {
      filter: conditions.length === 1 ? conditions[0] : { or: conditions },
      page_size: 2
    });

    const page = results.find(result =>
      result.properties['Identifiant Cal.com']?.rich_text?.[0]?.plain_text === uid
    ) ?? results[0];
    const existing = page?.properties ?? {};
    const receivedAt = validDate(event.createdAt) ? event.createdAt : new Date().toISOString();
    const lastUpdate = existing['Mis à jour par Cal.com']?.date?.start;
    if (lastUpdate && Date.parse(lastUpdate) > Date.parse(receivedAt)
      && !Object.hasOwn(PAYMENT, trigger)) {
      return Response.json({ ok: true, ignored: true });
    }
    if (lastUpdate && Date.parse(lastUpdate) === Date.parse(receivedAt)
      && existing['Dernier événement Cal.com']?.rich_text?.[0]?.plain_text === trigger) {
      return Response.json({ ok: true, duplicate: true });
    }
    const existingStatus = existing.Statut?.select?.name;
    if (['Annulé', 'Refusé'].includes(existingStatus) &&
      ['MEETING_STARTED', 'MEETING_ENDED'].includes(trigger)) {
      return Response.json({ ok: true, ignored: true });
    }

    const attendee = booking.attendees?.[0];
    const label = booking.eventType?.title ?? booking.type ?? '';
    const title = booking.title ?? booking.eventType?.title ?? label;
    const properties = {};
    if (!lastUpdate || Date.parse(lastUpdate) <= Date.parse(receivedAt)) {
      properties['Dernier événement Cal.com'] = rich(trigger);
      properties['Mis à jour par Cal.com'] = date(receivedAt);
    }
    if (uid && (!page || trigger === 'BOOKING_RESCHEDULED')) properties['Identifiant Cal.com'] = rich(uid);
    if (typeof title === 'string' && title) properties.Dossier = { title: text(title) };
    if (!page && !properties.Dossier) properties.Dossier = { title: text('Rendez-vous Cal.com') };
    if (typeof label === 'string' && label) properties.Prestation = rich(label);
    if (typeof attendee?.name === 'string' && attendee.name) properties.Contact = rich(attendee.name);
    if (typeof attendee?.email === 'string' && attendee.email) properties['E-mail'] = { email: attendee.email };
    if (typeof booking.location === 'string' && booking.location) properties.Lieu = rich(booking.location);
    if (validDate(booking.startTime)) {
      properties['Rendez-vous'] = date(booking.startTime);
      if (validDate(booking.endTime) && Date.parse(booking.endTime) > Date.parse(booking.startTime)) {
        properties['Rendez-vous'].date.end = new Date(booking.endTime).toISOString();
      }
    }
    if (Object.hasOwn(STATUS, trigger)) properties.Statut = select(STATUS[trigger]);
    if (trigger === 'BOOKING_NO_SHOW_UPDATED' && typeof attendee?.noShow === 'boolean') {
      properties.Statut = select(attendee.noShow ? 'Absent' :
        validDate(booking.endTime) && Date.parse(booking.endTime) <= Date.now() ? 'Terminé' : 'Réservé');
    }
    if (Object.hasOwn(PAYMENT, trigger) &&
      (trigger === 'BOOKING_PAID' || existing.Paiement?.select?.name !== 'Payé')) {
      properties.Paiement = select(PAYMENT[trigger]);
    }

    const action = trigger === 'MEETING_ENDED' ? meetingFollowUp(String(label || title || ''))
      : trigger === 'BOOKING_NO_SHOW_UPDATED' && attendee?.noShow === true ? 'Proposer un nouveau créneau'
      : Object.hasOwn(FOLLOW_UP, trigger) ? FOLLOW_UP[trigger] : null;

    if (action && !['Annulé', 'Refusé'].includes(existingStatus)) {
      properties['Prochaine action'] = rich(action);
      properties['Suivi terminé'] = { checkbox: false };
    } else if (['BOOKING_CANCELLED', 'BOOKING_REJECTED'].includes(trigger)) {
      properties['Prochaine action'] = { rich_text: [] };
      properties['Suivi terminé'] = { checkbox: true };
      properties['Échéance'] = { date: null };
    }

    if (page) await notion(token, 'pages/' + page.id, 'PATCH', { properties });
    else await notion(token, 'pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: DATA_SOURCE }, properties
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Cal.com webhook failed:', error.message);
    return Response.json({ error: 'Delivery could not be processed' }, { status: 502 });
  }
}
