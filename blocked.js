const params = new URLSearchParams(location.search);
const site = params.get("site");
if (site) document.getElementById("site-name").textContent = site;

document.getElementById("back-btn").addEventListener("click", () => history.back());
