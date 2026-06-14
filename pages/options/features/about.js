import { t } from "../../../shared/i18n.js";

const KOFI_URL = "https://ko-fi.com/zeeke94";

export function renderAbout() {
  const mount = document.getElementById("about-mount");
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

  // Story
  mount.appendChild(makeDivider());

  const storyTitle = makeTitle(t("aboutStoryTitle"));
  const story = document.createElement("p");
  story.className = "about-story";
  story.textContent = t("aboutStory");

  mount.appendChild(storyTitle);
  mount.appendChild(story);

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

function makeTitle(text) {
  const h3 = document.createElement("h3");
  h3.className = "about-section-title";
  h3.textContent = text;
  return h3;
}

function makeDivider() {
  const hr = document.createElement("hr");
  hr.className = "setting-divider about-divider";
  return hr;
}
