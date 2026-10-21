// Asistente digital de Mariana Echeverri: endpoint de chat para la propuesta.
// Requiere la variable de entorno ANTHROPIC_API_KEY en Vercel. Sin ella responde 503
// y la página usa sus respuestas de demostración.
import Anthropic from "@anthropic-ai/sdk";
import { construirSistema, INICIO_TRAS_BIENVENIDA } from "./_conocimiento.js";

const MODELO = "claude-opus-5-5";
const MAX_MENSAJES = 20;
const MAX_CARACTERES = 800;
const RESPUESTA_SEGURA =
  "Ese tema prefiero que lo converses directamente con Mariana en una consulta 1:1. ¿Te ayudo a reservarla? 🌿";

let cliente;
const obtenerCliente = () => (cliente ??= new Anthropic());

function origenPermitido(req) {
  const origen = req.headers.origin;
  if (!origen) return true;
  try {
    return new URL(origen).host === req.headers.host;
  } catch {
    return false;
  }
}

function validarMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length > MAX_MENSAJES) return null;
  const limpios = [];
  for (const m of mensajes) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const contenido = m.content.trim().slice(0, MAX_CARACTERES);
    if (!contenido) return null;
    limpios.push({ role: m.role, content: contenido });
  }
  if (limpios.length && limpios[0].role !== "user") return null;
  if (limpios.length && limpios[limpios.length - 1].role !== "user") return null;
  return limpios;
}

export default async function handler(req, res) {
  // GET solo informa si la IA está conectada, para que la página muestre el modo correcto.
  if (req.method === "GET") return res.status(200).json({ disponible: Boolean(process.env.ANTHROPIC_API_KEY) });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Método no permitido" });
  }
  if (!origenPermitido(req)) return res.status(403).json({ error: "Origen no permitido" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "IA no configurada" });

  const cuerpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const mensajes = validarMensajes(cuerpo.mensajes ?? []);
  if (!mensajes) return res.status(400).json({ error: "Conversación no válida" });

  // "__inicio__" marca el saludo automático tras el Primer Loto.
  const conversacion = mensajes.length
    ? mensajes.map((m) =>
        m.role === "user" && m.content === "__inicio__" ? { ...m, content: INICIO_TRAS_BIENVENIDA } : m,
      )
    : [{ role: "user", content: INICIO_TRAS_BIENVENIDA }];

  try {
    const respuesta = await obtenerCliente().beta.messages.create({
      model: MODELO,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: construirSistema(cuerpo.perfil),
      messages: conversacion,
    });

    let texto =
      respuesta.stop_reason === "refusal"
        ? RESPUESTA_SEGURA
        : respuesta.content
            .filter((bloque) => bloque.type === "text")
            .map((bloque) => bloque.text)
            .join("")
            .trim();

    if (!texto) texto = RESPUESTA_SEGURA;
    return res.status(200).json({ respuesta: texto, envivo: true });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Demasiadas solicitudes, intenta en un momento" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Error de la API de Claude:", error.status, error.message);
      return res.status(502).json({ error: "El asistente no está disponible" });
    }
    console.error("Error inesperado en /api/chat:", error);
    return res.status(500).json({ error: "Error inesperado" });
  }
}
