import { createReadStream, existsSync, statSync } from "fs";
import { createServer } from "http";
import path from "path";

const root = path.join(process.cwd(), "out");
const port = Number(process.env.PORT || 3000);

if (!existsSync(root)) {
  console.log("Build the site first with npm run build, then run this again.");
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function fileFor(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded.replace(/^\/+/, "");
  const full = path.join(root, relative);
  if (!full.startsWith(root)) return null;
  if (existsSync(full) && statSync(full).isFile()) return full;
  const index = path.join(full, "index.html");
  if (existsSync(index)) return index;
  const html = `${full}.html`;
  if (existsSync(html)) return html;
  return null;
}

createServer((request, response) => {
  const found = fileFor(request.url || "/");
  if (!found) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const type = types[path.extname(found)] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": type });
  createReadStream(found).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Open http://127.0.0.1:${port}`);
  console.log("On a phone on the same Wi-Fi, use this computer's address and this port.");
});
