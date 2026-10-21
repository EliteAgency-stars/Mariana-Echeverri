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
  total: 2150,
  deposit: 1075,
  monthly: 150,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const money = (n) => "$" + n.toLocaleString("en-US");

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

/* ---------- Datos dinámicos ---------- */

function bindConfig() {
  const date = new Date(CONFIG.validUntil + "T12:00:00Z");
  const text = date.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  $$('[data-bind="validUntilText"]').forEach((el) => (el.textContent = text));
  $$('[data-bind="preparedBy"]').forEach((el) => (el.textContent = CONFIG.preparedBy));
  const today = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  $$("[data-today]").forEach((el) => (el.textContent = today.charAt(0).toUpperCase() + today.slice(1)));
}

/* ---------- Toast ---------- */

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-in");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-in"), 3600);
}

/* ---------- Sonido ---------- */

function setSound(on) {
  const btn = $("#soundToggle");
  if (on) {
    const ok = Sound.enable();
    if (!ok) {
      toast("Tu navegador no permite reproducir sonido.");
      return;
    }
  } else {
    Sound.disable();
  }
  btn.classList.toggle("is-on", on);
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-label", on ? "Apagar sonido" : "Activar sonido");
}

function initSound() {
  $("#soundToggle").addEventListener("click", () => setSound(!Sound.enabled));
}

/* ---------- Portal de entrada ---------- */

function initPortal() {
  const portal = $("#portal");
  const close = () => {
    portal.classList.add("is-leaving");
    document.body.classList.remove("is-locked");
    storage.session("me-portal", "1");
    setTimeout(() => portal.classList.add("is-gone"), 2100);
  };

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
      close();
    }),
  );
}

/* ---------- Scroll: progreso, fondo beige → blanco, header ---------- */

function initScroll() {
  const progress = $("#progress");
  const header = $("#header");
  const from = [238, 231, 220];
  const to = [255, 255, 255];
  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.transform = `scaleX(${p})`;
    const eased = 1 - Math.pow(1 - p, 1.6);
    const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * eased));
    document.documentElement.style.setProperty("--page-bg", `rgb(${rgb.join(",")})`);
    header.classList.toggle("is-scrolled", window.scrollY > 10);
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", update);
  update();

  // Navegación activa
  const links = $$(".nav a");
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  sections.forEach((s) => navObserver.observe(s));
}

/* ---------- Apariciones al hacer scroll ---------- */

function initReveal() {
  const items = $$("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  items.forEach((el) => observer.observe(el));
}

function initCountUp() {
  $$("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (reduceMotion) return;
        const start = performance.now();
        const duration = 1800;
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = Math.round(target * eased).toLocaleString("en-US");
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
  });
}

/* ---------- Experiencia inmersiva (beige → blanco) ---------- */

function initRitual() {
  const ritual = $("#ritual");
  const COLORS = ["#E7DFD2", "#ECE5DA", "#F1ECE4", "#F6F3EE", "#FBFAF7", "#FFFFFF"];
  const steps = $$(".r-step", ritual);
  const dots = $$("#ritualDots i");
  const petals = $$(".ritual-lotus .petal", ritual);
  const nameInput = $("#rName");
  const state = { step: 0, name: "", intent: "", feel: "", channel: "" };
  let chatTimers = [];
  let lastFocus = null;

  const go = (n) => {
    state.step = n;
    steps.forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === n));
    ritual.style.backgroundColor = COLORS[n];
    dots.forEach((d, i) => {
      d.classList.toggle("is-done", i < n - 1 || n === 5);
      d.classList.toggle("is-current", i === n - 1 && n < 5);
    });
    petals.forEach((p, i) => p.classList.toggle("is-filled", i < n || n === 5));
    $$('[data-r="name"]', ritual).forEach((el) => (el.textContent = state.name));
    ritual.scrollTop = 0;
    if (n === 1) setTimeout(() => nameInput.focus(), 350);
    if (n === 5) runChat();
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
    chatTimers.forEach(clearTimeout);
    if (lastFocus) lastFocus.focus();
  };

  const reset = () => {
    Object.assign(state, { name: "", intent: "", feel: "", channel: "" });
    nameInput.value = "";
    $$(".r-opt", ritual).forEach((o) => o.classList.remove("is-selected"));
    chatTimers.forEach(clearTimeout);
    go(0);
  };

  const runChat = () => {
    const chat = $("#rChat");
    const replies = $("#rReplies");
    chat.innerHTML = "";
    replies.classList.remove("is-in");
    chatTimers.forEach(clearTimeout);
    chatTimers = [];

    const channelLine =
      state.channel === "aquí"
        ? "Seguimos aquí mismo, cuando quieras."
        : `Si prefieres, también te escribo por ${state.channel}.`;
    const messages = [
      `Hola, ${state.name} 🌿 Soy el asistente digital de Mariana.`,
      `Vi que ${state.intent} y que en 30 días te gustaría ${state.feel}. Mariana acompaña justo eso: alimentación, movimiento y hábitos para tu vida real.`,
      `¿Te muestro el programa ideal para ti o prefieres agendar una consulta con Mariana? ${channelLine}`,
    ];

    let delay = 500;
    messages.forEach((text) => {
      chatTimers.push(
        setTimeout(() => {
          const typing = document.createElement("div");
          typing.className = "typing";
          typing.innerHTML = "<i></i><i></i><i></i>";
          chat.appendChild(typing);
        }, delay),
      );
      delay += 1100;
      chatTimers.push(
        setTimeout(() => {
          const typing = $(".typing", chat);
          if (typing) typing.remove();
          const bubble = document.createElement("div");
          bubble.className = "bubble";
          bubble.textContent = text;
          chat.appendChild(bubble);
          requestAnimationFrame(() => bubble.classList.add("is-in"));
          Sound.tap();
        }, delay),
      );
      delay += 600;
    });
    chatTimers.push(setTimeout(() => replies.classList.add("is-in"), delay));
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
    state.name = value.charAt(0).toUpperCase() + value.slice(1);
    Sound.chime(1);
    go(2);
  };
  $("[data-r-name]", ritual).addEventListener("click", submitName);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitName();
  });

  $$("[data-r-group]", ritual).forEach((group) => {
    const key = group.dataset.rGroup;
    $$(".r-opt", group).forEach((opt) =>
      opt.addEventListener("click", () => {
        $$(".r-opt", group).forEach((o) => o.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        state[key] = opt.dataset.phrase;
        const next = state.step + 1;
        if (next === 5) Sound.bloom();
        else Sound.chime(next);
        setTimeout(() => go(next), 480);
      }),
    );
  });

  $$("[data-r-back]", ritual).forEach((b) => b.addEventListener("click", () => go(Math.max(0, state.step - 1))));
  $("[data-r-restart]", ritual).addEventListener("click", reset);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ritual.classList.contains("is-open")) close();
  });
}

/* ---------- Mariana Studio (demo interactiva) ---------- */

const CONVOS = {
  camila: {
    meta: "Instagram → WhatsApp · Interés: más energía · Etapa: en conversación",
    msgs: [
      ["user", "Hola! Me encanta el contenido de Mariana. ¿Puedo hablar con ella directamente?"],
      [
        "ai",
        "¡Claro, Camila! Ya le avisé a Mariana y te escribirá personalmente. Mientras tanto, ¿me cuentas qué te gustaría trabajar?",
      ],
      ["user", "Quiero tener más energía y bajar el estrés."],
      ["note", "Mariana fue notificada · hace 3 min"],
    ],
  },
  jorge: {
    meta: "Web · Interés: más energía · Etapa: calificado",
    msgs: [
      ["user", "Hola, vi a Mariana en Instagram. ¿Cuánto dura el programa de 21 días?"],
      [
        "ai",
        "¡Hola, Jorge! 🌿 Soy el asistente digital de Mariana. Reinicio Saludable dura 21 días: nutrición, hábitos y movimiento, con un plan diario en tu app.",
      ],
      ["user", "¿Y si no sé por dónde empezar?"],
      ["typing"],
    ],
  },
  paula: {
    meta: "Web · Interés: alimentación · Etapa: nuevo",
    msgs: [
      ["user", "Quiero mejorar mi alimentación, pero no tengo mucho tiempo."],
      [
        "ai",
        "Te entiendo, Paula. Mariana trabaja desde la vida real: cambios pequeños y sostenibles. ¿Te gustaría conocer Nutrición Consciente o agendar una consulta?",
      ],
      ["user", "Una consulta, por favor."],
      ["ai", "Perfecto. Estos son los horarios disponibles esta semana con Mariana ✨"],
    ],
  },
  natalia: {
    meta: "WhatsApp · Interés: LONEVA · Etapa: consulta agendada",
    msgs: [
      ["user", "Quiero conocer LONEVA."],
      [
        "ai",
        "LONEVA es un programa integral de longevidad para mujeres que combina educación, hábitos, nutrición y movimiento. El mejor punto de partida es una consulta con Mariana. ¿Te la agendo?",
      ],
      ["user", "Sí, el jueves."],
      ["ai", "Listo, Natalia: jueves 10:00. Te enviaré un recordatorio un día antes 🌿"],
    ],
  },
};

function renderConvo(id) {
  const data = CONVOS[id];
  const names = { camila: "Camila Ortega", jorge: "Jorge Mena", paula: "Paula Méndez", natalia: "Natalia Cruz" };
  $("#convoMeta").innerHTML = "";
  const strong = document.createElement("strong");
  strong.textContent = names[id];
  const meta = document.createElement("span");
  meta.textContent = data.meta;
  $("#convoMeta").append(strong, meta);

  const box = $("#convoMsgs");
  box.innerHTML = "";
  data.msgs.forEach(([role, text]) => {
    if (role === "typing") {
      const lbl = document.createElement("div");
      lbl.className = "lbl r";
      lbl.textContent = "Asistente IA está escribiendo…";
      const t = document.createElement("div");
      t.className = "typing";
      t.style.marginLeft = "auto";
      t.innerHTML = "<i></i><i></i><i></i>";
      box.append(lbl, t);
      return;
    }
    if (role === "note") {
      const n = document.createElement("div");
      n.className = "lbl";
      n.style.textAlign = "center";
      n.style.margin = "10px 0";
      n.textContent = "— " + text + " —";
      box.appendChild(n);
      return;
    }
    const lbl = document.createElement("div");
    lbl.className = role === "ai" ? "lbl r" : "lbl";
    lbl.textContent = role === "ai" ? "Asistente IA" : names[id].split(" ")[0];
    const b = document.createElement("div");
    b.className = role === "ai" ? "bubble ai" : "bubble";
    b.textContent = text;
    box.append(lbl, b);
  });
}

function initStudio() {
  const tabs = $$(".studio-tab");
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      $$(".studio-main .panel").forEach((p) => p.classList.toggle("is-active", p.id === tab.dataset.panel));
      Sound.tap();
    }),
  );

  // Conversaciones
  const convos = $$("#convoList .convo");
  convos.forEach((c) =>
    c.addEventListener("click", () => {
      convos.forEach((x) => x.classList.toggle("is-active", x === c));
      renderConvo(c.dataset.convo);
      Sound.tap();
    }),
  );
  renderConvo("jorge");

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
      const block = $(`[data-block="${input.dataset.module}"]`, preview);
      block.hidden = !input.checked;
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
    const reach = all ? 24 : Math.min(24, largest + Math.round(rest * 0.4));
    const chosen = channels.filter((c) => c.checked).map((c) => c.value);
    const pushCount = Math.round(reach * 0.78);
    const reachEl = $("#reach");
    if (!reach || !chosen.length) {
      reachEl.textContent = "Elige al menos un grupo y un canal.";
    } else {
      const list = chosen.length > 1 ? chosen.slice(0, -1).join(", ") + " y " + chosen.slice(-1) : chosen[0];
      reachEl.innerHTML = "";
      reachEl.append("Llegará a ");
      const s = document.createElement("strong");
      s.textContent = `${reach} personas`;
      reachEl.append(s, ` por ${list}` + (chosen.includes("push") ? ` · ${pushCount} con notificaciones activas` : ""));
    }
    $("#sigPreview").textContent = msg.value.trim() || "Tu mensaje aparecerá aquí.";
    const now = whens.find((w) => w.classList.contains("is-on")).dataset.when === "now";
    const d = new Date();
    $("#lockTime").textContent = now ? d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" }) : "7:00";
    $("#lockDate").textContent = now
      ? d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })
      : "lunes, 27 de octubre";
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
}

/* ---------- App instalable + notificaciones ---------- */

function initApp() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
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

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener("appinstalled", () => toast("¡Listo! La propuesta ya vive en tu pantalla de inicio."));

  $("#installBtn").addEventListener("click", async () => {
    if (isStandalone) {
      toast("Ya la estás usando como app ✓");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }
    if (isIOS) {
      selectTab("ios");
      toast("En Safari: toca Compartir y luego “Agregar a pantalla de inicio”.");
    } else {
      selectTab(isAndroid ? "android" : "desktop");
      toast("Usa la opción “Instalar app” de tu navegador.");
    }
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
    const title = "Mi bienestar";
    const options = {
      body: "Buenos días ☀️ Tu enfoque de hoy: constancia. Solo tres básicos, a tu ritmo.",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: "demo-notification",
    };
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) await reg.showNotification(title, options);
      else new Notification(title, options);
      toast("Notificación enviada. Así llegarán a tus clientes.");
      Sound.chime(2);
    } catch (e) {
      toast("No pudimos mostrar la notificación en este navegador.");
    }
  });

  // Notificaciones animadas junto al celular
  const notifs = $$("#notifStack .notif");
  const stackObserver = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      stackObserver.disconnect();
      notifs.forEach((n, i) => setTimeout(() => n.classList.add("is-in"), 400 + i * 900));
    },
    { threshold: 0.4 },
  );
  stackObserver.observe($("#notifStack"));

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ---------- Inversión: acordeón ---------- */

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
  const layer = document.createElement("div");
  layer.className = "petals";
  for (let i = 0; i < 34; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 4 + Math.random() * 4 + "s";
    p.style.animationDelay = Math.random() * 1.4 + "s";
    p.style.setProperty("--x", Math.round(Math.random() * 240 - 120) + "px");
    p.style.setProperty("--r", Math.round(Math.random() * 540 - 270) + "deg");
    p.style.transform = `scale(${0.6 + Math.random() * 0.7})`;
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 10000);
}

function initApproval() {
  const modal = $("#approveModal");
  const card = $(".modal-card", modal);
  const state = { plan: null };
  let lastFocus = null;

  const step = (n) => {
    $$(".m-step", modal).forEach((s) => s.classList.toggle("is-active", Number(s.dataset.mstep) === n));
    card.style.backgroundColor = n === 3 ? "#ffffff" : "";
  };

  const choose = (plan) => {
    state.plan = plan;
    $$(".pay-opt", modal).forEach((o) => o.classList.toggle("is-selected", o.dataset.plan === plan));
    $("#mNext").disabled = !plan;
  };

  const whatsappLink = (name) => {
    const plan = PLANS[state.plan];
    const text =
      `Hola, soy ${name}. Apruebo la propuesta del Ecosistema Digital Mariana Echeverri ` +
      `con la modalidad "${plan.label}" (${money(plan.today)} USD para iniciar). ` +
      `Quedo pendiente de los datos de pago y del encuentro de arranque.`;
    const number = CONFIG.whatsapp.replace(/\D/g, "");
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  const renderSummary = () => {
    const plan = PLANS[state.plan];
    const rows = [
      ["Modalidad", plan.label],
      ["Para iniciar", money(plan.today) + " USD"],
      ["Entrega", plan.delivery],
      ["Revisión", "Reunión total con correcciones en vivo"],
      ["Continuidad & IA", money(CONFIG.monthly) + " / mes desde la publicación"],
    ];
    const box = $("#mSummary");
    box.innerHTML = "";
    rows.forEach(([a, b]) => {
      const row = document.createElement("div");
      row.className = "sum-row";
      const s1 = document.createElement("span");
      s1.textContent = a;
      const s2 = document.createElement("span");
      s2.textContent = b;
      row.append(s1, s2);
      box.appendChild(row);
    });
  };

  const showSuccess = (name) => {
    $("#mHello").textContent = name.split(" ")[0] || "Mariana";
    $("#mWhats").href = whatsappLink(name);
    step(3);
  };

  const open = (plan) => {
    lastFocus = document.activeElement;
    const saved = JSON.parse(storage.get("me-proposal-approval") || "null");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    if (saved && !plan) {
      state.plan = saved.plan;
      showSuccess(saved.name);
    } else {
      choose(plan || state.plan);
      step(1);
    }
    Sound.tap();
    setTimeout(() => $(".modal-close", modal).focus(), 300);
  };

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocus) lastFocus.focus();
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
    if (!state.plan) return;
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
    storage.set("me-proposal-approval", JSON.stringify({ plan: state.plan, name, at: new Date().toISOString() }));
    document.body.classList.add("is-approved");
    showSuccess(name);
    Sound.bloom();
    petals();
  });

  if (storage.get("me-proposal-approval")) document.body.classList.add("is-approved");
}

/* ---------- Imprimir / PDF ---------- */

function initPrint() {
  $$("[data-print]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
      window.print();
    }),
  );
}

/* ---------- Inicio ---------- */

bindConfig();
initSound();
initPortal();
initScroll();
initReveal();
initCountUp();
initRitual();
initStudio();
initApp();
initInvestment();
initApproval();
initPrint();
