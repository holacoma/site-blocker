const MESSAGES = {
  es: {
    appTitle:               "Site Blocker — Configuración",
    navDomainBlock:         "Bloqueo de Dominios",
    navGeneral:             "General",
    navAbout:               "Acerca de",
    addLabel:               "Dominio a bloquear",
    addHint:                "Ingresá el dominio que querés bloquear. Los subdominios se bloquean automáticamente.",
    addPlaceholder:         "ejemplo.com",
    addButton:              "Agregar",
    emptySites:             "Sin sitios bloqueados",
    deleteSiteTitle:        "Eliminar sitio",
    deleteConfirm:          "¿Borrar?",
    featureDaysLabel:       "Días",
    featureDaysDesc:        "Seleccioná los días de la semana en que este sitio debe bloquearse.",
    dayNames:               "D,L,M,M,J,V,S",
    featureTimerLabel:      "Timer",
    featureTimerDesc:       "Limitá el tiempo de acceso diario a este sitio. El contador arranca cuando entrás.",
    timerMinLabel:          "min / día",
    timerMinTitle:          "Minutos de acceso permitido por día",
    timerStatusPaused:      "En pausa:",
    timerStatusUsed:        "Usado hoy",
    featureExceptionsLabel: "Excepciones",
    featureExceptionsDesc:  "Permitís acceso a sub-páginas específicas dentro del sitio bloqueado (ej: mail.google.com).",
    themeLabel:             "Tema",
    themeSubtitle:          "Cambiá entre el estilo Retro (Win 98) y Sobrio.",
    themeRetro:             "Retro (Win 98)",
    themeSober:             "Sobrio",
    languageLabel:          "Idioma",
    languageSubtitle:       "Seleccioná el idioma de la interfaz.",
    aboutVersion:           "Versión",
    aboutDescription:       "Bloquea sitios web que distraen según días y tiempo de uso.",
  },
  en: {
    appTitle:               "Site Blocker — Settings",
    navDomainBlock:         "Domain Block",
    navGeneral:             "General",
    navAbout:               "About",
    addLabel:               "Domain to block",
    addHint:                "Enter the domain you want to block. Subdomains are blocked automatically.",
    addPlaceholder:         "example.com",
    addButton:              "Add",
    emptySites:             "No blocked sites",
    deleteSiteTitle:        "Remove site",
    deleteConfirm:          "Delete?",
    featureDaysLabel:       "Days",
    featureDaysDesc:        "Select the days of the week on which this site should be blocked.",
    dayNames:               "S,M,T,W,T,F,S",
    featureTimerLabel:      "Timer",
    featureTimerDesc:       "Limit daily access time to this site. The counter starts when you enter.",
    timerMinLabel:          "min / day",
    timerMinTitle:          "Minutes of access allowed per day",
    timerStatusPaused:      "Paused:",
    timerStatusUsed:        "Used today",
    featureExceptionsLabel: "Exceptions",
    featureExceptionsDesc:  "Allow access to specific sub-pages within the blocked site (e.g. mail.google.com).",
    themeLabel:             "Theme",
    themeSubtitle:          "Switch between Retro (Win 98) and Sober styles.",
    themeRetro:             "Retro (Win 98)",
    themeSober:             "Sober",
    languageLabel:          "Language",
    languageSubtitle:       "Select the interface language.",
    aboutVersion:           "Version",
    aboutDescription:       "Blocks distracting websites based on days and usage time.",
  },
};

let _lang = "es";

export const SUPPORTED_LANGS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export function setLang(lang) {
  if (MESSAGES[lang]) _lang = lang;
}

export function getLang() {
  return _lang;
}

export const t = (key) => MESSAGES[_lang]?.[key] ?? MESSAGES["es"]?.[key] ?? key;
