const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(rootDir, "uploads");
const catalogFile = path.join(dataDir, "catalog.json");
const reservationFile = path.join(dataDir, "reservations.json");
const port = Number(process.env.PORT || 4173);
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const adminToken = process.env.CTLR_ADMIN_TOKEN || (isVercel ? "" : "brasas1933");
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const catalogRowId = "public";
const imageBucket = "ctlr-images";

let completeMenu = { products: [], drinks: [] };
try {
  completeMenu = require(path.join(dataDir, "catalog-complete.js"));
} catch (error) {
  console.error("No se pudo cargar la carta completa incluida.", error);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const hasSupabase = () => Boolean(supabaseUrl && supabaseServiceRoleKey);

const ensureDataFiles = () => {
  if (isVercel) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(catalogFile)) {
    fs.writeFileSync(
      catalogFile,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), products: [], drinks: [], team: [] }, null, 2)
    );
  }
  if (!fs.existsSync(reservationFile)) fs.writeFileSync(reservationFile, "[]", "utf8");
};

const databaseError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
};

const mergeCatalogCollection = (complete = [], current = []) => {
  const merged = new Map();
  complete.forEach((item) => merged.set(item.id, item));
  current.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

const withCompleteMenu = (catalog = {}) => ({
  ...catalog,
  version: 1,
  updatedAt: catalog.updatedAt || new Date().toISOString(),
  products: mergeCatalogCollection(completeMenu.products || [], catalog.products || []),
  drinks: mergeCatalogCollection(completeMenu.drinks || [], catalog.drinks || []),
  team: Array.isArray(catalog.team) ? catalog.team : []
});

const readSeedCatalog = () => {
  if (!fs.existsSync(catalogFile)) {
    return withCompleteMenu({});
  }
  return withCompleteMenu(JSON.parse(fs.readFileSync(catalogFile, "utf8")));
};

const supabaseHeaders = (extra = {}) => ({
  apikey: supabaseServiceRoleKey,
  Authorization: "Bearer " + supabaseServiceRoleKey,
  ...extra
});

const supabaseRequest = async (resource, options = {}) => {
  const response = await fetch(supabaseUrl + resource, {
    cache: "no-store",
    ...options,
    headers: supabaseHeaders(options.headers)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Supabase respondio con " + response.status + ": " + (detail || "sin detalle"));
  }
  return response;
};

const readCatalog = async () => {
  if (!hasSupabase()) return readSeedCatalog();
  try {
    const response = await supabaseRequest("/rest/v1/site_catalog?id=eq." + catalogRowId + "&select=data");
    const rows = await response.json();
    return withCompleteMenu(rows[0]?.data || readSeedCatalog());
  } catch (error) {
    console.error("No se pudo leer Supabase; se usa el catalogo incluido.", error);
    return readSeedCatalog();
  }
};

const writeCatalog = async (catalog) => {
  if (!isVercel) {
    ensureDataFiles();
    fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2));
    return;
  }
  if (!hasSupabase()) {
    throw databaseError("Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel para guardar el catalogo.");
  }
  await supabaseRequest("/rest/v1/site_catalog?on_conflict=id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({ id: catalogRowId, data: catalog, updated_at: new Date().toISOString() })
  });
};
const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Token"
  });
  response.end(JSON.stringify(payload));
};

const sendText = (response, statusCode, message) => {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
};

const collectBody = (request, maxBytes = 8 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error("La solicitud es demasiado grande."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const requireAdmin = (request, response) => {
  if (!adminToken) {
    sendJson(response, 503, { error: "Configura CTLR_ADMIN_TOKEN en Vercel para habilitar el panel." });
    return false;
  }
  if (request.headers["x-admin-token"] === adminToken) return true;
  sendJson(response, 401, { error: "Clave de administrador incorrecta." });
  return false;
};

const normalizeItems = (items, type) => {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const idBase = String(item.id || item.name || `${type}-${index}`).toLowerCase();
    const id = idBase
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const base = {
      id: id || `${type}-${Date.now()}-${index}`,
      name: String(item.name || "").trim(),
      description: String(item.description || "").trim(),
      image: String(item.image || "").trim(),
      available: Boolean(item.available),
      options: Array.isArray(item.options)
        ? item.options.map((option) => ({
            id: String(option.id || option.label || "opcion")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
            label: String(option.label || "").trim(),
            type: String(option.type || "single").trim(),
            choices: Array.isArray(option.choices)
              ? option.choices
                  .map((choice) => {
                    if (choice && typeof choice === "object") {
                      const label = String(choice.label || choice.name || "").trim();
                      return {
                        id: String(choice.id || label)
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, ""),
                        label,
                        description: String(choice.description || "").trim(),
                        price: Number.isFinite(Number(choice.price)) && choice.price !== "" && choice.price != null ? Number(choice.price) : null,
                        priceDelta: Number.isFinite(Number(choice.priceDelta)) && choice.priceDelta !== "" && choice.priceDelta != null ? Number(choice.priceDelta) : 0
                      };
                    }
                    return String(choice).trim();
                  })
                  .filter((choice) => (typeof choice === "string" ? Boolean(choice) : Boolean(choice.label)))
              : []
          }))
        : []
    };

    if (type === "team") {
      return {
        ...base,
        role: String(item.role || "").trim(),
        instagram: String(item.instagram || "").trim(),
        facebook: String(item.facebook || "").trim()
      };
    }

    return {
      ...base,
      price: String(item.price || "").trim(),
      category: String(item.category || "").trim(),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      details: Array.isArray(item.details) ? item.details.map((detail) => String(detail).trim()).filter(Boolean) : []
    };
  });
};

const normalizeCatalog = (catalog) => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  products: normalizeItems(catalog.products, "product"),
  drinks: normalizeItems(catalog.drinks, "drink"),
  team: normalizeItems(catalog.team, "team")
});

const handleCatalog = async (request, response) => {
  if (request.method === "GET") {
    sendJson(response, 200, await readCatalog());
    return;
  }

  if (request.method === "PUT") {
    if (!requireAdmin(request, response)) return;
    try {
      const body = await collectBody(request);
      const catalog = normalizeCatalog(JSON.parse(body || "{}"));
      await writeCatalog(catalog);
      sendJson(response, 200, catalog);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message || "No se pudo guardar el catalogo." });
    }
    return;
  }

  sendJson(response, 405, { error: "Metodo no permitido." });
};

const safeUploadName = (name, mimeType) => {
  const extensionByMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };
  const ext = extensionByMime[mimeType] || path.extname(name).toLowerCase() || ".jpg";
  const base = path
    .basename(name, path.extname(name))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
  return `${base || "imagen"}-${Date.now()}${ext}`;
};

const handleUpload = async (request, response) => {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Metodo no permitido." });
    return;
  }

  if (!requireAdmin(request, response)) return;

  try {
    const body = await collectBody(request, 12 * 1024 * 1024);
    const payload = JSON.parse(body || "{}");
    const match = String(payload.dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      sendJson(response, 400, { error: "Formato de imagen invalido." });
      return;
    }

    const mimeType = match[1];
    const bytes = Buffer.from(match[2], "base64");
    const filename = safeUploadName(String(payload.filename || "imagen"), mimeType);
    if (!isVercel) {
      ensureDataFiles();
      fs.writeFileSync(path.join(uploadDir, filename), bytes);
      sendJson(response, 200, { url: `uploads/${filename}` });
      return;
    }

    if (!hasSupabase()) {
      throw databaseError("Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de subir imagenes desde Vercel.");
    }
    const objectPath = imageBucket + "/" + filename;
    await supabaseRequest("/storage/v1/object/" + objectPath, {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: bytes
    });
    sendJson(response, 200, { url: supabaseUrl + "/storage/v1/object/public/" + objectPath });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message || "No se pudo subir la imagen." });
  }
};

const handleAdminCheck = (request, response) => {
  if (!requireAdmin(request, response)) return;
  sendJson(response, 200, { ok: true });
};

const normalizeReservation = (payload = {}) => ({
  id: String(payload.id || `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  name: String(payload.name || "").trim().slice(0, 120),
  phone: String(payload.phone || "").replace(/[^0-9+]/g, "").slice(0, 25),
  date: String(payload.date || "").slice(0, 10),
  time: String(payload.time || "").slice(0, 5),
  people: String(payload.people || "").trim().slice(0, 40),
  area: String(payload.area || "").trim().slice(0, 40),
  note: String(payload.note || "").trim().slice(0, 800),
  status: "pendiente",
  created_at: new Date().toISOString()
});

const validReservation = (reservation) =>
  Boolean(reservation.name && reservation.phone && /^\d{4}-\d{2}-\d{2}$/.test(reservation.date) && /^\d{2}:\d{2}$/.test(reservation.time) && reservation.people && ["Balcon", "Terraza", "Salon"].includes(reservation.area));

const readReservations = async () => {
  if (!hasSupabase()) {
    ensureDataFiles();
    return JSON.parse(fs.readFileSync(reservationFile, "utf8"));
  }
  const response = await supabaseRequest("/rest/v1/reservations?select=*&order=created_at.desc");
  return response.json();
};

const writeReservation = async (reservation) => {
  if (!isVercel) {
    ensureDataFiles();
    const reservations = await readReservations();
    reservations.unshift(reservation);
    fs.writeFileSync(reservationFile, JSON.stringify(reservations, null, 2));
    return reservation;
  }
  if (!hasSupabase()) throw databaseError("Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel para guardar reservas.");
  await supabaseRequest("/rest/v1/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(reservation)
  });
  return reservation;
};

const handleReservations = async (request, response) => {
  if (request.method === "GET") {
    if (!requireAdmin(request, response)) return;
    try {
      sendJson(response, 200, { reservations: await readReservations() });
    } catch (error) {
      sendJson(response, error.statusCode || 503, { error: error.message || "No se pudieron consultar las reservas." });
    }
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Metodo no permitido." });
    return;
  }

  try {
    const reservation = normalizeReservation(JSON.parse(await collectBody(request, 64 * 1024) || "{}"));
    if (!validReservation(reservation)) {
      sendJson(response, 400, { error: "Completa nombre, WhatsApp, fecha, hora, personas y área para solicitar la reserva." });
      return;
    }
    await writeReservation(reservation);
    sendJson(response, 201, { ok: true, reservation });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message || "No se pudo guardar la reserva." });
  }
};

const serveStatic = (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(rootDir, relativePath);

  if (path.relative(rootDir, filePath).startsWith("..") || path.isAbsolute(path.relative(rootDir, filePath))) {
    sendText(response, 403, "Acceso no permitido.");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendText(response, 404, "Archivo no encontrado.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const noStore = [".html", ".css", ".js", ".json"].includes(extension);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": noStore ? "no-store" : "public, max-age=3600"
    });
    fs.createReadStream(filePath).pipe(response);
  });
};

const handler = async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (requestUrl.pathname === "/api/catalog") {
      await handleCatalog(request, response);
      return;
    }

    if (requestUrl.pathname === "/api/upload-image") {
      await handleUpload(request, response);
      return;
    }

    if (requestUrl.pathname === "/api/admin-check") {
      handleAdminCheck(request, response);
      return;
    }

    if (requestUrl.pathname === "/api/reservations") {
      await handleReservations(request, response);
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    console.error("Error no controlado en la funcion.", error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "No se pudo procesar la solicitud." });
    } else {
      response.end();
    }
  }
};

module.exports = handler;

if (require.main === module) {
  ensureDataFiles();
  http.createServer(handler).listen(port, () => {
    console.log(`Como Te Lo Recetaron listo en http://localhost:${port}`);
    console.log("Panel interno: /admin.html");
  });
}
