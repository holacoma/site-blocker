import { t } from "../../../shared/i18n.js";

export const ExceptionsFeature = {
  id: "exceptions",
  get label()       { return t("featureExceptionsLabel"); },
  get description() { return t("featureExceptionsDesc"); },

  render(site, ctx) {
    const box = document.createElement("div");
    box.className = "exc-section";

    function rebuild() {
      box.innerHTML = "";

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
            ctx.onUpdate(site);
            rebuild();
          });
          tag.appendChild(delBtn);
          list.appendChild(tag);
        });
        box.appendChild(list);
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
        ctx.onUpdate(site);
        input.value = "";
        rebuild();
      }

      addBtn.addEventListener("click", addException);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") addException(); });

      addRow.appendChild(input);
      addRow.appendChild(addBtn);
      box.appendChild(addRow);
    }

    rebuild();
    return box;
  },
};
