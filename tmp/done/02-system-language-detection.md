---
titulo: Deteccion de idioma del sistema
dificultad: S
---

## Feedback original
> "El idioma siempre queda en español por defecto. Debería detectar el idioma del sistema automáticamente."

## Contexto técnico

**Archivos relevantes:**
- `shared/i18n.js` — funciones `setLang(lang)`, `getLang()`, `t(key)`. `SUPPORTED_LANGS = [{ code: "es" }, { code: "en" }]`. Default hardcodeado a `"es"`.
- `pages/options/features/general.js` — selector de idioma en la UI
- `manifest.json` — `"default_locale": "es"`

**Funcionamiento actual:**
Al iniciar, `getLang()` lee de `chrome.storage.local`. Si no hay nada guardado, retorna `"es"` directamente sin consultar el idioma del sistema.

## Enfoque propuesto

En `getLang()` (o en la inicialización del i18n), si no hay preferencia guardada en storage, detectar el idioma del navegador:

```js
// En shared/i18n.js
async function getInitialLang() {
  const stored = await chrome.storage.local.get("lang");
  if (stored.lang) return stored.lang;

  const uiLang = chrome.i18n.getUILanguage(); // ej. "es-AR", "en-US"
  const code = uiLang.split("-")[0]; // "es" o "en"
  const supported = SUPPORTED_LANGS.map(l => l.code);
  return supported.includes(code) ? code : "es"; // fallback a "es"
}
```

Si el idioma del sistema no está soportado, cae a `"es"`. La preferencia guardada manualmente por el usuario siempre tiene prioridad.

## Preguntas pendientes

Ninguna.

## Criterios de aceptación

- [ ] Chrome en inglés, sin preferencia guardada: la extensión carga en inglés.
- [ ] Chrome en español, sin preferencia guardada: la extensión carga en español.
- [ ] Chrome en un idioma no soportado (ej. francés): la extensión carga en español (fallback).
- [ ] El usuario cambia el idioma manualmente en Settings: se respeta la preferencia guardada, sin importar el idioma del sistema.
- [ ] No hay regresión en el selector de idioma de la options page.
