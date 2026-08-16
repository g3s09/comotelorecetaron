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
          available: Boolean(item.available),
          options: Array.isArray(item.options)
            ? item.options.map((option) => ({
                id: option.id || slugify(option.label || "opcion"),
                label: option.label || "",
                type: option.type || "single",
                choices: Array.isArray(option.choices) ? option.choices.filter(Boolean) : []
              }))
            : []
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
          tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
          details: Array.isArray(item.details) ? item.details.filter(Boolean) : []
        };
      })
    : [];

const completeMenu = typeof window !== "undefined" && window.CTLR_COMPLETE_MENU ? window.CTLR_COMPLETE_MENU : {};

const mergeCatalogItems = (items = [], type = "products") => {
  const extras = Array.isArray(completeMenu[type]) ? completeMenu[type] : [];
  const merged = new Map();
  normalizeArray(extras, type).forEach((item) => merged.set(item.id, item));
  normalizeArray(items, type).forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

const normalizeCatalog = (catalog = {}) => ({
  version: 1,
  updatedAt: catalog.updatedAt || new Date().toISOString(),
  products: mergeCatalogItems(catalog.products, "products"),
  drinks: mergeCatalogItems(catalog.drinks, "drinks"),
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
      let catalog;
      try {
        catalog = normalizeCatalog(await fetchJson(`/api/catalog?ts=${Date.now()}`));
      } catch {
        catalog = normalizeCatalog(await fetchJson(`data/catalog.json?ts=${Date.now()}`));
      }
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

const hasOptions = (item) => Array.isArray(item.options) && item.options.some((option) => option.choices.length);

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
      ${
        hasOptions(item)
          ? `<p class="option-hint">Personaliza: ${escapeHtml(item.options.map((option) => option.label).join(" · "))}</p>`
          : ""
      }
      <button class="card-add" type="button" data-add-item data-item-id="${escapeHtml(item.id)}" data-item-name="${escapeHtml(item.name)}" data-item-price="${escapeHtml(item.price)}" data-item-category="${escapeHtml(item.category || "Especial")}">${hasOptions(item) ? "Personalizar" : "Agregar a mi selección"} <span aria-hidden="true">+</span></button>
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
let allOrderItems = [];
let revealObserver;
let activeOrderCategory = "Cortes";
let activeMenuCategory = "Cortes";
let modalItem = null;

const categoryRules = {
  Todos: () => true,
  Entradas: (item) => ["Entradas", "Tradicionales"].includes(item.category),
  Especialidades: (item) => ["Birria", "Molcajetes", "Queso Fundido", "Especialidades"].includes(item.category),
  Birria: (item) => item.category === "Birria",
  Tacos: (item) => ["Tacos", "Gramaje"].includes(item.category),
  Cortes: (item) => item.category === "Cortes",
  Hamburguesas: (item) => item.category === "Hamburguesas",
  Bebidas: (item) => item.kind === "drink",
  Cocteleria: (item) => item.kind === "drink" && /cocteler[ií]a|internacional|mocktails/i.test(item.category || "")
};

const categoryCopy = {
  Todos: ["Carta completa", "Explora todas las opciones disponibles."],
  Entradas: ["Entradas y tradicionales", "Para comenzar al centro y abrir el apetito."],
  Especialidades: ["Especialidades de la casa", "Birria, molcajetes y queso fundido con el sello de la brasa."],
  Birria: ["Birria de la casa", "Consome, tacos y sabores de coccion lenta."],
  Tacos: ["Antojitos y tacos", "Tacos para compartir como se debe: con tortillas, cebolla y cilantro."],
  Cortes: ["Cortes y parrilla", "Elige el corte que quieres llevar a la mesa."],
  Hamburguesas: ["Hamburguesas al carbon", "Carne, tocino, quesos y extras para armar tu favorita."],
  Bebidas: ["Bebidas y postres", "Opciones para acompanar humo, sal y fuego."],
  Cocteleria: ["Cocteleria de la casa", "Clasicos, internacionales y mocktails para acompanar el fuego."]
};

const matchesCategory = (item, category) => (categoryRules[category] || categoryRules.Todos)(item);

const updateOrderFilterControls = () => {
  $$('[data-order-filter]').forEach((button) => {
    button.classList.toggle("is-active", button.dataset.orderFilter === activeOrderCategory);
  });
};

const updateMenuBook = (category) => {
  const book = $('[data-menu-book]');
  if (!book) return;
  const tab = $$('[data-menu-tab]', book).find((item) => item.dataset.menuFilter === category);
  const tabs = $$('[data-menu-tab]', book);
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
  });
  const menuViews = {
    Todos: { image: "assets/menu-especialidades.png", title: "Carta completa", note: "Todo el sabor de Como Te Lo Recetaron: cocina al carbón, antojitos, bebidas y postres." },
    Birria: { image: "assets/menu-especialidades.png", title: "Birria de la casa", note: "Consomé, tacos y quesabirrias preparados a tu gusto." },
    Tacos: { image: "assets/menu-antojitos.png", title: "Antojitos y tacos", note: "Tacos y órdenes con los complementos que tú eliges." },
    Especialidades: { image: "assets/menu-especialidades.png", title: "Especialidades de la casa", note: "Birria, molcajetes y queso fundido con el sello de la brasa." },
    Bebidas: { image: "assets/menu-bebidas.png", title: "Bebidas, postres y para festejar", note: "Aguas frescas, bebidas calientes, cervezas, mocktails y postres." },
    Cocteleria: { image: "assets/menu-cocteleria.png", title: "Coctelería de la casa", note: "Cocteles de la casa, internacionales y mocktails para acompañar el fuego." }
  };
  const view = tab
    ? { image: tab.dataset.menuImage, title: tab.dataset.menuTitle, note: tab.dataset.menuNote }
    : menuViews[category] || menuViews.Todos;

  const image = $('[data-menu-book-image]', book);
  const title = $('[data-menu-book-title]', book);
  const note = $('[data-menu-book-note]', book);
  if (image && image.getAttribute("src") !== view.image) {
    image.classList.add("is-switching");
    window.setTimeout(() => {
      image.src = view.image || image.src;
      image.alt = "Carta de " + (view.title || "Como Te Lo Recetaron");
      image.classList.remove("is-switching");
    }, 120);
  }
  if (title) title.textContent = view.title || "Carta de la casa";
  if (note) note.textContent = view.note || "Consulta nuestra seleccion de temporada.";
};

const renderFeaturedMenu = () => {
  const grid = $('[data-products-grid]');
  const copy = categoryCopy[activeMenuCategory] || categoryCopy.Todos;
  const kicker = $('[data-featured-menu-kicker]');
  const title = $('[data-featured-menu-title]');
  const visible = allOrderItems.filter((item) => matchesCategory(item, activeMenuCategory));

  if (kicker) kicker.textContent = copy[0];
  if (title) title.textContent = copy[1];
  if (grid) {
    grid.innerHTML = visible.length
      ? visible.map((item) => productCardMarkup(item, item.kind === "drink" ? "drink-card" : "")).join("")
      : emptyMarkup("No hay opciones disponibles en esta seccion por ahora.");
  }
  revealOnScroll();
};

const selectMenuCategory = (category) => {
  activeMenuCategory = category;
  activeOrderCategory = category;
  updateMenuBook(category);
  updateOrderFilterControls();
  renderFeaturedMenu();
  renderOrderGrid();
  const menuPanel = $("#menu");
  if (menuPanel) menuPanel.scrollTo({ top: 0, behavior: "smooth" });
};

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
  const book = $('[data-menu-book]');
  if (!book) return;
  $$('[data-menu-tab]', book).forEach((tab) => {
    tab.addEventListener("click", () => selectMenuCategory(tab.dataset.menuFilter || "Todos"));
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

const optionSummary = (item) => {
  const parts = [];
  if (Array.isArray(item.options)) parts.push(...item.options.filter(Boolean));
  if (item.notes) parts.push(`Nota: ${item.notes}`);
  return parts.join(" / ");
};

const selectionKeyFor = (item) =>
  [item.id, ...(item.options || []), item.notes || ""].join("|").toLowerCase();

const addSelectionItem = (item) => {
  const items = getSelection();
  const key = selectionKeyFor(item);
  const existing = items.find((entry) => selectionKeyFor(entry) === key);
  if (existing) existing.qty += 1;
  else items.push({ ...item, qty: 1 });
  saveSelection(items);
  renderSelection();
};

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
              <div><span>${escapeHtml(item.category || "Especial")}</span><h3>${escapeHtml(item.name)}</h3><small>${escapeHtml(item.price || "")}</small>${optionSummary(item) ? `<p>${escapeHtml(optionSummary(item))}</p>` : ""}</div>
              <div class="cart-item-actions"><b>x${item.qty}</b><button type="button" data-remove-selection="${escapeHtml(selectionKeyFor(item))}" aria-label="Quitar ${escapeHtml(item.name)}">−</button></div>
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

const closeItemModal = () => {
  const modal = $("[data-item-modal]");
  const form = $("[data-item-modal-form]");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("item-modal-open");
  modalItem = null;
  form?.reset();
};

const openItemModal = (item) => {
  const modal = $("[data-item-modal]");
  const form = $("[data-item-modal-form]");
  if (!modal || !form) return;
  const options = $("[data-item-modal-options]", modal);
  if (!options) return;

  modalItem = item;
  $("[data-item-modal-category]", modal).textContent = item.category || "Menu";
  $("[data-item-modal-title]", modal).textContent = item.name || "";
  $("[data-item-modal-description]", modal).textContent = item.description || "";
  $("[data-item-modal-price]", modal).textContent = item.price || "";
  options.innerHTML = item.options
    .map(
      (option) => `
        <fieldset class="custom-option">
          <legend>${escapeHtml(option.label)}</legend>
          <p class="custom-option-prompt">Elige una opci?n</p>
          <div class="custom-option-choices">
          ${option.choices
            .map(
              (choice, index) => `
                <label>
                  <input type="radio" name="${escapeHtml(option.id)}" value="${escapeHtml(choice)}" ${index === 0 ? "checked" : ""}>
                  <span>${escapeHtml(choice)}</span>
                </label>
              `
            )
            .join("")}
          </div>
        </fieldset>
      `
    )
    .join("");

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("item-modal-open");
};

const initSelection = () => {
  renderSelection();

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-item]");
    const removeButton = event.target.closest("[data-remove-selection]");

    if (addButton) {
      const id = addButton.dataset.itemId;
      const catalogItem = allOrderItems.find((item) => item.id === id);
      if (catalogItem && hasOptions(catalogItem)) {
        openItemModal(catalogItem);
        return;
      }
      addSelectionItem({
        id,
        name: addButton.dataset.itemName,
        price: addButton.dataset.itemPrice,
        category: addButton.dataset.itemCategory,
        options: [],
        notes: ""
      });
      addButton.classList.add("is-added");
      addButton.innerHTML = "Agregado · sumar otro <span aria-hidden=\"true\">+</span>";
      window.setTimeout(() => addButton.classList.remove("is-added"), 900);
    }

    if (removeButton) {
      const items = getSelection().flatMap((item) => {
        if (selectionKeyFor(item) !== removeButton.dataset.removeSelection) return [item];
        if (item.qty > 1) return [{ ...item, qty: item.qty - 1 }];
        return [];
      });
      saveSelection(items);
      renderSelection();
    }
  });

  $$('[data-open-cart]').forEach((button) => button.addEventListener("click", openCart));
  $$('[data-close-cart]').forEach((button) => button.addEventListener("click", closeCart));
  $$('[data-close-item-modal]').forEach((button) => button.addEventListener("click", closeItemModal));
  $('[data-item-modal-form]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!modalItem) return;
    const data = new FormData(event.currentTarget);
    const selectedOptions = modalItem.options
      .map((option) => {
        const value = data.get(option.id);
        return value ? `${option.label}: ${value}` : "";
      })
      .filter(Boolean);
    addSelectionItem({
      id: modalItem.id,
      name: modalItem.name,
      price: modalItem.price,
      category: modalItem.category,
      options: selectedOptions,
      notes: String(data.get("notes") || "").trim()
    });
    closeItemModal();
    openCart();
  });
  $('[data-clear-selection]')?.addEventListener("click", () => {
    saveSelection([]);
    renderSelection();
  });
  $('[data-send-selection]')?.addEventListener("click", () => {
    const items = getSelection();
    const message = items.length
      ? `Hola, quiero pedir:\n${items.map((item) => `• ${item.qty} x ${item.name} (${item.price})${optionSummary(item) ? `\n  ${optionSummary(item)}` : ""}`).join("\n")}\n\n¿Me comparten disponibilidad y tiempo de entrega?`
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


const renderOrderGrid = () => {
  const grid = $("[data-order-grid]");
  if (!grid) return;
  const visible = allOrderItems.filter((item) => matchesCategory(item, activeOrderCategory));
  grid.innerHTML = visible.length
    ? visible.map((item) => productCardMarkup(item, item.kind === "drink" ? "drink-card" : "")).join("")
    : emptyMarkup("No hay productos en esta categoria por ahora.");
  revealOnScroll();
};

const initOrderFilters = () => {
  $$('[data-order-filter]').forEach((button) => {
    button.addEventListener("click", () => selectMenuCategory(button.dataset.orderFilter || "Todos"));
  });
};

const renderPublicCatalog = (catalog) => {
  const products = getVisibleItems(catalog.products);
  const drinks = getVisibleItems(catalog.drinks);
  const team = getVisibleItems(catalog.team);

  menuItems = products;
  allOrderItems = [
    ...products.map((item) => ({ ...item, kind: "food" })),
    ...drinks.map((item) => ({ ...item, kind: "drink" }))
  ];
  if (menuIndex >= menuItems.length) menuIndex = 0;
  renderMechanism();

  selectMenuCategory(activeMenuCategory);

  const drinksGrid = $("[data-drinks-grid]");
  if (drinksGrid) {
    drinksGrid.innerHTML = drinks.length
      ? drinks.map((item) => productCardMarkup(item, "drink-card")).join("")
      : emptyMarkup("No hay bebidas disponibles por ahora.");
  }

  renderOrderGrid();

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
  let frameId = 0;

  const updateHeader = () => {
    frameId = 0;
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  const scheduleHeaderUpdate = () => {
    if (!frameId) frameId = window.requestAnimationFrame(updateHeader);
  };

  document.addEventListener("scroll", scheduleHeaderUpdate, { capture: true, passive: true });
  updateHeader();

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


const initWelcome = () => {
  const intro = $("[data-welcome-intro]");
  if (!intro) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dismiss = () => {
    if (intro.classList.contains("is-leaving")) return;
    intro.classList.add("is-leaving");
    window.setTimeout(() => intro.remove(), reducedMotion ? 80 : 560);
  };

  window.setTimeout(dismiss, reducedMotion ? 180 : 1650);
  intro.addEventListener("click", dismiss, { once: true });
  window.addEventListener("keydown", dismiss, { once: true });
};

const initHorizontalRail = () => {
  const rail = document.body.dataset.page === "home" ? $("main") : null;
  if (!rail) return;

  rail.setAttribute("tabindex", "0");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = Array.from(rail.children).filter((panel) => panel instanceof HTMLElement);
  const dial = $("[data-rail-dial]");
  const current = $("[data-rail-current]");
  const total = $("[data-rail-total]");
  let wheelDelta = 0;
  let wheelResetTimer;
  let lockedUntil = 0;
  let settleTimer;
  let railFrameId = 0;
  let touchStart = null;
  let touchAxis = null;
  const navLinks = $$('[data-nav] a[href^="#"]');
  const panelLinks = $$('[data-nav] a[href^="#"], .hero-actions a[href^="#"], .brand-lockup[href^="#"]');

  if (total) total.textContent = String(panels.length).padStart(2, "0");

  const currentIndex = () => {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    return panels.reduce(
      (best, panel, index) => (Math.abs(panel.offsetLeft + panel.offsetWidth / 2 - center) < Math.abs(panels[best].offsetLeft + panels[best].offsetWidth / 2 - center) ? index : best),
      0
    );
  };

  const updateDial = () => {
    const index = currentIndex();
    if (current) current.textContent = String(index + 1).padStart(2, "0");
    if (dial) dial.style.setProperty("--rail-progress", String((index + 1) / Math.max(panels.length, 1)));
  };

  const goToPanel = (index) => {
    const next = panels[Math.max(0, Math.min(index, panels.length - 1))];
    if (!next) return;
    const start = rail.scrollLeft;
    const destination = next.offsetLeft;
    const distance = destination - start;
    if (Math.abs(distance) < 1) return;

    window.cancelAnimationFrame(railFrameId);
    if (prefersReducedMotion) {
      rail.scrollLeft = destination;
      updateDial();
      return;
    }

    const compactScreen = window.matchMedia("(max-width: 820px)").matches;
    const duration = Math.min(Math.max(compactScreen ? 720 : 620, Math.abs(distance) * 0.62), compactScreen ? 920 : 760);
    const startedAt = performance.now();
    lockedUntil = Date.now() + duration + 140;

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      rail.scrollLeft = start + distance * eased;
      if (progress < 1) railFrameId = window.requestAnimationFrame(step);
      else {
        railFrameId = 0;
        updateDial();
      }
    };
    railFrameId = window.requestAnimationFrame(step);
  };

  const canScrollInside = (target, direction) => {
    const panel = target instanceof Element ? target.closest("main > *") : null;
    if (!panel || panel.scrollHeight <= panel.clientHeight + 8) return false;
    const hasRoom = direction > 0 ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 4 : panel.scrollTop > 4;
    return hasRoom && !target.closest(".menu-book-nav, .order-filters");
  };

  panelLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = $(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      const index = panels.indexOf(target);
      if (index >= 0) goToPanel(index);
    });
  });

  rail.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (canScrollInside(event.target, event.deltaY)) return;

      event.preventDefault();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? rail.clientWidth : 1;
      wheelDelta += event.deltaY * unit;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => { wheelDelta = 0; }, 230);
      if (Date.now() < lockedUntil || Math.abs(wheelDelta) < 68) return;
      goToPanel(currentIndex() + (wheelDelta > 0 ? 1 : -1));
      wheelDelta = 0;
    },
    { passive: false }
  );

  rail.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.target.closest("input, textarea, select, [contenteditable=\"true\"]")) return;
    event.preventDefault();
    goToPanel(currentIndex() + (event.key === "ArrowRight" ? 1 : -1));
  });

  rail.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY, target: event.target } : null;
    touchAxis = null;
  }, { passive: true });

  rail.addEventListener("touchmove", (event) => {
    if (!touchStart) return;
    const touch = event.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    if (!touchAxis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 10) {
      touchAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }
    const controlsOwnSwipe = touchStart.target instanceof Element && touchStart.target.closest(".menu-book-nav, .order-filters, .cart-drawer, .item-modal");
    if (touchAxis === "horizontal" && !controlsOwnSwipe) event.preventDefault();
  }, { passive: false });

  rail.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const wasHorizontal = touchAxis === "horizontal";
    touchStart = null;
    touchAxis = null;
    if (!wasHorizontal || Math.abs(deltaX) < 46 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    goToPanel(currentIndex() + (deltaX < 0 ? 1 : -1));
  }, { passive: true });

  rail.addEventListener("scroll", () => {
    updateDial();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (Date.now() >= lockedUntil) goToPanel(currentIndex());
    }, 180);
  }, { passive: true });

  updateDial();
  if (!("IntersectionObserver" in window)) return;
  const navigablePanels = panels.filter((panel) => panel.id);
  const observer = new IntersectionObserver(
    (entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      navLinks.forEach((link) => {
        const current = link.getAttribute("href") === "#" + active.target.id;
        link.classList.toggle("is-current", current);
        if (current) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    },
    { root: rail, threshold: 0.6 }
  );
  navigablePanels.forEach((panel) => observer.observe(panel));
};


const revealOnScroll = () => {
  const revealItems = $$("[data-reveal]");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px" }
    );
  }

  revealItems.forEach((item) => {
    if (!item.classList.contains("is-visible")) revealObserver.observe(item);
  });
};

const initPublic = async () => {
  initHeader();
  initWelcome();
  initHorizontalRail();
  initMechanismControls();
  initMenuBook();
  initSelection();
  initReservation();
  initOrderFilters();
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
