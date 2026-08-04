const JWT_ALGORITHM = "HS256";
const PROXY_MAX_BYTES = 25 * 1024 * 1024;

function isProductionRuntime() {
  return Boolean(
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.NODE_ENV === "production",
  );
}

/** Hostnames permitted for server-side asset fetches (production). */
const PRODUCTION_ALLOWED_HOSTS = new Set([
  "cdn.sanity.io",
  "drive.google.com",
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
]);

/** Additional hosts allowed in local development only. */
const DEV_ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
]);

function isPrivateOrReservedHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "127.0.0.1" || host.startsWith("127.")) return true;
  if (host === "::1" || host === "[::1]") return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (host.startsWith("169.254.")) return true;
  if (host === "metadata.google.internal") return true;
  return false;
}

function hasModelExtension(pathname, fullUrl) {
  const pathLower = pathname.toLowerCase();
  const fullLower = fullUrl.toLowerCase();
  return pathLower.endsWith(".glb") || pathLower.endsWith(".gltf") ||
    pathLower.includes(".glb") || pathLower.includes(".gltf") ||
    fullLower.includes(".glb") || fullLower.includes(".gltf");
}

function isAllowedRemoteUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      if (!(parsed.protocol === "http:" && !isProductionRuntime())) {
        return false;
      }
    }

    const host = parsed.hostname.toLowerCase();
    if (isPrivateOrReservedHost(host)) return false;

    if (PRODUCTION_ALLOWED_HOSTS.has(host)) return true;
    if (!isProductionRuntime() && DEV_ALLOWED_HOSTS.has(host)) return true;

    if (host.endsWith(".amazonaws.com") && hasModelExtension(parsed.pathname, url)) {
      return true;
    }

    return hasModelExtension(parsed.pathname, url);
  } catch {
    return false;
  }
}

async function fetchAllowedAsset(url, maxBytes = PROXY_MAX_BYTES, maxRedirects = 3) {
  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!isAllowedRemoteUrl(currentUrl)) {
      throw new Error("URL not allowed");
    }

    const response = await fetch(currentUrl, {redirect: "manual"});
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect missing location header");
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Upstream HTTP ${response.status}`);
    }

    const contentLength = Number.parseInt(response.headers.get("content-length") || "0", 10);
    if (contentLength > maxBytes) {
      throw new Error("Asset too large");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error("Asset too large");
    }

    return {response, buffer, finalUrl: currentUrl};
  }

  throw new Error("Too many redirects");
}

module.exports = {
  JWT_ALGORITHM,
  PROXY_MAX_BYTES,
  isProductionRuntime,
  isAllowedRemoteUrl,
  fetchAllowedAsset,
};
