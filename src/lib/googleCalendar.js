const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API_BASE = "https://www.googleapis.com/calendar/v3";

let tokenClient = null;
let scriptReadyPromise = null;

function waitForGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptReadyPromise) return scriptReadyPromise;
  scriptReadyPromise = new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - start > 10000) return reject(new Error("Google Identity Services não carregou. Recarregue a página."));
      setTimeout(check, 100);
    };
    check();
  });
  return scriptReadyPromise;
}

export async function requestGoogleToken(clientId) {
  await waitForGoogleScript();
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: () => {},
    });
  }
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) reject(new Error(resp.error_description || resp.error));
      else resolve(resp.access_token);
    };
    tokenClient.error_callback = (err) => reject(new Error(err?.message || "Falha ao autenticar com o Google."));
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function googleFetch(token, path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message || "Erro " + res.status);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listCalendars(token) {
  const data = await googleFetch(token, "/users/me/calendarList");
  return data.items || [];
}

export async function listEvents(token, calendarId, timeMinISO, timeMaxISO) {
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = await googleFetch(token, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  return data.items || [];
}

export async function createEvent(token, calendarId, evento) {
  return googleFetch(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(evento),
  });
}

export async function updateEvent(token, calendarId, eventId, evento) {
  return googleFetch(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(evento),
  });
}

export async function deleteEvent(token, calendarId, eventId) {
  return googleFetch(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formToGoogleEvent({ titulo, data, horaInicio, horaFim, local, descricao }) {
  const tz = getLocalTimeZone();
  return {
    summary: titulo || "(Sem título)",
    location: local || undefined,
    description: descricao || undefined,
    start: { dateTime: `${data}T${horaInicio}:00`, timeZone: tz },
    end: { dateTime: `${data}T${horaFim}:00`, timeZone: tz },
  };
}

export function googleEventToForm(ev) {
  const startIso = ev.start?.dateTime || ev.start?.date || "";
  const endIso = ev.end?.dateTime || ev.end?.date || "";
  const [dataStart, horaStartFull] = startIso.split("T");
  const [, horaEndFull] = endIso.split("T");
  return {
    id: ev.id,
    titulo: ev.summary || "",
    data: dataStart || "",
    horaInicio: horaStartFull ? horaStartFull.slice(0, 5) : "09:00",
    horaFim: horaEndFull ? horaEndFull.slice(0, 5) : "10:00",
    local: ev.location || "",
    descricao: ev.description || "",
    allDay: !ev.start?.dateTime,
  };
}
