export const ExceptionsFeature = {
  render(site, ctx) {
    const box = document.createElement("div");
    box.className = "feature-box exceptions-box";

    const toggle = document.createElement("button");
    toggle.className = "exc-toggle" + (site.exceptions.length > 0 ? " active" : "");
    toggle.textContent = site.exceptions.length > 0
      ? `Excepciones (${site.exceptions.length})`
      : "Excepciones";

    const section = document.createElement("div");
    section.className = "exc-section";
    section.style.display = site.exceptions.length > 0 ? "" : "none";

    toggle.addEventListener("click", () => {
      section.style.display = section.style.display === "none" ? "" : "none";
    });

    function rebuild() {
      section.innerHTML = "";

      if (site.exceptions.length > 0) {
        const list = document.createElement("div");
        list.className = "exc-list";
        site.exceptions.forEach((exc) => {
          const tag = document.createElement("span");
          tag.className = "exc-tag";
          tag.appendChild(document.createTextNode(exc));
          const delBtn = document.createElement("button");
          delBtn.className = "exc-tag-del";
          delBtn.textContent = "×";
          delBtn.addEventListener("click", () => {
            site.exceptions = site.exceptions.filter((e) => e !== exc);
            toggle.className = "exc-toggle" + (site.exceptions.length > 0 ? " active" : "");
            toggle.textContent = site.exceptions.length > 0
              ? `Excepciones (${site.exceptions.length})`
              : "Excepciones";
            ctx.onUpdate(site);
            rebuild();
          });
          tag.appendChild(delBtn);
          list.appendChild(tag);
        });
        section.appendChild(list);
      }

      const addRow = document.createElement("div");
      addRow.className = "exc-add-row";

      const input = document.createElement("input");
      input.className = "exc-input";
      input.type = "text";
      input.placeholder = "subdomain.site.com";
      input.autocomplete = "off";

      const addBtn = document.createElement("button");
      addBtn.className = "exc-add-btn";
      addBtn.textContent = "+";

      function addException() {
        const val = input.value.trim().toLowerCase()
          .replace(/^https?:\/\//, "").replace(/^www\./, "");
        if (!val || site.exceptions.includes(val)) { input.value = ""; return; }
        site.exceptions = [...site.exceptions, val];
        toggle.className = "exc-toggle active";
        toggle.textContent = `Excepciones (${site.exceptions.length})`;
        ctx.onUpdate(site);
        input.value = "";
        rebuild();
      }

      addBtn.addEventListener("click", addException);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") addException(); });

      addRow.appendChild(input);
      addRow.appendChild(addBtn);
      section.appendChild(addRow);
    }

    rebuild();
    box.appendChild(toggle);
    box.appendChild(section);
    return box;
  },
};
