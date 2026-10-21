# Mariana Echeverri · Propuesta Ecosistema Digital

Propuesta interactiva en tres actos para **Mariana Echeverri · Nutrición & Longevidad**: Primer Loto (bienvenida que
pasa de beige a blanco), asistente con IA real, la app **Loto**, el panel **Raíz** y 14 automatizaciones en n8n. El
contenido sigue el resumen del proyecto que envió Mariana: modelo Déjà Vu → LONÉVA → su app y membresía, sección PEPS
con Portal Health, Guía anti-dieta extrema y su paleta (rosa empolvado, beige, café, terracota y dorado).

Sitio estático con una función serverless (`api/chat.js`). Se despliega en Vercel sin paso de build.

## Los tres actos

1. **Vívelo como tu clienta**: Primer Loto, conversación con el asistente con IA y la app Loto personalizada con lo que
   respondió.
2. **Míralo desde tu lado**: Raíz muestra a esa misma persona como contacto nuevo, con su intención, temperatura,
   siguiente paso sugerido y su conversación. Incluye editor de página con vista previa y señales de marketing.
3. **Hazlo realidad**: calculadora del valor de cada cohorte de graduadas de LONÉVA que pasa a la membresía, sistema
   Atraer · Florecer · Sostener, inversión de $2,500, formas de pago (contado: 4 h · abono 50%: inicio en 8 h, entrega
   en 2 días), garantías, continuidad de $150/mes y aprobación con mensaje de WhatsApp.

## Configuración

**Página** (`assets/js/app.js`, objeto `CONFIG`):

| Campo        | Para qué                                                          |
| ------------ | ----------------------------------------------------------------- |
| `preparedBy` | Nombre que firma la propuesta.                                    |
| `whatsapp`   | Número que recibe la aprobación, solo dígitos con código de país. |
| `validUntil` | Último día de vigencia (`AAAA-MM-DD`).                            |
| `supabase*`  | Proyecto y llave pública para registrar eventos de la propuesta.  |

**Asistente con IA** (variables de entorno en Vercel):

| Variable            | Para qué                                                                        |
| ------------------- | ------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Activa las respuestas reales. Sin ella, el chat usa respuestas de demostración. |

La base de conocimiento y las reglas de la marca están en `api/_conocimiento.js`.

## Registro de eventos

La tabla `me_propuesta_eventos` (Supabase, proyecto `proyectumia`) recibe apertura, Primer Loto, mensajes del chat,
calculadora, instalación, notificación y aprobación. La llave pública solo puede insertar; para leer los eventos usa el
panel de Supabase. Solo se registra desde `https`, así que las pruebas locales no ensucian la tabla.

## Estructura

```
index.html              Propuesta completa
assets/css/styles.css   Sistema visual (propuesta + marca de Mariana, responsive, impresión)
assets/js/sound.js      Motor de sonido ambiental (Web Audio, sin archivos de audio)
assets/js/app.js        Actos, chat, Raíz, calculadora, PWA, aprobación y registro
api/chat.js             Asistente con IA (Anthropic SDK)
api/_conocimiento.js    Base de conocimiento y reglas del asistente
icons/, manifest.webmanifest, sw.js   App instalable
```

## Probar en local

```bash
npx http-server -c-1 .
```

En local el chat funciona en modo demostración. La instalación como app y las notificaciones requieren `https` o
`localhost`.

## Regla de contenido

La sección PEPS es educativa. La valoración médica, la venta y la atención de péptidos las hace Portal Health, a través
del link de referida de Mariana. Ni la web ni el asistente dan dosis, diagnósticos ni recomiendan un péptido concreto,
ni prometen resultados. Esas reglas viven en `api/_conocimiento.js` y en las respuestas de demostración de
`assets/js/app.js`.
