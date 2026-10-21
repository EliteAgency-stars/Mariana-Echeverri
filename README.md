# Mariana Echeverri · Propuesta Ecosistema Digital

Página de propuesta (cotización) para **Mariana Echeverri · Wellness & Nutrition**: web de experiencia, app instalable
"Mi bienestar", CRM "Mariana Studio" y 14 automatizaciones n8n + IA.

Sitio estático: no necesita build. Se publica tal cual en Vercel, Netlify o GitHub Pages.

## Qué incluye la experiencia

- **Portal de entrada** en beige con el loto animado y la opción de entrar con sonido.
- **Música ambiental generativa** (Web Audio API): pad cálido, campanas suaves y efectos por interacción. No usa
  archivos de audio, así que no hay licencias de por medio. Se apaga desde el botón "Sonido".
- **Fondo que se aclara** de beige a blanco mientras se recorre la propuesta.
- **Experiencia de recepción inmersiva** (botón "Vivir la experiencia"): pantalla que pasa de beige a blanco con cada
  respuesta, pétalos que se llenan y un asistente IA de ejemplo que continúa la conversación.
- **Mariana Studio interactivo**: Inicio, Personas, Conversaciones IA, Editor de página con vista previa (logo, color,
  módulos, titular) y Señales de marketing con vista previa en la pantalla de bloqueo.
- **App instalable (PWA)**: guía de instalación para iPhone, Android y computador, botón para instalar la propuesta y
  notificación de prueba.
- **Inversión** desglosada ($2,150), **formas de pago** (contado: entrega en 4 h · abono 50%: inicio en 8 h, entrega
  en 2 días) y **continuidad** ($150/mes).
- **Aprobación** en dos pasos que termina con un mensaje listo para WhatsApp. Botón para descargar en PDF.

## Ajustes rápidos

En `assets/js/app.js`, objeto `CONFIG`:

| Campo        | Para qué                                                                   |
| ------------ | -------------------------------------------------------------------------- |
| `preparedBy` | Nombre que firma la propuesta (pie de página).                              |
| `whatsapp`   | Número que recibe la aprobación, solo dígitos con código de país.          |
| `validUntil` | Último día de vigencia (`AAAA-MM-DD`).                                      |

Si `whatsapp` queda vacío, WhatsApp abre el mensaje para elegir el contacto manualmente.

## Estructura

```
index.html              Propuesta completa
assets/css/styles.css   Sistema visual (tokens de la marca, responsive, impresión)
assets/js/sound.js      Motor de sonido ambiental
assets/js/app.js        Interacciones, experiencia inmersiva, Studio, PWA y aprobación
assets/img/logo.png     Logo de la marca
icons/                  Íconos de la app
manifest.webmanifest    Manifest de la PWA
sw.js                   Service worker (instalación, uso sin conexión y notificaciones)
```

## Probar en local

```bash
npx http-server -c-1 .
```

La instalación como app y las notificaciones requieren `https` o `localhost`.

## Regla de contenido

El programa de longevidad se presenta únicamente como **LONEVA** ("programa integral de longevidad para mujeres que
combina educación, hábitos, nutrición y movimiento"). No se mencionan sustancias, compuestos ni tratamientos en ningún
texto del sitio.
