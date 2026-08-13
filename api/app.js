const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(rootDir, "uploads");
const catalogFile = path.join(dataDir, "catalog.json");
const port = Number(process.env.PORT || 4173);
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const adminToken = process.env.CTLR_ADMIN_TOKEN || (isVercel ? "" : "brasas1933");
const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";
const catalogBlobPath = "catalog/catalog.json";

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
  if (isVercel) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(catalogFile)) {
    fs.writeFileSync(
      catalogFile,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), products: [], drinks: [], team: [] }, null, 2)
    );
  }
};

const storageError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
};

const readSeedCatalog = () => {
  if (!fs.existsSync(catalogFile)) {
    return JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), products: [], drinks: [], team: [] });
  }
  return fs.readFileSync(catalogFile, "utf8");
};

const loadBlob = async () => {
  if (!blobToken) return null;
  return import("@vercel/blob");
};

const readCatalog = async () => {
  if (!isVercel || !blobToken) {
    ensureDataFiles();
    return readSeedCatalog();
  }

  try {
    const { list } = await loadBlob();
    const { blobs } = await list({ prefix: catalogBlobPath, token: blobToken });
    const catalogBlob = blobs.find((blob) => blob.pathname === catalogBlobPath);
    if (!catalogBlob) return readSeedCatalog();

    const response = await fetch(catalogBlob.url, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer el catalogo almacenado.");
    return response.text();
  } catch (error) {
    console.error("No se pudo leer Vercel Blob; se usa el catalogo incluido.", error);
    return readSeedCatalog();
  }
};

const writeCatalog = async (catalog) => {
  const serialized = JSON.stringify(catalog, null, 2);
  if (!isVercel) {
    ensureDataFiles();
    fs.writeFileSync(catalogFile, serialized);
    return;
  }

  const blob = await loadBlob();
  if (!blob) {
    throw storageError("Para guardar desde Vercel, conecta Vercel Blob y agrega BLOB_READ_WRITE_TOKEN.");
  }

  await blob.put(catalogBlobPath, serialized, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    token: blobToken
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
            choices: Array.isArray(option.choices) ? option.choices.map((choice) => String(choice).trim()).filter(Boolean) : []
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
    const catalog = await readCatalog();
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

    const blob = await loadBlob();
    if (!blob) {
      throw storageError("Para subir imagenes desde Vercel, conecta Vercel Blob y agrega BLOB_READ_WRITE_TOKEN.");
    }
    const uploaded = await blob.put(`uploads/${filename}`, bytes, {
      access: "public",
      contentType: mimeType,
      token: blobToken
    });
    sendJson(response, 200, { url: uploaded.url });
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message || "No se pudo subir la imagen." });
  }
};

const handleAdminCheck = (request, response) => {
  if (!requireAdmin(request, response)) return;
  sendJson(response, 200, { ok: true });
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
