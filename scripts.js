const CATALOG_KEY = "ctlr-catalog-v2";
const TOKEN_KEY = "ctlr-admin-token";
const SELECTION_KEY = "ctlr-selection";
const REFRESH_MS = 12000;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const isHttp = () => /^https?:$/.test(window.location.protocol);

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const slugify = (value = "item") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `item-${Date.now()}`;

const emptyCatalog = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  products: [],
  drinks: [],
  team: []
});

const normalizeArray = (items = [], type = "products") =>
  Array.isArray(items)
    ? items.map((item) => {
        const base = {
          id: item.id || slugify(item.name),
          name: item.name || "",
          description: item.description || "",
          image: item.image || "",
          available: Boolean(item.available)
        };

        if (type === "team") {
          return {
            ...base,
            role: item.role || "",
            instagram: item.instagram || "",
            facebook: item.facebook || ""
          };
        }

        return {
          ...base,
          price: item.price || "",
          category: item.category || "",
          tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : []
        };
      })
    : [];

const normalizeCatalog = (catalog = {}) => ({
  version: 1,
  updatedAt: catalog.updatedAt || new Date().toISOString(),
  products: normalizeArray(catalog.products, "products"),
  drinks: normalizeArray(catalog.drinks, "drinks"),
  team: normalizeArray(catalog.team, "team")
});

const getStoredCatalog = () => {
  try {
    const stored = window.localStorage.getItem(CATALOG_KEY);
    return stored ? normalizeCatalog(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

const storeCatalog = (catalog) => {
  window.localStorage.setItem(CATALOG_KEY, JSON.stringify(normalizeCatalog(catalog)));
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
  return payload;
};

const loadCatalog = async () => {
  try {
    if (isHttp()) {
      const catalog = normalizeCatalog(await fetchJson(`/api/catalog?ts=${Date.now()}`));
      storeCatalog(catalog);
      return catalog;
    }

    const seeded = normalizeCatalog(await fetchJson("data/catalog.json"));
    storeCatalog(seeded);
    return seeded;
  } catch {
    return getStoredCatalog() || emptyCatalog();
  }
};

const saveCatalog = async (catalog, token) => {
  const nextCatalog = normalizeCatalog({ ...catalog, updatedAt: new Date().toISOString() });

  if (isHttp()) {
    const saved = normalizeCatalog(
      await fetchJson("/api/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token
        },
        body: JSON.stringify(nextCatalog)
      })
    );
    storeCatalog(saved);
    return saved;
  }

  storeCatalog(nextCatalog);
  return nextCatalog;
};

const getVisibleItems = (items = []) => items.filter((item) => item.available);

const imgSrc = (item) => item.image || "assets/menu-fuego.jpeg";

const tagMarkup = (tags = []) =>
  tags.length
    ? `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

const productCardMarkup = (item, extraClass = "") => `
  <article class="catalog-card ${extraClass}" data-reveal>
    <figure>
      <img src="${escapeHtml(imgSrc(item))}" alt="${escapeHtml(item.name)}" loading="lazy">
    </figure>
    <div class="catalog-card-body">
      <div class="card-meta">
        <span>${escapeHtml(item.category || "Especial")}</span>
        <strong>${escapeHtml(item.price)}</strong>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      ${tagMarkup(item.tags)}
      <button class="card-add" type="button" data-add-item data-item-id="${escapeHtml(item.id)}" data-item-name="${escapeHtml(item.name)}" data-item-price="${escapeHtml(item.price)}" data-item-category="${escapeHtml(item.category || "Especial")}">Agregar a mi selección <span aria-hidden="true">+</span></button>
    </div>
  </article>
`;

const emptyMarkup = (message) => `
  <div class="empty-state" data-reveal>
    <p>${escapeHtml(message)}</p>
  </div>
`;

let menuIndex = 0;
let menuItems = [];
let menuTimer;
let lastCatalogHash = "";

const renderMechanism = () => {
  const stack = $("[data-mechanism-stack]");
  if (!stack) return;

  if (!menuItems.length) {
    stack.innerHTML = emptyMarkup("El menu estara disponible pronto.");
    return;
  }

  const visibleCards = Math.min(menuItems.length, 4);
  stack.innerHTML = Array.from({ length: visibleCards }, (_, depth) => {
    const item = menuItems[(menuIndex + depth) % menuItems.length];
    return `
      <article class="mechanism-card" style="--depth: ${depth}" data-depth="${depth}">
        <figure>
          <img src="${escapeHtml(imgSrc(item))}" alt="${escapeHtml(item.name)}" loading="${depth === 0 ? "eager" : "lazy"}">
        </figure>
        <div class="mechanism-copy">
          <div class="card-meta">
            <span>${escapeHtml(item.category || "Especial")}</span>
            <strong>${escapeHtml(item.price)}</strong>
          </div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          ${tagMarkup(item.tags)}
        </div>
      </article>
    `;
  }).join("");
};

const moveMechanism = (direction) => {
  if (!menuItems.length) return;
  menuIndex = (menuIndex + direction + menuItems.length) % menuItems.length;
  renderMechanism();
};

const initMechanismControls = () => {
  $("[data-menu-prev]")?.addEventListener("click", () => moveMechanism(-1));
  $("[data-menu-next]")?.addEventListener("click", () => moveMechanism(1));
};

const initMenuBook = () => {
  const book = $("[data-menu-book]");
  if (!book) return;

  const image = $("[data-menu-book-image]", book);
  const title = $("[data-menu-book-title]", book);
  const note = $("[data-menu-book-note]", book);

  $$('[data-menu-tab]', book).forEach((tab) => {
    tab.addEventListener("click", () => {
      $$('[data-menu-tab]', book).forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });

      if (image) {
        image.classList.add("is-switching");
        window.setTimeout(() => {
          image.src = tab.dataset.menuImage || image.src;
          image.alt = `Carta de ${tab.dataset.menuTitle || "Como Te Lo Recetaron"}`;
          image.classList.remove("is-switching");
        }, 120);
      }

      if (title) title.textContent = tab.dataset.menuTitle || "Carta de la casa";
      if (note) note.textContent = tab.dataset.menuNote || "Consulta nuestra selección de temporada.";
    });
  });
};

const getSelection = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SELECTION_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const saveSelection = (items) => {
  window.localStorage.setItem(SELECTION_KEY, JSON.stringify(items));
};

const selectionCount = (items) => items.reduce((total, item) => total + Number(item.qty || 1), 0);

const renderSelection = () => {
  const items = getSelection();
  $$('[data-cart-count]').forEach((node) => {
    node.textContent = String(selectionCount(items));
  });

  const list = $('[data-cart-items]');
  const empty = $('[data-cart-empty]');
  if (!list) return;

  list.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="cart-item">
              <div><span>${escapeHtml(item.category || "Especial")}</span><h3>${escapeHtml(item.name)}</h3><small>${escapeHtml(item.price || "")}</small></div>
              <div class="cart-item-actions"><b>x${item.qty}</b><button type="button" data-remove-selection="${escapeHtml(item.id)}" aria-label="Quitar ${escapeHtml(item.name)}">−</button></div>
            </article>
          `
        )
        .join("")
    : `<div class="cart-empty-visual"><span>✦</span><p>Tu selección está vacía.</p></div>`;

  if (empty) empty.hidden = Boolean(items.length);
}

const openCart = () => {
  const drawer = $('[data-cart-drawer]');
  if (!drawer) return;
  renderSelection();
  drawer.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
};

const closeCart = () => {
  const drawer = $('[data-cart-drawer]');
  if (!drawer) return;
  drawer.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
};

const initSelection = () => {
  renderSelection();

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-item]");
    const removeButton = event.target.closest("[data-remove-selection]");

    if (addButton) {
      const items = getSelection();
      const id = addButton.dataset.itemId;
      const existing = items.find((item) => item.id === id);
      if (existing) existing.qty += 1;
      else items.push({ id, name: addButton.dataset.itemName, price: addButton.dataset.itemPrice, category: addButton.dataset.itemCategory, qty: 1 });
      saveSelection(items);
      renderSelection();
      addButton.classList.add("is-added");
      addButton.innerHTML = "Agregado · sumar otro <span aria-hidden=\"true\">+</span>";
      window.setTimeout(() => addButton.classList.remove("is-added"), 900);
    }

    if (removeButton) {
      const items = getSelection().flatMap((item) => {
        if (item.id !== removeButton.dataset.removeSelection) return [item];
        if (item.qty > 1) return [{ ...item, qty: item.qty - 1 }];
        return [];
      });
      saveSelection(items);
      renderSelection();
    }
  });

  $$('[data-open-cart]').forEach((button) => button.addEventListener("click", openCart));
  $$('[data-close-cart]').forEach((button) => button.addEventListener("click", closeCart));
  $('[data-clear-selection]')?.addEventListener("click", () => {
    saveSelection([]);
    renderSelection();
  });
  $('[data-send-selection]')?.addEventListener("click", () => {
    const items = getSelection();
    const message = items.length
      ? `Hola, quiero pedir:\n${items.map((item) => `• ${item.qty} x ${item.name} (${item.price})`).join("\n")}\n\n¿Me comparten disponibilidad y tiempo de entrega?`
      : "Hola, quiero conocer la disponibilidad del menú de hoy.";
    window.open(`https://wa.me/528181681933?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });
};

const initReservation = () => {
  const form = $('[data-reservation-form]');
  if (!form) return;
  const dateInput = form.elements.date;
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const dateValue = String(data.get("date") || "");
    const timeValue = String(data.get("time") || "");
    const selectedDate = dateValue ? new Date(`${dateValue}T12:00:00`) : null;
    const isTuesday = selectedDate?.getDay() === 2;

    if (isTuesday && timeValue && timeValue < "14:00") {
      window.alert("Los martes abrimos nuevamente a partir de las 2:00 PM. Elige un horario posterior, por favor.");
      return;
    }

    const message = [
      "Hola, quiero reservar una mesa.",
      `Nombre: ${data.get("name")}`,
      `WhatsApp: ${data.get("phone")}`,
      `Fecha: ${data.get("date")}`,
      `Hora: ${data.get("time")}`,
      `Personas: ${data.get("people")}`,
      `Area preferida: ${data.get("area")}`,
      data.get("note") ? `Nota: ${data.get("note")}` : ""
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/528181681933?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });
};

const renderPublicCatalog = (catalog) => {
  const products = getVisibleItems(catalog.products);
  const drinks = getVisibleItems(catalog.drinks);
  const team = getVisibleItems(catalog.team);

  menuItems = products;
  if (menuIndex >= menuItems.length) menuIndex = 0;
  renderMechanism();

  const productGrid = $("[data-products-grid]");
  if (productGrid) {
    productGrid.innerHTML = products.length
      ? products.map((item) => productCardMarkup(item)).join("")
      : emptyMarkup("No hay productos disponibles por ahora.");
  }

  const drinksGrid = $("[data-drinks-grid]");
  if (drinksGrid) {
    drinksGrid.innerHTML = drinks.length
      ? drinks.map((item) => productCardMarkup(item, "drink-card")).join("")
      : emptyMarkup("No hay bebidas disponibles por ahora.");
  }

  const teamGrid = $("[data-team-grid]");
  if (teamGrid) {
    teamGrid.innerHTML = team.length
      ? team
          .map(
            (member) => `
              <article class="team-card" data-reveal>
                <figure>
                  <img src="${escapeHtml(imgSrc(member))}" alt="${escapeHtml(member.name)}" loading="lazy">
                </figure>
                <div>
                  <span>${escapeHtml(member.role || "Equipo")}</span>
                  <h3>${escapeHtml(member.name)}</h3>
                  <p>${escapeHtml(member.description)}</p>
                  <div class="member-socials">
                    ${
                      member.facebook
                        ? `<a href="${escapeHtml(member.facebook)}" target="_blank" rel="noopener" aria-label="Facebook de ${escapeHtml(member.name)}">f</a>`
                        : ""
                    }
                    ${
                      member.instagram
                        ? `<a href="${escapeHtml(member.instagram)}" target="_blank" rel="noopener" aria-label="Instagram de ${escapeHtml(member.name)}">ig</a>`
                        : ""
                    }
                  </div>
                </div>
              </article>
            `
          )
          .join("")
      : emptyMarkup("El equipo estara disponible pronto.");
  }

  revealOnScroll();
};

const refreshPublicCatalog = async () => {
  const catalog = await loadCatalog();
  const hash = JSON.stringify(catalog);
  if (hash === lastCatalogHash) return;
  lastCatalogHash = hash;
  renderPublicCatalog(catalog);
};

const initHeader = () => {
  const header = $("[data-header]");
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");

  window.addEventListener("scroll", () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  });

  toggle?.addEventListener("click", () => {
    const open = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      document.body.classList.remove("nav-open");
      toggle?.setAttribute("aria-expanded", "false");
    }
  });
};

const initHorizontalRail = () => {
  const rail = document.body.dataset.page === "home" ? $("main") : null;
  if (!rail) return;

  rail.setAttribute("tabindex", "0");

  rail.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const panel = event.target.closest("main > *");
      if (!panel || panel.scrollHeight > panel.clientHeight + 4) return;
      event.preventDefault();
      rail.scrollBy({ left: event.deltaY, behavior: "auto" });
    },
    { passive: false }
  );

  rail.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    rail.scrollBy({ left: event.key === "ArrowRight" ? rail.clientWidth : -rail.clientWidth, behavior: "smooth" });
  });

  const navLinks = $$('[data-nav] a[href^="#"]');
  const panels = $$('main > [id]');
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      navLinks.forEach((link) => {
        const current = link.getAttribute("href") === `#${active.target.id}`;
        link.classList.toggle("is-current", current);
        if (current) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    },
    { root: rail, threshold: 0.6 }
  );
  panels.forEach((panel) => observer.observe(panel));
};

const revealOnScroll = () => {
  const revealItems = $$("[data-reveal]");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -40px" }
  );

  revealItems.forEach((item) => {
    if (!item.classList.contains("is-visible")) observer.observe(item);
  });
};

const initPublic = async () => {
  initHeader();
  initHorizontalRail();
  initMechanismControls();
  initMenuBook();
  initSelection();
  initReservation();
  await refreshPublicCatalog();
  menuTimer = window.setInterval(() => {
    if (!document.hidden) moveMechanism(1);
  }, 5200);
  window.setInterval(refreshPublicCatalog, REFRESH_MS);
  window.addEventListener("storage", (event) => {
    if (event.key === CATALOG_KEY) refreshPublicCatalog();
  });
};

const showToast = (message) => {
  const toast = $(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-active");
  window.setTimeout(() => toast.classList.remove("is-active"), 2600);
};

const getToken = () => window.sessionStorage.getItem(TOKEN_KEY) || "";
const setToken = (token) => window.sessionStorage.setItem(TOKEN_KEY, token);
const clearToken = () => window.sessionStorage.removeItem(TOKEN_KEY);

const checkAdminToken = async (token) => {
  if (!isHttp()) return Boolean(token);
  await fetchJson("/api/admin-check", {
    method: "POST",
    headers: { "X-Admin-Token": token }
  });
  return true;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const uploadImage = async (file, token) => {
  if (!file) return "";
  const dataUrl = await fileToDataUrl(file);

  if (!isHttp()) return dataUrl;

  const payload = await fetchJson("/api/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token
    },
    body: JSON.stringify({ filename: file.name, dataUrl })
  });
  return payload.url;
};

const adminState = {
  catalog: emptyCatalog(),
  activePanel: "products"
};

const getCollection = (type) => adminState.catalog[type] || [];

const setCollection = (type, items) => {
  adminState.catalog = normalizeCatalog({
    ...adminState.catalog,
    [type]: items,
    updatedAt: new Date().toISOString()
  });
};

const parseTags = (value) =>
  String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const serializeAdminForm = async (form, type) => {
  const formData = new FormData(form);
  const file = formData.get("imageFile");
  const uploadedImage = file && file.size ? await uploadImage(file, getToken()) : "";
  const base = {
    id: formData.get("id") || slugify(formData.get("name")),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    image: uploadedImage || String(formData.get("image") || "").trim(),
    available: formData.get("available") === "on"
  };

  if (type === "team") {
    return {
      ...base,
      role: String(formData.get("role") || "").trim(),
      facebook: String(formData.get("facebook") || "").trim(),
      instagram: String(formData.get("instagram") || "").trim()
    };
  }

  return {
    ...base,
    price: String(formData.get("price") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    tags: parseTags(formData.get("tags"))
  };
};

const resetAdminForm = (type) => {
  const form = $(`[data-admin-form="${type}"]`);
  if (!form) return;
  form.reset();
  form.elements.id.value = "";
  if (form.elements.available) form.elements.available.checked = true;
  $(`[data-admin-panel="${type}"] .admin-panel-heading h2`).textContent =
    type === "team" ? "Integrantes" : type === "drinks" ? "Bebidas" : "Productos";
};

const fillAdminForm = (type, item) => {
  const form = $(`[data-admin-form="${type}"]`);
  if (!form) return;
  form.elements.id.value = item.id;
  form.elements.name.value = item.name || "";
  form.elements.description.value = item.description || "";
  form.elements.image.value = item.image || "";
  form.elements.available.checked = Boolean(item.available);

  if (type === "team") {
    form.elements.role.value = item.role || "";
    form.elements.facebook.value = item.facebook || "";
    form.elements.instagram.value = item.instagram || "";
  } else {
    form.elements.price.value = item.price || "";
    form.elements.category.value = item.category || "";
    form.elements.tags.value = (item.tags || []).join(", ");
  }

  form.scrollIntoView({ behavior: "smooth", block: "center" });
};

const renderAdminList = (type) => {
  const list = $(`[data-admin-list="${type}"]`);
  if (!list) return;

  const items = getCollection(type);
  if (!items.length) {
    list.innerHTML = emptyMarkup("No hay elementos en esta seccion.");
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
        <article class="admin-item">
          <img src="${escapeHtml(imgSrc(item))}" alt="${escapeHtml(item.name)}" loading="lazy">
          <div>
            <span class="${item.available ? "status-on" : "status-off"}">${item.available ? "Disponible" : "Oculto"}</span>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(type === "team" ? item.role : `${item.category || "Sin categoria"} / ${item.price || "Sin precio"}`)}</p>
          </div>
          <div class="admin-item-actions">
            <button class="btn btn-secondary" type="button" data-edit-item="${escapeHtml(item.id)}" data-type="${type}">Editar</button>
            <button class="btn btn-quiet" type="button" data-delete-item="${escapeHtml(item.id)}" data-type="${type}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
};

const renderAdmin = () => {
  ["products", "drinks", "team"].forEach(renderAdminList);
};

const persistAdminCatalog = async (message = "Cambios guardados.") => {
  adminState.catalog = await saveCatalog(adminState.catalog, getToken());
  renderAdmin();
  showToast(message);
};

const switchAdminPanel = (panel) => {
  adminState.activePanel = panel;
  $$(".admin-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.adminTab === panel));
  $$(".admin-panel").forEach((node) => node.classList.toggle("is-active", node.dataset.adminPanel === panel));
};

const bindAdminEvents = () => {
  $$(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => switchAdminPanel(button.dataset.adminTab));
  });

  $$("[data-reset-form]").forEach((button) => {
    button.addEventListener("click", () => resetAdminForm(button.dataset.resetForm));
  });

  $$("[data-admin-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const type = form.dataset.adminForm;
      try {
        const item = await serializeAdminForm(form, type);
        const items = getCollection(type);
        const index = items.findIndex((entry) => entry.id === item.id);
        const nextItems = index >= 0 ? items.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...items];
        setCollection(type, nextItems);
        await persistAdminCatalog(index >= 0 ? "Elemento actualizado." : "Elemento creado.");
        resetAdminForm(type);
      } catch (error) {
        showToast(error.message || "No se pudo guardar.");
      }
    });
  });

  document.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-item]");
    const deleteButton = event.target.closest("[data-delete-item]");

    if (editButton) {
      const type = editButton.dataset.type;
      const item = getCollection(type).find((entry) => entry.id === editButton.dataset.editItem);
      if (item) fillAdminForm(type, item);
    }

    if (deleteButton) {
      const type = deleteButton.dataset.type;
      const item = getCollection(type).find((entry) => entry.id === deleteButton.dataset.deleteItem);
      if (!item || !window.confirm(`Eliminar "${item.name}"?`)) return;
      setCollection(
        type,
        getCollection(type).filter((entry) => entry.id !== item.id)
      );
      try {
        await persistAdminCatalog("Elemento eliminado.");
      } catch (error) {
        showToast(error.message || "No se pudo eliminar.");
      }
    }
  });

  $("[data-export-catalog]")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(adminState.catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `catalogo-ctlr-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  $("[data-import-catalog]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      adminState.catalog = normalizeCatalog(JSON.parse(text));
      await persistAdminCatalog("Catalogo importado.");
    } catch (error) {
      showToast(error.message || "No se pudo importar.");
    }
    event.target.value = "";
  });

  $("[data-refresh-catalog]")?.addEventListener("click", async () => {
    adminState.catalog = await loadCatalog();
    renderAdmin();
    showToast("Datos recargados.");
  });

  $("[data-admin-logout]")?.addEventListener("click", () => {
    clearToken();
    window.location.reload();
  });
};

const showAdminApp = async () => {
  $("[data-admin-login]")?.setAttribute("hidden", "");
  $("[data-admin-app]")?.removeAttribute("hidden");
  adminState.catalog = await loadCatalog();
  renderAdmin();
};

const initAdmin = async () => {
  bindAdminEvents();
  const storedToken = getToken();
  if (storedToken) {
    try {
      await checkAdminToken(storedToken);
      await showAdminApp();
      return;
    } catch {
      clearToken();
    }
  }

  const form = $("[data-admin-auth]");
  const message = $("[data-admin-auth-message]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = String(new FormData(form).get("token") || "").trim();
    try {
      await checkAdminToken(token);
      setToken(token);
      await showAdminApp();
    } catch (error) {
      if (message) message.textContent = error.message || "Clave incorrecta.";
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-ready");

  if (document.body.dataset.page === "admin") {
    initAdmin();
    return;
  }

  initPublic();
});
