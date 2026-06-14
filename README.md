# Site Blocker

Extensión de Chrome (MV3) para bloquear sitios distractores según un horario configurable, con temporizadores diarios opcionales, excepciones por ruta/subdominio y dos temas visuales.

---

## Funcionalidades

### Bloqueo por dominio

Agrega cualquier dominio (ej. `reddit.com`) y la extensión bloqueará automáticamente todos sus subdominios (`old.reddit.com`, `www.reddit.com`, etc.). El prefijo `www.` se elimina automáticamente para garantizar una coincidencia consistente.

Cuando se intenta acceder a un sitio bloqueado, el navegador redirige a una página personalizada que muestra el dominio bloqueado y un botón para volver atrás.

### Horario por días de la semana

Cada sitio bloqueado tiene su propio selector de días (D L M M J V S). Solo los días marcados como activos aplicarán el bloqueo; el resto del tiempo el sitio es accesible libremente.

### Temporizador diario

Asigna un límite de minutos por día (0–480) a cualquier sitio. El funcionamiento es:

- El temporizador arranca automáticamente en la primera visita del día.
- Una barra de progreso aparece en la parte inferior de la página mostrando el tiempo restante.
  - Verde: más del 50% restante
  - Ámbar: entre 25% y 50%
  - Rojo: menos del 25%
- Al agotar el tiempo, aparece una cuenta regresiva de 30 segundos antes de redirigir a la página de bloqueo.

El temporizador se **pausa automáticamente** cuando:

- Cambias a otra pestaña
- La ventana del navegador pierde el foco (Alt-Tab, etc.)
- Cierras la pestaña

Y se **reanuda** al volver a la pestaña del sitio.

### Excepciones siempre permitidas

Permite rutas o subdominios específicos aunque el dominio padre esté bloqueado. Dos formatos soportados:

| Formato | Ejemplo | Efecto |
|---|---|---|
| Subdominio | `mail.google.com` | Permite ese subdominio y sus hijos |
| Ruta | `reddit.com/chat/room/` | Permite esa ruta y cualquier subruta |

Cuando una URL coincide con una excepción, el temporizador también se pausa automáticamente.

### Modo audio en YouTube Music

La extensión incluye un script de contenido que fuerza el modo audio en `music.youtube.com`, ocultando el botón de video y cambiando automáticamente al modo canción si el video está activo. No requiere configuración.

### Popup de estado rápido

El popup de la extensión muestra en tiempo real:

- El dominio de la pestaña activa
- Si el sitio está bloqueado (rojo), permitido (verde), con temporizador activo (ámbar) o sin configuración (gris)
- La cuenta regresiva del temporizador activo, actualizada cada segundo
- Acceso directo a la página de configuración

### Temas visuales

La página de opciones soporta dos temas intercambiables:

- **Retro (Win 98):** Interfaz estilo Windows 98 con botones biselados, barras de título con gradiente, fuente MS Sans Serif y un fondo animado con palos de cartas (♠ ♥ ♦ ♣).
- **Sobrio:** Diseño limpio y moderno con tipografía del sistema y fondo blanco, sin animaciones.

El tema elegido se guarda en `chrome.storage.local` y persiste entre sesiones.

---

## Arquitectura

### Archivos principales

```
manifest.json                   Configuración de la extensión (MV3)

src/
  background.js                 Punto de entrada del service worker
  handlers.js                   Listeners de eventos (navegación, tabs, ventanas, mensajes)
  blocking.js                   Lógica pura de bloqueo (isBlocked, isAlwaysAllowed)
  timer.js                      Helpers de pausa/reanudación de temporizadores

shared/
  BlockedSite.js                Modelo de datos; normalización de dominio y matching
  storage.js                    Helpers para chrome.storage

pages/
  popup/
    popup.html / popup.js       UI del popup
  options/
    options.html / options.js   Página de configuración
    bg.js                       Animación de fondo (canvas)
    theme-retro.css             Overrides para el tema Win 98
    theme-sober.css             Overrides para el tema sobrio
    features/
      days.js                   Selector de días
      timer.js                  Configuración del temporizador
      exceptions.js             Gestión de excepciones
  blocked/
    blocked.html / blocked.js   Página mostrada al bloquear

content/
  timer-overlay.js              Barra de progreso inyectada en páginas bloqueadas
  ytmusic.js                    Modo audio en YouTube Music
```

### Almacenamiento

| Capa | Qué guarda |
|---|---|
| `chrome.storage.sync` | `blockedSites` — configuración completa, sincronizada entre dispositivos |
| `chrome.storage.local` | `activeTimers`, `pausedTimers`, `usedTimerDates`, `theme` |
| `chrome.storage.session` | `tabHostnames`, `activeTabPerWindow` — estado de sesión del service worker |

### Modelo de datos

Cada sitio bloqueado (`BlockedSite`) almacena:

```js
{
  domain: "reddit.com",          // dominio normalizado (sin www.)
  days: [1, 2, 3, 4, 5],        // índices 0=Dom … 6=Sáb
  timerMinutes: 30,              // 0 = sin límite
  exceptions: ["reddit.com/chat/room/"]
}
```

### Protocolo de mensajes (service worker ↔ UI/content scripts)

| Mensaje | Emisor | Payload | Respuesta |
|---|---|---|---|
| `START_TIMER` | Opciones | `{domain, minutes}` | `{ok: true}` |
| `STOP_TIMER` | Opciones | `{domain}` | `{ok: true}` |
| `GET_TIMER_STATE` | Popup / overlay | `{domain}` | `{expiry: timestamp\|null}` |
| `GET_SITE_CONFIG` | Popup | `{domain}` | `{entry: BlockedSite\|null}` |

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar tests
npm test
```

Para cargar la extensión en Chrome: **chrome://extensions → Cargar descomprimida**, apuntando al directorio raíz del proyecto.
