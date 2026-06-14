import { t } from "../../../shared/i18n.js";

export function renderAbout() {
  const mount = document.getElementById("about-mount");
  const manifest = chrome.runtime.getManifest();

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
}
