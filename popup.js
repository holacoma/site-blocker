const input = document.getElementById("site-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("site-list");

const DAYS_ES = ["D","L","M","M","J","V","S"];

function normalizeSites(raw) {
  return raw.map(entry =>
    typeof entry === "string"
      ? { domain: entry, days: [0,1,2,3,4,5,6] }
      : entry
  );
}

function load() {
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) =>
    render(normalizeSites(blockedSites))
  );
}

function render(sites) {
  list.innerHTML = "";
  if (sites.length === 0) {
    list.innerHTML = '<li class="empty">Sin sitios bloqueados</li>';
    return;
  }
  sites.forEach((entry) => {
    const li = document.createElement("li");

    const siteRow = document.createElement("div");
    siteRow.className = "site-row";
    const span = document.createElement("span");
    span.textContent = entry.domain;
    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.title = "Eliminar";
    delBtn.addEventListener("click", () => remove(entry.domain));
    siteRow.appendChild(span);
    siteRow.appendChild(delBtn);

    const daysRow = document.createElement("div");
    daysRow.className = "days-row";
    DAYS_ES.forEach((label, dayIndex) => {
      const btn = document.createElement("button");
      btn.className = "day-btn" + (entry.days.includes(dayIndex) ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => toggleDay(entry.domain, dayIndex));
      daysRow.appendChild(btn);
    });

    li.appendChild(siteRow);
    li.appendChild(daysRow);
    list.appendChild(li);
  });
}

function add() {
  const raw = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!raw) return;
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const sites = normalizeSites(blockedSites);
    if (!sites.some(e => e.domain === raw)) {
      const updated = [...sites, { domain: raw, days: [0,1,2,3,4,5,6] }];
      chrome.storage.sync.set({ blockedSites: updated }, () => render(updated));
    }
    input.value = "";
  });
}

function remove(domain) {
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const updated = normalizeSites(blockedSites).filter(e => e.domain !== domain);
    chrome.storage.sync.set({ blockedSites: updated }, () => render(updated));
  });
}

function toggleDay(domain, dayIndex) {
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const sites = normalizeSites(blockedSites);
    const updated = sites.map(entry => {
      if (entry.domain !== domain) return entry;
      const has = entry.days.includes(dayIndex);
      const newDays = has
        ? entry.days.filter(d => d !== dayIndex)
        : [...entry.days, dayIndex].sort((a, b) => a - b);
      return { ...entry, days: newDays };
    });
    chrome.storage.sync.set({ blockedSites: updated }, () => render(updated));
  });
}

addBtn.addEventListener("click", add);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

load();
