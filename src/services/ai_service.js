import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getFullTripData } from './trip_service.js';

const travelerCodes = ['ADM', 'ID', 'LS', 'MB', 'JB', 'PB'];
const defaultModel = 'gemini-2.5-flash-lite';

const tripChatSchema = z.object({
  traveler: z.enum(travelerCodes).default('ADM'),
  question: z.string().trim().min(1).max(1200),
  allowWebSearch: z.boolean().default(false)
});

export async function askTripAssistant (payload) {
  const request = tripChatSchema.parse(payload);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY no configurada');
    error.status = 500;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || defaultModel;
  const context = compactTripContext(await getFullTripData(), request.traveler);
  const prompt = buildPrompt(request.question, context);
  const systemInstruction = buildSystemInstruction(request.allowWebSearch);

  try {
    return {
      answer: await generateAnswer(ai, model, systemInstruction, prompt, request.allowWebSearch),
      usedWebSearch: request.allowWebSearch
    };
  } catch (error) {
    if (!request.allowWebSearch) throw error;

    return {
      answer: `No pude usar busqueda web en esta consulta; respondo solo con el itinerario.\n\n${await generateAnswer(ai, model, systemInstruction, prompt, false)}`,
      usedWebSearch: false
    };
  }
}

async function generateAnswer (ai, model, systemInstruction, prompt, allowWebSearch) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      maxOutputTokens: 1600,
      ...(allowWebSearch ? { tools: [{ googleSearch: {} }] } : {})
    }
  });

  const answer = response.text?.trim();
  if (!answer) {
    const error = new Error('Gemini no devolvio respuesta');
    error.status = 502;
    throw error;
  }

  return answer;
}

function buildSystemInstruction (allowWebSearch) {
  return [
    'Sos un asistente del viaje Europa 2026.',
    'Responde en español claro, practico y breve, como asesor de viaje.',
    'El itinerario provisto es la fuente principal.',
    'No inventes reservas, horarios, precios, codigos ni direcciones.',
    'Si falta parte de la informacion, no respondas solo que no podes: usa el contexto disponible para dar una respuesta parcial util.',
    'Diferencia hechos del itinerario de estimaciones o recomendaciones.',
    'Para preguntas de factibilidad como "me da tiempo", "conviene" o "llego", estima usando duraciones, notas, orden del dia, traslados implicitos y sentido comun, aclarando supuestos.',
    'Si un dato puntual no esta en el contexto ni puede verificarse, deci especificamente que ese dato no esta cargado o confirmado.',
    'Cuando corresponda, cita dia, fecha y actividad.',
    'No edites datos ni propongas cambios al JSON salvo que el usuario lo pida explicitamente como idea.',
    allowWebSearch
      ? 'La busqueda web esta permitida para completar informacion publica actual como horarios, clima, transporte, atracciones o restaurantes. El itinerario siempre tiene prioridad sobre internet.'
      : 'No uses informacion externa: responde unicamente con el contexto del itinerario. Si la pregunta mejoraria con horarios o datos actuales, sugeri activar "buscar en internet" al final.'
  ].join('\n');
}

function buildPrompt (question, context) {
  return `Contexto del viaje:\n${JSON.stringify(context)}\n\nPregunta del usuario:\n${question}\n\nFormato sugerido si aplica:\n- Respuesta corta.\n- Motivo basado en el itinerario.\n- Recomendacion practica o advertencia.`;
}

function compactTripContext (tripData, traveler) {
  const visibleDays = (tripData.itinerary || [])
    .filter(day => isVisibleForTraveler(day.visibleFor, traveler))
    .map(compactDay);

  const cityIds = new Set(visibleDays.map(day => day.cityId).filter(Boolean));
  const cities = Object.fromEntries(
    Object.entries(tripData.cities || {})
      .filter(([cityId]) => cityIds.has(cityId))
      .map(([cityId, city]) => [cityId, compactObject({
        name: city.name,
        accommodation: city.accommodation && compactObject({
          name: city.accommodation.name,
          address: city.accommodation.address,
          checkIn: city.accommodation.checkIn,
          checkOut: city.accommodation.checkOut,
          bookingLink: city.accommodation.bookingLink,
          mapsLink: city.accommodation.mapsLink,
          pax: city.accommodation.pax,
          notes: city.accommodation.notes
        })
      })])
  );

  return compactObject({
    traveler,
    days: visibleDays,
    cities,
    todos: (tripData.todos || [])
      .filter(todo => isVisibleForTraveler(todo.visibleFor, traveler))
      .map(todo => compactObject({
        id: todo.id,
        text: todo.text,
        dueDate: todo.dueDate,
        status: todo.status,
        notes: todo.notes
      }))
  });
}

function compactDay (day) {
  return compactObject({
    id: day.id,
    date: day.date,
    route: day.route,
    summary: day.summary,
    sleepsIn: day.sleepsIn,
    cityId: day.cityId,
    pax: day.pax,
    visibleFor: day.visibleFor,
    links: compactLinks(day.links),
    activities: (day.activities || []).map(compactActivity)
  });
}

function compactActivity (activity) {
  return compactObject({
    id: activity.id,
    title: activity.title,
    date: activity.date,
    type: activity.type,
    transport: activity.transport,
    location: activity.location,
    description: activity.description,
    mapsLink: activity.mapsLink,
    image: activity.image,
    notes: activity.notes,
    links: compactLinks(activity.links),
    logistics: compactObject(activity.logistics || {}),
    todos: (activity.todos || []).map(todo => compactObject({
      id: todo.id,
      text: todo.text,
      dueDate: todo.dueDate,
      status: todo.status,
      doneNote: todo.doneNote,
      doneAt: todo.doneAt
    }))
  });
}

function compactLinks (links) {
  return (links || []).map(link => compactObject({
    title: link.title,
    url: link.url,
    type: link.type
  }));
}

function isVisibleForTraveler (visibleFor, traveler) {
  if (traveler === 'ADM') return true;
  if (!Array.isArray(visibleFor) || visibleFor.length === 0) return true;
  return visibleFor.includes(traveler);
}

function compactObject (value) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => {
        if (item === undefined || item === null || item === '') return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (isPlainObject(item) && Object.keys(item).length === 0) return false;
        return true;
      })
  );
}

function isPlainObject (value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
