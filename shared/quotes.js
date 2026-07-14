export const QUOTES = {
  es: [
    "Cinco minutos de foco valen más que una hora de scroll.",
    "La distracción que evitaste ahora es tiempo que te devolviste.",
    "No perdiste nada por no entrar. Ganaste unos minutos tuyos.",
    "Lo que ibas a ver ahí va a seguir estando mañana. Vos, ahora, tenés otra cosa que hacer.",
    "Cerrar esta pestaña es una decisión, no un sacrificio.",
    "El impulso dura segundos. Lo que hagas con esos segundos, dura más.",
    "Nadie construyó nada bueno mirando el feed de otro.",
    "Volver a lo que importa siempre es una opción disponible.",
    "Esto que sentís ahora, las ganas de entrar igual, se va a pasar solo.",
    "Un rato aburrido y presente rinde más que uno entretenido y ausente.",
    "Elegiste bloquear esto por una razón. Esa razón sigue siendo válida.",
    "Lo simple que estás por hacer ahora importa más de lo que parece.",
  ],
  en: [
    "Five focused minutes beat an hour of scrolling.",
    "The distraction you skipped is time you got back for yourself.",
    "You didn't miss out by not going in. You gained a few minutes.",
    "Whatever was waiting there will still be there tomorrow. Right now, you have something else to do.",
    "Closing this tab is a decision, not a sacrifice.",
    "The urge lasts seconds. What you do with those seconds lasts longer.",
    "Nobody built anything good by watching someone else's feed.",
    "Going back to what matters is always an option on the table.",
    "This urge to go in anyway will pass on its own.",
    "A boring, present moment beats an entertaining, absent one.",
    "You blocked this for a reason. That reason still holds.",
    "The small thing you're about to do now matters more than it seems.",
  ],
};

/** @param {"es" | "en"} lang */
export function randomQuote(lang) {
  const list = QUOTES[lang] ?? QUOTES.es;
  return list[Math.floor(Math.random() * list.length)];
}
