/* ==========================================================================
   Propuesta · Ecosistema Digital Mariana Echeverri
   ========================================================================== */

// Ajustes editables de la propuesta
const CONFIG = {
  preparedBy: "Michelle Pedraza",
  // Número de WhatsApp para confirmar la aprobación: código de país + número, solo dígitos (ej. "13055551234").
  // Vacío = WhatsApp abre el mensaje listo para elegir el contacto.
  whatsapp: "",
  // Último día de vigencia (AAAA-MM-DD)
  validUntil: "2026-10-28",
  total: 2500,
  deposit: 1250,
  monthly: 150,
  // Registro de eventos en Supabase (tabla me_propuesta_eventos: solo inserción, sin lectura pública).
  supabaseUrl: "https://opagblruzwsrxsggkjsa.supabase.co",
  supabaseKey: "sb_publishable_O30dPx3jfAA3m2CUnw7nCQ_jsuZiwRj",
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* almacenamiento no disponible */
    }
  },
  json(key, fallback) {
    try {
      return JSON.parse(this.get(key)) ?? fallback;
    } catch (e) {
      return fallback;
    }
  },
  session(key, value) {
    try {
      if (value === undefined) return window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
    return null;
  },
};

// Crea elementos con texto seguro (nunca interpreta lo que escribe la persona como HTML)
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else node.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : String(child));
  });
  return node;
}

const icon = (id, size = 16) =>
  el("span", { html: `<svg class="i" width="${size}" height="${size}"><use href="#${id}" /></svg>` }).firstChild;

/* ---------- Estado compartido entre los tres actos ---------- */

const state = {
  perfil: storage.json("me-perfil", null),
  chat: storage.json("me-chat", []),
  lotoProbada: storage.get("me-loto") === "1",
};

function guardar() {
  storage.set("me-perfil", JSON.stringify(state.perfil));
  storage.set("me-chat", JSON.stringify(state.chat));
}

const mensajesVisibles = () => state.chat.filter((m) => !(m.role === "user" && m.content === "__inicio__"));

const iniciales = (nombre = "") =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "TÚ";

function haceCuanto(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!iso || Number.isNaN(min) || min < 2) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : "hace días";
}

function temperatura(perfil) {
  return ["loneva", "consulta", "peps"].includes(perfil.clave) ? "Alta" : "Media-alta";
}

function siguientePaso(perfil) {
  const pasos = {
    consulta: "Enviarle tu Calendly para su consulta 1:1.",
    loneva: "Invitarla a tu app y presentarle la membresía.",
    peps: "Compartirle tu protocolo y tu link de Portal Health para su valoración médica.",
    porciones: "Enviarle la Guía anti-dieta extrema y ofrecerle una consulta para su plan.",
    dietas: "Enviarle la Guía anti-dieta extrema y presentarle LONÉVA.",
  };
  return pasos[perfil.clave] || "Enviarle la Guía anti-dieta extrema y ofrecerle una consulta.";
}

/* ---------- Registro de eventos (Supabase) ---------- */

const sesion = (() => {
  let id = storage.get("me-sesion");
  if (!id) {
    id =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
    storage.set("me-sesion", id);
  }
  return id;
})();

function track(evento, datos = {}) {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey || location.protocol !== "https:") return;
  try {
    fetch(`${CONFIG.supabaseUrl}/rest/v1/me_propuesta_eventos`, {
      method: "POST",
      keepalive: true,
      headers: { apikey: CONFIG.supabaseKey, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ sesion, evento, datos }),
    }).catch(() => {});
  } catch (e) {
    /* el registro nunca interrumpe la experiencia */
  }
}

/* ---------- Datos dinámicos ---------- */

function bindConfig() {
  const date = new Date(CONFIG.validUntil + "T12:00:00Z");
  const text = date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  $$('[data-bind="validUntilText"]').forEach((node) => (node.textContent = text));
  $$('[data-bind="preparedBy"]').forEach((node) => (node.textContent = CONFIG.preparedBy));
  const today = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  $$("[data-today]").forEach((node) => (node.textContent = today.charAt(0).toUpperCase() + today.slice(1)));
}

let toastTimer;
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("is-in");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("is-in"), 3800);
}

/* ---------- Sonido ---------- */

function setSound(on) {
  const btn = $("#soundToggle");
  if (on && !Sound.enable()) {
    toast("Tu navegador no permite reproducir sonido.");
    return;
  }
  if (!on) Sound.disable();
  btn.classList.toggle("is-on", on);
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-label", on ? "Apagar sonido" : "Activar sonido");
}

/* ---------- Portal ---------- */

function initPortal() {
  const portal = $("#portal");
  if (!storage.session("me-abierta")) {
    storage.session("me-abierta", "1");
    track("apertura", { referencia: document.referrer.slice(0, 200), pantalla: `${innerWidth}x${innerHeight}` });
  }
  if (storage.session("me-portal")) {
    portal.classList.add("is-gone");
    document.body.classList.remove("is-locked");
    return;
  }
  $$("[data-enter]", portal).forEach((btn) =>
    btn.addEventListener("click", () => {
      if (btn.dataset.enter === "sound") {
        setSound(true);
        setTimeout(() => Sound.bloom(), 300);
      }
      portal.classList.add("is-leaving");
      document.body.classList.remove("is-locked");
      storage.session("me-portal", "1");
      setTimeout(() => portal.classList.add("is-gone"), 1900);
    }),
  );
}

/* ---------- Scroll, navegación y apariciones ---------- */

function initScroll() {
  const progress = $("#progress");
  const links = $$(".nav a");
  const targets = links.map((a) => $(a.getAttribute("href")));
  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    let active = -1;
    targets.forEach((t, i) => {
      if (t && t.getBoundingClientRect().top < innerHeight * 0.4) active = i;
    });
    links.forEach((a, i) => a.classList.toggle("is-active", i === active));
    ticking = false;
  };

  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  update();
}

function initReveal() {
  const items = $$("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((node) => node.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  items.forEach((node) => observer.observe(node));
}

function initCountUp() {
  $$("[data-count]").forEach((node) => {
    const target = Number(node.dataset.count);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (reduceMotion) return;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / 1800);
          node.textContent = Math.round(target * (1 - Math.pow(1 - t, 4))).toLocaleString("en-US");
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
  });
}

/* ---------- Acto I · escenas completadas ---------- */

function actualizarEscenas() {
  $("#scene1").classList.toggle("is-done", Boolean(state.perfil));
  $("#scene2").classList.toggle(
    "is-done",
    mensajesVisibles().some((m) => m.role === "user"),
  );
  $("#scene3").classList.toggle("is-done", state.lotoProbada);
}

function actualizarTodo() {
  actualizarEscenas();
  actualizarLoto();
  actualizarRaiz();
}

/* ---------- Primer Loto (beige → blanco) ---------- */

function initRitual() {
  const ritual = $("#ritual");
  const COLORS = ["#EAD8C6", "#F0E2D5", "#F5EBE2", "#F9F2EC", "#FCF8F4", "#FFFFFF"];
  const steps = $$(".r-step", ritual);
  const dots = $$("#ritualDots i");
  const petals = $$(".ritual-lotus .petal", ritual);
  const nameInput = $("#rName");
  const draft = {};
  let current = 0;
  let lastFocus = null;

  const go = (n) => {
    current = n;
    steps.forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === n));
    ritual.style.backgroundColor = COLORS[n];
    dots.forEach((d, i) => {
      d.classList.toggle("is-done", i < n - 1 || n === 5);
      d.classList.toggle("is-current", i === n - 1 && n < 5);
    });
    petals.forEach((p, i) => p.classList.toggle("is-filled", i < n || n === 5));
    $$('[data-r="name"]', ritual).forEach((node) => (node.textContent = draft.nombre || ""));
    ritual.scrollTop = 0;
    if (n === 1) setTimeout(() => nameInput.focus(), 350);
  };

  const reset = () => {
    Object.keys(draft).forEach((k) => delete draft[k]);
    nameInput.value = "";
    $$(".r-opt", ritual).forEach((o) => o.classList.remove("is-selected"));
    go(0);
  };

  const open = () => {
    lastFocus = document.activeElement;
    ritual.classList.add("is-open");
    ritual.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    reset();
    Sound.tap();
    setTimeout(() => $("[data-r-next]", ritual).focus(), 400);
  };

  const close = () => {
    ritual.classList.remove("is-open");
    ritual.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  const finish = () => {
    state.perfil = { ...draft, en: new Date().toISOString() };
    state.chat = [];
    guardar();
    const summary = $("#rSummary");
    summary.replaceChildren(
      ...[
        ["Te trae", draft.intencionTexto],
        ["Quieres sentir", draft.sentirTexto],
        ["Prefieres seguir por", draft.canalTexto],
      ].map(([a, b]) => el("div", {}, el("span", {}, a), el("span", {}, b))),
    );
    track("primer_loto", {
      nombre: draft.nombre,
      intencion: draft.intencionTexto,
      sentir: draft.sentirTexto,
      canal: draft.canalTexto,
    });
    actualizarTodo();
    renderChat();
  };

  $$("[data-ritual]").forEach((b) => b.addEventListener("click", open));
  $$("[data-ritual-close]", ritual).forEach((b) => b.addEventListener("click", close));

  $("[data-r-next]", ritual).addEventListener("click", () => {
    Sound.chime(0);
    go(1);
  });

  const submitName = () => {
    const value = nameInput.value.trim().replace(/\s+/g, " ");
    if (value.length < 2) {
      nameInput.focus();
      nameInput.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 320 },
      );
      return;
    }
    draft.nombre = value.charAt(0).toUpperCase() + value.slice(1);
    Sound.chime(1);
    go(2);
  };
  $("[data-r-name]", ritual).addEventListener("click", submitName);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitName();
  });

  const keys = {
    intent: ["intencion", "intencionTexto"],
    feel: ["sentir", "sentirTexto"],
    channel: ["canal", "canalTexto"],
  };
  $$("[data-r-group]", ritual).forEach((group) => {
    const [phraseKey, labelKey] = keys[group.dataset.rGroup];
    $$(".r-opt", group).forEach((opt) =>
      opt.addEventListener("click", () => {
        $$(".r-opt", group).forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        draft[phraseKey] = opt.dataset.phrase;
        draft[labelKey] = opt.firstChild.textContent.trim();
        if (opt.dataset.focus) draft.enfoque = opt.dataset.focus;
        if (opt.dataset.key) draft.clave = opt.dataset.key;
        const next = current + 1;
        if (next === 5) {
          finish();
          Sound.bloom();
        } else {
          Sound.chime(next);
        }
        setTimeout(() => go(next), 480);
      }),
    );
  });

  $$("[data-r-back]", ritual).forEach((b) => b.addEventListener("click", () => go(Math.max(0, current - 1))));
  $("[data-r-restart]", ritual).addEventListener("click", reset);
  $("[data-r-chat]", ritual).addEventListener("click", () => {
    close();
    $("#escena-2").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    setTimeout(saludarTrasBienvenida, 700);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ritual.classList.contains("is-open")) close();
  });
}

/* ---------- Escena 2 · asistente con IA ---------- */

const LIMITE_MENSAJES = 20;
let iaDisponible = null;
let enviando = false;

function setChatMode(live) {
  const pill = $("#chatMode");
  pill.textContent = live ? "IA en vivo" : "Modo demostración";
  pill.classList.toggle("live", live);
}

async function detectarIA() {
  try {
    const res = await fetch("api/chat", { method: "GET" });
    iaDisponible = res.ok ? Boolean((await res.json()).disponible) : false;
  } catch (e) {
    iaDisponible = false;
  }
  setChatMode(iaDisponible);
}

function saludoBase() {
  const p = state.perfil;
  return p
    ? `Hola, ${p.nombre} 🌿 Soy el asistente digital de Mariana. ¿En qué te puedo acompañar?`
    : "Hola 🌿 Soy el asistente digital de Mariana. Puedo contarte sobre LONÉVA, su membresía, las consultas 1:1 o su trabajo con Portal Health. ¿Qué te gustaría hacer posible?";
}

function addBubble(who, text, animate = true) {
  const body = $("#chatBody");
  const bubble = el("div", { class: who === "me" ? "bubble me" : "bubble" }, text);
  if (!animate) bubble.style.animation = "none";
  body.append(bubble);
  body.scrollTop = body.scrollHeight;
  return bubble;
}

function renderChat() {
  const body = $("#chatBody");
  body.replaceChildren();
  const visibles = mensajesVisibles();
  if (!visibles.length) addBubble("ai", saludoBase(), false);
  visibles.forEach((m) => addBubble(m.role === "user" ? "me" : "ai", m.content, false));
}

const PORTAL_HEALTH = "https://portalhealth.ai/login?ref=52C184EF";

const CIERRE_POR_CLAVE = {
  dietas:
    "Mariana trabaja justo eso: sin dietas extremas ni culpa, con estructura del plato y porciones que puedas sostener. ¿Te comparto su Guía anti-dieta extrema gratis o prefieres conocer LONÉVA?",
  porciones:
    "Eso es lo que más le preguntan a Mariana: qué comer y en qué porciones. ¿Te comparto su Guía anti-dieta extrema gratis o prefieres una consulta 1:1 para un plan a tu medida?",
  loneva:
    "¡Felicidades por terminar LONÉVA! 🎉 Lo que sigue vive en la app de Mariana: su membresía, con las cápsulas completas de sueño, estrés y antojos, recetario de postres saludables y retos cada mes. ¿Te cuento cómo entrar?",
  consulta:
    "La consulta 1:1 es el mejor punto de partida para un plan a tu medida. ¿Te comparto el link para reservarla en la agenda de Mariana?",
  peps: "Mariana trabaja con Portal Health: ella te explica su protocolo y la clínica hace tu valoración médica. ¿Te comparto los pasos para empezar?",
};

function respuestaLocal(texto) {
  const p = state.perfil;
  const nombre = p ? p.nombre : "";
  if (texto === "__inicio__" && p) {
    const cierre = CIERRE_POR_CLAVE[p.clave] || CIERRE_POR_CLAVE.dietas;
    return `Hola, ${p.nombre} 🌿 Soy el asistente digital de Mariana. Vi que ${p.intencion} y que en 30 días te gustaría ${p.sentir}. ${cierre}`;
  }
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const reglas = [
    [
      /dosis|cuanto me (inyecto|aplico)|cual (peptido|me sirve)|diagnost|embaraz|lactan|enfermedad|medicament|sintoma|pastilla/,
      "Eso lo debe valorar un profesional de salud: en el caso de los péptidos, el equipo médico de Portal Health, y en lo demás, una consulta 1:1 con Mariana. Yo no doy dosis ni diagnósticos. ¿Te ayudo con alguno de los dos caminos? 🌿",
    ],
    [
      /pept|peps|portal health/,
      `Mariana trabaja con Portal Health AI 🤍 Ella te enseña su protocolo y cómo los péptidos pueden potenciar tus hábitos; la valoración médica, la compra y el acompañamiento los hace la clínica. Puedes empezar tu valoración aquí: ${PORTAL_HEALTH}`,
    ],
    [
      /termine|gradu|que sigue|despues de loneva|membresia/,
      "¡Qué orgullo que llegaste hasta aquí! 🎉 Después de LONÉVA empieza lo tuyo en la app de Mariana: su membresía con cápsulas completas de sueño y recuperación, estrés y antojos, suplementación y piel, entrenamiento y ciclo menstrual, la guía de nutrición completa, recetario de postres saludables y retos cada mes. ¿Te aviso apenas abra tu acceso?",
    ],
    [
      /loneva|longevidad/,
      "LONÉVA es el programa insignia de Mariana: 8 semanas, $299, creado con Déjà Vu y Luis Esteban Pérez Franco. Incluye 40 sesiones de entrenamiento con niveles y Plan B, nutrición básica (estructura del plato, proteína primero, porciones), audios de rescate para antojos, reto de 21 días sin azúcar y tu Índice LONÉVA al inicio y al final. ¿Te cuento cuándo arranca la próxima cohorte?",
    ],
    [
      /guia|gratis|descarg/,
      "¡Claro! La Guía anti-dieta extrema de Mariana es gratis 🌿 Déjame tu correo o tu WhatsApp y te la envío ahora mismo.",
    ],
    [
      /precio|cuanto|cuesta|costo|valor|pagar|pago/,
      "LONÉVA cuesta $299 por 8 semanas. Las consultas 1:1 y los planes personalizados tienen su propio valor según lo que necesites: te lo confirma Mariana al reservar. ¿Qué te interesa más?",
    ],
    [
      /consulta|agend|cita|horario|1:1|reserv/,
      "¡Con gusto! Puedes reservar tu consulta de nutrición 1:1 directo en la agenda de Mariana y elegir el horario que te quede mejor. ¿Te comparto el link?",
    ],
    [
      /eres (una )?ia|robot|humano|persona real|hablar con (ella|mariana)/,
      "Soy el asistente digital de Mariana: funciono con inteligencia artificial y ella revisa cada caso. Si prefieres hablar directamente con ella, le aviso para que te escriba. 🤍",
    ],
    [
      /quien es|mariana|credencial|enfermer|coach/,
      "Mariana vive en Orlando, Florida. Tiene formación en enfermería, es coach de psicología de la nutrición y personal trainer, y trabaja en Déjà Vu. Su lema: la longevidad empieza en la mente. 🌿",
    ],
    [
      /antojo|azucar|dulce|ansiedad/,
      "Los antojos son el corazón del método de Mariana: no es fuerza de voluntad, es entender qué los dispara. En LONÉVA tienes audios de rescate para esos momentos y un reto de 21 días sin azúcar. ¿Quieres que te cuente más?",
    ],
    [/^(hola|buen|hey|que tal)/, `¡Hola${nombre ? ", " + nombre : ""}! 🌿 ¿En qué te puedo acompañar hoy?`],
    [/gracias/, "Con mucho gusto. Aquí estoy cuando quieras seguir. 🌿"],
  ];
  for (const [regla, respuesta] of reglas) if (regla.test(t)) return respuesta;
  return `Gracias por contarme${nombre ? ", " + nombre : ""}. Para orientarte mejor: ¿te interesa LONÉVA, una consulta 1:1, la Guía anti-dieta extrema o conocer cómo trabaja Mariana con Portal Health?`;
}

async function pedirRespuesta() {
  enviando = true;
  $("#chatForm button").disabled = true;
  const body = $("#chatBody");
  const typing = el("div", { class: "typing" }, el("i"), el("i"), el("i"));
  body.append(typing);
  body.scrollTop = body.scrollHeight;

  const ultimo = state.chat[state.chat.length - 1].content;
  let texto = "";
  let envivo = false;
  if (iaDisponible !== false) {
    try {
      const p = state.perfil;
      const res = await fetch("api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajes: state.chat,
          perfil: p
            ? { nombre: p.nombre, intencion: p.intencionTexto, sentir: p.sentirTexto, canal: p.canalTexto }
            : {},
        }),
      });
      if (res.ok) {
        texto = (await res.json()).respuesta || "";
        envivo = Boolean(texto);
      } else if (res.status === 503) {
        iaDisponible = false;
        setChatMode(false);
      }
    } catch (e) {
      /* sin conexión con el asistente: se usa la respuesta de demostración */
    }
  }
  if (!texto) {
    await wait(900 + Math.random() * 700);
    texto = respuestaLocal(ultimo);
  }

  typing.remove();
  state.chat.push({ role: "assistant", content: texto });
  guardar();
  addBubble("ai", texto);
  Sound.tap();
  enviando = false;
  $("#chatForm button").disabled = false;
  track("chat", { pregunta: ultimo.slice(0, 300), respuesta: texto.slice(0, 500), envivo });
  actualizarTodo();
}

async function enviarMensaje(texto) {
  const limpio = texto.trim().slice(0, 600);
  if (!limpio || enviando) return;
  if (state.chat.length >= LIMITE_MENSAJES - 1) {
    addBubble(
      "ai",
      "Llegamos al límite de esta conversación de prueba. En tu web real, aquí Mariana podría continuar personalmente. 🌿",
    );
    return;
  }
  state.chat.push({ role: "user", content: limpio });
  guardar();
  addBubble("me", limpio);
  $("#chatInput").value = "";
  await pedirRespuesta();
}

function saludarTrasBienvenida() {
  if (!state.perfil || mensajesVisibles().length || enviando) return;
  state.chat = [{ role: "user", content: "__inicio__" }];
  renderChat();
  pedirRespuesta();
  setTimeout(() => $("#chatInput").focus({ preventScroll: true }), 400);
}

function initChat() {
  renderChat();
  detectarIA();
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    enviarMensaje($("#chatInput").value);
  });
  $$("#chatQuick button").forEach((b) => b.addEventListener("click", () => enviarMensaje(b.textContent)));
}

/* ---------- Escena 3 · Loto ---------- */

function actualizarLoto() {
  const p = state.perfil;
  const nombre = p ? p.nombre.split(" ")[0] : "";
  const enfoque = p && p.enfoque ? p.enfoque : "Constancia.";
  $("#lotoHi").textContent = p ? `Buenos días, ${nombre}.` : "Buenos días.";
  $("#lotoAvatar").textContent = p ? iniciales(p.nombre) : "ME";
  $("#lotoFocus").textContent = enfoque;
  $("#notif1").textContent =
    `Buenos días${p ? ", " + nombre : ""} ☀️ Tu enfoque de hoy: ${enfoque.replace(/\.$/, "").toLowerCase()}.`;
  const base =
    "La llamamos Loto. Se instala desde tu web, con login: su programa, su plan de nutrición, sus rutinas, su check-in diario de sueño, agua, ánimo y movimiento, sus insignias, la comunidad privada y el contenido que se desbloquea cada semana.";
  $("#lotoLead").textContent = p
    ? `${base} Mira: ya te saluda por tu nombre y con lo que elegiste en tu Primer Loto.`
    : `${base} Abre tu Primer Loto y mira cómo te saluda con lo que respondiste.`;
}

function marcarLotoProbada() {
  state.lotoProbada = true;
  storage.set("me-loto", "1");
  actualizarTodo();
}

function initLoto() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isStandalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let deferredPrompt = null;

  const tabs = $$(".install-tab");
  const selectTab = (key) => {
    tabs.forEach((t) => {
      const on = t.dataset.install === key;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
    $$(".install-panel").forEach((p) => p.classList.toggle("is-active", p.id === "install-" + key));
  };
  tabs.forEach((t) => t.addEventListener("click", () => selectTab(t.dataset.install)));
  selectTab(isIOS ? "ios" : isAndroid ? "android" : "desktop");

  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  addEventListener("appinstalled", () => {
    toast("¡Listo! La propuesta ya vive en tu pantalla de inicio.");
    track("instalacion", { resultado: "instalada" });
    marcarLotoProbada();
  });

  $("#installBtn").addEventListener("click", async () => {
    if (isStandalone) {
      toast("Ya la estás usando como app ✓");
      marcarLotoProbada();
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }
    selectTab(isIOS ? "ios" : isAndroid ? "android" : "desktop");
    toast(
      isIOS
        ? "En Safari: toca Compartir y luego “Agregar a pantalla de inicio”."
        : "Usa la opción “Instalar app” de tu navegador.",
    );
    track("instalacion", {
      resultado: "instrucciones",
      plataforma: isIOS ? "ios" : isAndroid ? "android" : "escritorio",
    });
  });

  $("#notifyBtn").addEventListener("click", async () => {
    if (!("Notification" in window)) {
      toast(
        isIOS
          ? "En iPhone, primero instala la app y ábrela desde tu inicio."
          : "Tu navegador no permite notificaciones.",
      );
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast("Las notificaciones están bloqueadas. Puedes activarlas en los ajustes del navegador.");
      return;
    }
    const p = state.perfil;
    const title = "Loto";
    const options = {
      body: `Buenos días${p ? ", " + p.nombre.split(" ")[0] : ""} ☀️ Tu enfoque de hoy: ${(p && p.enfoque ? p.enfoque : "constancia.").toLowerCase()} A tu ritmo.`,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: "loto-demo",
    };
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) await reg.showNotification(title, options);
      else new Notification(title, options);
      toast("Notificación enviada. Así llegarán a tus clientes.");
      Sound.chime(2);
      track("notificacion", { resultado: "enviada" });
      marcarLotoProbada();
    } catch (e) {
      toast("No pudimos mostrar la notificación en este navegador.");
    }
  });

  const notifs = $$("#notifStack .notif");
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      notifs.forEach((n, i) => setTimeout(() => n.classList.add("is-in"), 400 + i * 900));
    },
    { threshold: 0.4 },
  );
  observer.observe($("#notifStack"));

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ---------- Acto II · Raíz ---------- */

const CONTACTOS = [
  {
    id: "carolina",
    nombre: "Carolina Mejía",
    origen: "Graduada de LONÉVA",
    cuando: "hace 12 min",
    flag: ["ia", "IA atendiendo"],
    resumen: "Quiere seguir en tu membresía",
    datos: [
      ["Le trae", "Terminó LONÉVA · cohorte 3"],
      ["Quiere sentir", "Menos antojos"],
      ["Prefiere", "WhatsApp"],
      ["Temperatura", "Alta"],
    ],
    paso: "Invitarla a tu app y presentarle la membresía: su Índice LONÉVA subió de 44 a 78.",
    historia: [
      ["Se graduó de LONÉVA en Déjà Vu", "Viernes"],
      ["Recibió tu invitación automática a la app", "Sábado · 7:00"],
      ["Preguntó por la membresía", "Hoy · 9:20"],
    ],
    chat: [
      ["user", "¡Terminé LONÉVA! ¿Qué sigue ahora?"],
      [
        "assistant",
        "¡Felicidades, Carolina! 🎉 Lo que sigue vive en la app de Mariana: su membresía, con las cápsulas completas de estrés y antojos, recetario de postres saludables y retos cada mes. ¿Te cuento cómo entrar?",
      ],
      ["user", "Sí, ¿y los antojos de la noche se trabajan ahí?"],
    ],
  },
  {
    id: "manuela",
    nombre: "Manuela Cardona",
    origen: "Guía gratuita",
    cuando: "hace 25 min",
    flag: ["human", "Te necesita"],
    resumen: "Pidió hablar contigo",
    datos: [
      ["Le trae", "Saber qué comer y en qué porciones"],
      ["Quiere sentir", "Paz con la comida"],
      ["Prefiere", "WhatsApp"],
      ["Temperatura", "Alta"],
    ],
    paso: "Escribirle personalmente y enviarle tu Calendly para una consulta 1:1.",
    historia: [
      ["Descargó tu Guía anti-dieta extrema", "Hoy · 8:47"],
      ["Conversó con tu asistente", "Hoy · 8:50"],
      ["Pidió hablar con Mariana", "Hoy · 8:58"],
    ],
    chat: [
      ["user", "Leí tu guía y me encantó. ¿Puedo hablar contigo directamente?"],
      [
        "assistant",
        "¡Gracias, Manuela! 🤍 Ya le avisé a Mariana y te escribirá personalmente. Mientras tanto, ¿me cuentas qué te gustaría trabajar?",
      ],
      ["user", "Tengo rutina, pero no sé qué comer ni en qué porciones. Estoy cansada de las dietas."],
    ],
  },
  {
    id: "andrea",
    nombre: "Andrea Salazar",
    origen: "Sección PEPS",
    cuando: "ayer",
    flag: ["ia", "Derivada"],
    resumen: "Péptidos · derivada a Portal Health",
    datos: [
      ["Le trae", "Conocer los péptidos con respaldo médico"],
      ["Quiere sentir", "Recomponer su cuerpo"],
      ["Prefiere", "Correo"],
      ["Temperatura", "Alta"],
    ],
    paso: "Darle seguimiento a su valoración en Portal Health e invitarla a LONÉVA.",
    historia: [
      ["Vio tu serie de videos sobre tu protocolo", "Ayer · 18:05"],
      ["Preguntó cómo funcionan los péptidos contigo", "Ayer · 18:07"],
      ["Abrió tu link de Portal Health", "Ayer · 18:10"],
    ],
    chat: [
      ["user", "¿Cómo funcionan los péptidos contigo?"],
      [
        "assistant",
        "Mariana trabaja con Portal Health AI 🤍 Ella te enseña su protocolo y cómo los péptidos pueden potenciar tus hábitos; la valoración médica y la compra las hace la clínica. ¿Te comparto el link para empezar tu valoración?",
      ],
      ["user", "Sí, por favor."],
      ["assistant", "Aquí lo tienes, Andrea. Cuando tengas tu valoración, Mariana te acompaña con los hábitos ✨"],
    ],
  },
];

function contactoTu() {
  const p = state.perfil;
  if (!p) return null;
  const visibles = mensajesVisibles();
  const preguntas = visibles.filter((m) => m.role === "user").length;
  const historia = [
    ["Te encontró en Instagram (@mar.echeverri)", "Origen"],
    ["Abrió su Primer Loto", haceCuanto(p.en)],
    [`Eligió: ${p.intencionTexto}`, "Primer Loto"],
  ];
  if (preguntas)
    historia.push([`Conversó con tu asistente · ${preguntas} ${preguntas === 1 ? "mensaje" : "mensajes"}`, "Hoy"]);
  if (state.lotoProbada) historia.push(["Probó Loto en su celular", "Hoy"]);
  return {
    id: "tu",
    tu: true,
    nombre: p.nombre,
    origen: "Instagram → Primer Loto",
    cuando: haceCuanto(p.en),
    flag: ["now", "Ahora"],
    resumen: p.intencionTexto,
    datos: [
      ["Le trae", p.intencionTexto],
      ["Quiere sentir", p.sentirTexto],
      ["Prefiere", p.canalTexto],
      ["Temperatura", temperatura(p)],
    ],
    paso: siguientePaso(p),
    historia,
    chat: visibles.map((m) => [m.role, m.content]),
  };
}

function transcript(chat, vacio) {
  const box = el("div", { class: "transcript" });
  if (!chat.length) box.append(el("div", { class: "empty" }, vacio));
  chat.forEach(([role, content]) =>
    box.append(el("div", { class: role === "user" ? "bubble me" : "bubble ai" }, content)),
  );
  return box;
}

function tarjetaPerfil(c) {
  const box = el("div", { class: "profile" });
  box.append(
    el(
      "div",
      { class: "profile-top" },
      el("span", { class: "av-s" }, iniciales(c.nombre)),
      el("div", {}, el("strong", {}, c.nombre), el("small", {}, `Llegó desde ${c.origen} · ${c.cuando}`)),
    ),
    el(
      "div",
      { class: "facts-grid" },
      c.datos.map(([k, v]) => el("div", { class: "fact-box" }, el("small", {}, k), el("span", {}, v))),
    ),
    el(
      "div",
      { class: "next-step" },
      icon("i-spark", 18),
      el("div", {}, el("strong", {}, "Siguiente paso sugerido por la IA"), c.paso),
    ),
    el("p", { class: "section-label" }, "El hilo de su historia"),
    el(
      "ul",
      { class: "timeline" },
      c.historia.map(([t, s]) => el("li", {}, t, el("small", {}, s))),
    ),
    el("p", { class: "section-label" }, "Su conversación con tu asistente"),
    transcript(
      c.chat,
      "Todavía no conversa con tu asistente. Vuelve a la escena 2 del Acto I y escríbele: aparecerá aquí.",
    ),
  );
  return box;
}

function tarjetaVacia() {
  const box = el(
    "div",
    { class: "empty-you" },
    el("span", { "aria-hidden": "true", html: '<svg viewBox="0 0 120 100" width="70"><use href="#lotus" /></svg>' }),
    el("strong", {}, "Aquí aparecerás tú."),
    el(
      "span",
      {},
      "Abre tu Primer Loto en el Acto I y vuelve: te verás entrar como contacto nuevo, con todo lo que respondiste y conversaste.",
    ),
    el("button", { class: "btn btn-cafe btn-sm", type: "button" }, "Abrir mi Primer Loto"),
  );
  $("button", box).addEventListener("click", () => $("[data-ritual]").click());
  return box;
}

let contactoActivo = "tu";
let conversacionActiva = "tu";

function botonContacto(c, activo, alElegir) {
  const btn = el(
    "button",
    { class: `contact${c.tu ? " you" : ""}${activo ? " is-active" : ""}`, type: "button" },
    el("span", { class: "av-s" }, iniciales(c.nombre)),
    el(
      "span",
      { class: "who" },
      el("strong", {}, c.nombre, el("span", { class: `flag ${c.flag[0]}` }, c.flag[1])),
      el("small", {}, `${c.origen} · ${c.resumen}`),
    ),
  );
  btn.addEventListener("click", () => {
    alElegir(c.id);
    Sound.tap();
  });
  return btn;
}

function actualizarRaiz() {
  const tu = contactoTu();
  const todos = tu ? [tu, ...CONTACTOS] : CONTACTOS;

  // Hoy
  $("#newCount").textContent = String(todos.length);
  $("#kpiNew").textContent = String(todos.length);
  $("#kpiNewNote").textContent = tu ? `${tu.nombre}, ${tu.cuando}` : "Desde Instagram y tu guía";
  $("#taskYou").hidden = !tu;
  if (tu) {
    $("#taskYouTitle").textContent = `Responder a ${tu.nombre}`;
    $("#taskYouNote").textContent = `${tu.resumen} · llegó por Primer Loto`;
  }

  // Contactos
  const lista = $("#contactList");
  lista.replaceChildren(
    ...todos.map((c) =>
      botonContacto(c, c.id === contactoActivo, (id) => {
        contactoActivo = id;
        actualizarRaiz();
      }),
    ),
  );
  const elegido = todos.find((c) => c.id === contactoActivo);
  $("#profile").replaceChildren(elegido ? tarjetaPerfil(elegido) : tarjetaVacia());

  // Conversaciones
  const conChat = todos.filter((c) => c.chat.length);
  if (!conChat.some((c) => c.id === conversacionActiva)) conversacionActiva = conChat[0].id;
  $("#convoList").replaceChildren(
    ...conChat.map((c) =>
      botonContacto(c, c.id === conversacionActiva, (id) => {
        conversacionActiva = id;
        actualizarRaiz();
      }),
    ),
  );
  const conv = conChat.find((c) => c.id === conversacionActiva);
  const acciones = el(
    "div",
    { class: "chips", style: "margin-top: 14px" },
    el(
      "button",
      {
        class: "btn btn-cafe btn-sm",
        type: "button",
        "data-msg": "Tomaste la conversación. Tu asistente queda en pausa con esta persona.",
      },
      "Tomar la conversación",
    ),
    el(
      "button",
      { class: "btn btn-line btn-sm", type: "button", "data-msg": "La conversación queda en manos de tu asistente." },
      "Dejar a la IA",
    ),
  );
  $$("button", acciones).forEach((b) => b.addEventListener("click", () => toast(b.dataset.msg)));
  $("#convoView").replaceChildren(
    el(
      "div",
      { class: "profile-top" },
      el("span", { class: "av-s" }, iniciales(conv.nombre)),
      el("div", {}, el("strong", {}, conv.nombre), el("small", {}, `${conv.origen} · ${conv.cuando}`)),
    ),
    transcript(conv.chat, ""),
    acciones,
  );
}

function initRaiz() {
  const tabs = $$(".raiz-tab");
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      $$(".raiz-main .panel").forEach((p) => p.classList.toggle("is-active", p.id === tab.dataset.panel));
      Sound.tap();
    }),
  );

  // Editor de página
  const preview = $("#preview");
  $("#titleInput").addEventListener("input", (e) => {
    $("#pvTitle").textContent = e.target.value.trim() || "Tu titular aquí";
  });
  $$("#swatches .swatch").forEach((s) =>
    s.addEventListener("click", () => {
      $$("#swatches .swatch").forEach((x) => x.classList.toggle("is-active", x === s));
      preview.style.setProperty("--pv-accent", s.dataset.color);
      Sound.tap();
    }),
  );
  $$("[data-module]").forEach((input) =>
    input.addEventListener("change", () => {
      $(`[data-block="${input.dataset.module}"]`, preview).hidden = !input.checked;
      Sound.tap();
    }),
  );
  $("#logoInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    $("#pvLogo").src = URL.createObjectURL(file);
    toast("Logo actualizado en la vista previa.");
  });

  // Señales de marketing
  const segs = $$("#segChips .seg");
  const whens = $$("#whenChips .seg");
  const channels = $$("#channels input");
  const msg = $("#sigMsg");

  const updateSignal = () => {
    const on = segs.filter((s) => s.classList.contains("is-on"));
    const all = on.some((s) => "all" in s.dataset);
    // Los grupos se solapan: el más grande cuenta completo y el resto aporta una parte
    const sizes = on.map((s) => Number(s.dataset.n));
    const largest = sizes.length ? Math.max(...sizes) : 0;
    const rest = sizes.reduce((sum, n) => sum + n, 0) - largest;
    const reach = all ? 31 : Math.min(31, largest + Math.round(rest * 0.4));
    const chosen = channels.filter((c) => c.checked).map((c) => c.value);
    const reachEl = $("#reach");
    if (!reach || !chosen.length) {
      reachEl.textContent = "Elige al menos un grupo y un canal.";
    } else {
      const list = chosen.length > 1 ? chosen.slice(0, -1).join(", ") + " y " + chosen.slice(-1) : chosen[0];
      const push = chosen.includes("push") ? ` · ${Math.round(reach * 0.78)} con notificaciones activas` : "";
      reachEl.replaceChildren("Llegará a ", el("strong", {}, `${reach} personas`), ` por ${list}${push}`);
    }
    $("#sigPreview").textContent = msg.value.trim() || "Tu mensaje aparecerá aquí.";
    const now = whens.find((w) => w.classList.contains("is-on")).dataset.when === "now";
    const d = new Date();
    // "Lunes 7:00" es el próximo lunes
    if (!now) d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    $("#lockTime").textContent = now ? d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" }) : "7:00";
    $("#lockDate").textContent = d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
    return { reach, chosen, now };
  };

  segs.forEach((s) =>
    s.addEventListener("click", () => {
      if ("all" in s.dataset) {
        const turnOn = !s.classList.contains("is-on");
        segs.forEach((x) => x.classList.toggle("is-on", turnOn && x === s));
      } else {
        segs.forEach((x) => "all" in x.dataset && x.classList.remove("is-on"));
        s.classList.toggle("is-on");
      }
      Sound.tap();
      updateSignal();
    }),
  );
  whens.forEach((w) =>
    w.addEventListener("click", () => {
      whens.forEach((x) => x.classList.toggle("is-on", x === w));
      Sound.tap();
      updateSignal();
    }),
  );
  channels.forEach((c) => c.addEventListener("change", updateSignal));
  msg.addEventListener("input", updateSignal);
  $("#sigSend").addEventListener("click", () => {
    const { reach, chosen, now } = updateSignal();
    if (!reach || !chosen.length) return;
    Sound.chime(3);
    toast(
      now
        ? `Señal enviada a ${reach} personas (vista previa).`
        : `Señal programada para el lunes 7:00 · ${reach} personas.`,
    );
  });
  updateSignal();

  $$("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));
  actualizarRaiz();
}

/* ---------- Acto III · calculadora ---------- */

function initCalc() {
  const inputs = { grads: $("#cGrads"), conv: $("#cConv"), price: $("#cPrice"), months: $("#cMonths") };
  let trackTimer;

  const update = (registrar) => {
    Object.values(inputs).forEach((input) => {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty("--fill", `${pct}%`);
    });
    const grads = Number(inputs.grads.value);
    const conv = Number(inputs.conv.value);
    const price = Number(inputs.price.value);
    const months = Number(inputs.months.value);

    $("#oGrads").textContent = grads;
    $("#oConv").textContent = `${conv}%`;
    $("#oPrice").textContent = money(price);
    $("#oMonths").textContent = months;

    // Cada cohorte suma miembros nuevos; su valor es lo que pagan durante los meses que se quedan
    const miembros = Math.round(grads * (conv / 100));
    const mrr = miembros * price;
    const cohorte = mrr * months;
    $("#rMrr").textContent = money(mrr);
    $("#rMembers").textContent =
      `${miembros} ${miembros === 1 ? "clienta nueva" : "clientas nuevas"} en tu membresía cada mes, solo con tus graduadas de LONÉVA.`;
    $("#rCohort").textContent = money(cohorte);

    const max = Math.max(mrr, CONFIG.monthly);
    $("#barMrr").style.width = `${(mrr / max) * 100}%`;
    $("#barCost").style.width = `${(CONFIG.monthly / max) * 100}%`;

    const necesarias = Math.ceil(CONFIG.monthly / price);
    $("#rPayback").textContent =
      `Con ${necesarias} ${necesarias === 1 ? "clienta activa" : "clientas activas"} en tu membresía, la mensualidad se paga sola.`;

    if (registrar) {
      clearTimeout(trackTimer);
      trackTimer = setTimeout(
        () => track("calculadora", { graduadas: grads, conversion: conv, precio: price, meses: months, mrr, cohorte }),
        2500,
      );
    }
  };

  Object.values(inputs).forEach((input) => input.addEventListener("input", () => update(true)));
  update(false);
}

/* ---------- Inversión ---------- */

function initInvestment() {
  $$(".inv-row").forEach((row) => {
    const btn = $(".inv-btn", row);
    btn.addEventListener("click", () => {
      const open = row.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      Sound.tap();
    });
  });
}

/* ---------- Aprobación ---------- */

const PLANS = {
  contado: { label: "Pago de contado", today: CONFIG.total, delivery: "Entrega total en 4 horas" },
  abono: { label: "Abono del 50%", today: CONFIG.deposit, delivery: "Inicio en 8 h · entrega estimada en 2 días" },
};

function petals() {
  if (reduceMotion) return;
  const layer = el("div", { class: "petals" });
  for (let i = 0; i < 34; i++) {
    const p = el("i");
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 4 + Math.random() * 4 + "s";
    p.style.animationDelay = Math.random() * 1.4 + "s";
    p.style.setProperty("--x", Math.round(Math.random() * 240 - 120) + "px");
    p.style.setProperty("--r", Math.round(Math.random() * 540 - 270) + "deg");
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 10000);
}

function initApproval() {
  const modal = $("#approveModal");
  const aprobacion = { plan: null };
  let lastFocus = null;

  const step = (n) =>
    $$(".m-step", modal).forEach((s) => s.classList.toggle("is-active", Number(s.dataset.mstep) === n));

  const choose = (plan) => {
    aprobacion.plan = plan;
    $$(".pay-opt", modal).forEach((o) => o.classList.toggle("is-selected", o.dataset.plan === plan));
    $("#mNext").disabled = !plan;
  };

  const whatsappLink = (name) => {
    const plan = PLANS[aprobacion.plan];
    const text =
      `Hola, soy ${name}. Apruebo la propuesta del Ecosistema Digital Mariana Echeverri · Nutrición & Longevidad ` +
      `con la modalidad "${plan.label}" (${money(plan.today)} USD para iniciar). ` +
      `Quedo pendiente de los datos de pago y del arranque.`;
    return `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  };

  const renderSummary = () => {
    const plan = PLANS[aprobacion.plan];
    $("#mSummary").replaceChildren(
      ...[
        ["Modalidad", plan.label],
        ["Para iniciar", money(plan.today) + " USD"],
        ["Entrega", plan.delivery],
        ["Revisión", "Reunión total con correcciones en vivo"],
        ["Continuidad & IA", money(CONFIG.monthly) + " / mes desde la publicación"],
      ].map(([a, b]) => el("div", { class: "sum-row" }, el("span", {}, a), el("span", {}, b))),
    );
  };

  const showSuccess = (name) => {
    $("#mHello").textContent = name.split(" ")[0] || "Mariana";
    $("#mWhats").href = whatsappLink(name);
    step(3);
  };

  const open = (plan) => {
    lastFocus = document.activeElement;
    const saved = storage.json("me-aprobacion", null);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    if (saved && !plan) {
      aprobacion.plan = saved.plan;
      showSuccess(saved.name);
    } else {
      choose(plan || aprobacion.plan);
      step(1);
    }
    Sound.tap();
    setTimeout(() => $(".modal-close", modal).focus(), 300);
  };

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  $$("[data-approve]").forEach((b) => b.addEventListener("click", () => open(b.dataset.approve || null)));
  $$("[data-modal-close]", modal).forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });

  $$(".pay-opt", modal).forEach((o) =>
    o.addEventListener("click", () => {
      choose(o.dataset.plan);
      Sound.tap();
    }),
  );
  $("#mNext").addEventListener("click", () => {
    if (!aprobacion.plan) return;
    renderSummary();
    step(2);
    Sound.chime(1);
  });
  $("[data-mback]", modal).addEventListener("click", () => step(1));

  const accept = $("#mAccept");
  const nameInput = $("#mName");
  const approveBtn = $("#mApprove");
  const validate = () => (approveBtn.disabled = !(accept.checked && nameInput.value.trim().length > 1));
  accept.addEventListener("change", validate);
  nameInput.addEventListener("input", validate);

  approveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    storage.set("me-aprobacion", JSON.stringify({ plan: aprobacion.plan, name, at: new Date().toISOString() }));
    document.body.classList.add("is-approved");
    track("aprobacion", { plan: aprobacion.plan, nombre: name.slice(0, 80) });
    showSuccess(name);
    Sound.bloom();
    petals();
  });

  if (storage.get("me-aprobacion")) document.body.classList.add("is-approved");
}

/* ---------- PDF ---------- */

function initPrint() {
  $$("[data-print]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-reveal]").forEach((node) => node.classList.add("is-visible"));
      $$(".inv-row").forEach((row) => row.classList.add("is-open"));
      print();
    }),
  );
}

/* ---------- Inicio ---------- */

bindConfig();
$("#soundToggle").addEventListener("click", () => setSound(!Sound.enabled));
initPortal();
initScroll();
initReveal();
initCountUp();
initRitual();
initChat();
initLoto();
initRaiz();
initCalc();
initInvestment();
initApproval();
initPrint();
actualizarTodo();
