import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "tests", "pages");
const ports = [8000, 8001];
const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
};

function createServer(port) {
    const server = http.createServer((request, response) => {
        const requestPath = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
        const requestedPath = requestPath.endsWith("/")
            ? `${requestPath}index.html`
            : requestPath;
        const filePath = path.resolve(root, `.${requestedPath}`);

        if (!filePath.startsWith(`${root}${path.sep}`)) {
            response.writeHead(403);
            response.end("Forbidden");
            return;
        }

        fs.stat(filePath, (statError, stat) => {
            if (statError || !stat.isFile()) {
                response.writeHead(404);
                response.end("Not found");
                return;
            }

            const contentType = contentTypes[path.extname(filePath)];
            if (!contentType) {
                response.writeHead(404);
                response.end("Not found");
                return;
            }

            response.writeHead(200, { "Content-Type": contentType });
            fs.createReadStream(filePath).pipe(response);
        });
    });

    server.listen(port, "127.0.0.1", () => {
        console.log(`Test pages: http://127.0.0.1:${port}/`);
    });
}

for (const port of ports) createServer(port);
