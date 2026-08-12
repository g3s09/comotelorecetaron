const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(rootDir, "uploads");
const catalogFile = path.join(dataDir, "catalog.json");
const port = Number(process.env.PORT || 4173);
const adminToken = process.env.CTLR_ADMIN_TOKEN || "brasas1933";

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

const ensureDataFiles = () => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(catalogFile)) {
    fs.writeFileSync(
      catalogFile,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), products: [], drinks: [], team: [] }, null, 2)
    );
  }
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
      available: Boolean(item.available)
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
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : []
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
  ensureDataFiles();

  if (request.method === "GET") {
    const catalog = fs.readFileSync(catalogFile, "utf8");
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    response.end(catalog);
    return;
  }

  if (request.method === "PUT") {
    if (!requireAdmin(request, response)) return;
    try {
      const body = await collectBody(request);
      const catalog = normalizeCatalog(JSON.parse(body || "{}"));
      fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2));
      sendJson(response, 200, catalog);
    } catch (error) {
      sendJson(response, 400, { error: error.message || "No se pudo guardar el catalogo." });
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
    ensureDataFiles();
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
    const target = path.join(uploadDir, filename);
    fs.writeFileSync(target, bytes);
    sendJson(response, 200, { url: `uploads/${filename}` });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "No se pudo subir la imagen." });
  }
};

const handleAdminCheck = (request, response) => {
  if (!requireAdmin(request, response)) return;
  sendJson(response, 200, { ok: true });
};

const serveStatic = (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(rootDir, relativePath);

  if (!filePath.startsWith(rootDir)) {
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

ensureDataFiles();

http
  .createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

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

    serveStatic(request, response);
  })
  .listen(port, () => {
    console.log(`Como Te Lo Recetaron listo en http://localhost:${port}`);
    console.log("Panel interno: /admin.html");
  });
