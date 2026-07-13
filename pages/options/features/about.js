import { t } from "../../../shared/i18n.js";

const KOFI_URL = "https://ko-fi.com/zeeke94";

export function renderAbout() {
  const mount = /** @type {HTMLElement} */ (document.getElementById("about-mount"));
  const manifest = chrome.runtime.getManifest();

  // Header
  const name = document.createElement("h2");
  name.className = "about-name";
  name.textContent = manifest.name;

  const version = document.createElement("p");
  version.className = "about-version";
  version.textContent = t("aboutVersion") + ": " + manifest.version;

  const desc = document.createElement("p");
  desc.className = "about-desc";
  desc.textContent = t("aboutDescription");

  mount.appendChild(name);
  mount.appendChild(version);
  mount.appendChild(desc);

  // Philosophy
  mount.appendChild(makeDivider());
  mount.appendChild(makeTitle(t("aboutPhilosophyTitle")));
  makeParagraphs(t("aboutPhilosophy"), "about-story").forEach(p => mount.appendChild(p));

  // Story
  mount.appendChild(makeDivider());

  mount.appendChild(makeTitle(t("aboutStoryTitle")));
  makeParagraphs(t("aboutStory"), "about-story").forEach(p => mount.appendChild(p));

  // Credits
  mount.appendChild(makeDivider());
  mount.appendChild(makeTitle(t("aboutCreditsTitle")));

  const credits = [
    { label: "98.css", url: "https://github.com/jdan/98.css", desc: t("aboutCreditsCss") },
  ];

  const creditsList = document.createElement("ul");
  creditsList.className = "about-credits-list";

  credits.forEach(({ label, url, desc }) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = url;
    link.textContent = label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    li.appendChild(link);
    li.appendChild(document.createTextNode(": " + desc));
    creditsList.appendChild(li);
  });

  mount.appendChild(creditsList);

  // Donate
  mount.appendChild(makeDivider());
  mount.appendChild(makeTitle(t("aboutDonateTitle")));

  const donateDesc = document.createElement("p");
  donateDesc.className = "about-donate-desc";
  donateDesc.textContent = t("aboutDonateDesc");

  const donateBtn = document.createElement("a");
  donateBtn.className = "about-donate-btn";
  donateBtn.href = KOFI_URL;
  donateBtn.textContent = t("aboutDonateButton");
  donateBtn.target = "_blank";
  donateBtn.rel = "noopener noreferrer";

  mount.appendChild(donateDesc);
  mount.appendChild(donateBtn);
}

/** @param {string} text */
function makeTitle(text) {
  const h3 = document.createElement("h3");
  h3.className = "about-section-title";
  h3.textContent = text;
  return h3;
}

/**
 * @param {string} text
 * @param {string} className
 */
function makeParagraphs(text, className) {
  return text.split("\n\n").map(chunk => {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = chunk;
    return p;
  });
}

function makeDivider() {
  const hr = document.createElement("hr");
  hr.className = "setting-divider about-divider";
  return hr;
}
