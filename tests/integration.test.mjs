import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer, preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const configuration = path.join(root, "vite.config.mjs");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort() {
  const server = createHttpServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHealth(url, child) {
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null) throw new Error(`API exited with ${child.exitCode}`);
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { }
    await pause(100);
  }
  throw new Error("Local API failed to start");
}

async function assertApiRoutes(url) {
  const badAnalyze = await fetch(`${url}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem: "", steps: [] })
  });
  assert.equal(badAnalyze.status, 400);
  assert.match(badAnalyze.headers.get("content-type"), /application\/json/);
  assert.match((await badAnalyze.json()).error, /Add the problem/);

  const methodAnalyze = await fetch(`${url}/api/analyze`, { method: "GET" });
  assert.equal(methodAnalyze.status, 405);

  const badTranscribe = await fetch(`${url}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problemText: "", solutionImage: { mimeType: "image/png", data: "" } })
  });
  assert.equal(badTranscribe.status, 415);
  assert.match(badTranscribe.headers.get("content-type"), /application\/json/);
}

test("React build, Express serving, Vite proxy, and Vercel configuration", async (t) => {
  const port = await freePort();
  const apiUrl = `http://127.0.0.1:${port}`;
  const api = spawn(process.execPath, [path.join(root, "functions", "index.js")], {
    cwd: root, env: { ...process.env, PORT: String(port) }, stdio: "ignore"
  });
  let dev;
  let builtPreview;
  try {
    await waitForHealth(apiUrl, api);
    await t.test("production output contains hashed React assets and only intended public files", async () => {
      const html = await readFile(path.join(root, "dist", "index.html"), "utf8");
      assert.match(html, /id="root"/);
      assert.match(html, /\/assets\/[^" ]+\.js/);
      assert.doesNotMatch(html, /\/src\/main\.jsx|\/app\.js/);
      assert.deepEqual((await readdir(path.join(root, "public"))).sort(), ["favicon.svg"]);
      assert.deepEqual((await readdir(path.join(root, "dist"))).sort(), ["assets", "favicon.svg", "index.html"]);
      const assets = await readdir(path.join(root, "dist", "assets"));
      const script = await readFile(path.join(root, "dist", "assets", assets.find((name) => name.endsWith(".js"))), "utf8");
      assert.doesNotMatch(script, /GEMINI_API_KEY|generativelanguage\.googleapis\.com|AIza[\w-]{30,}/);
    });

    await t.test("Express serves the built app, hashed assets, favicon, and SPA fallback", async () => {
      const response = await fetch(apiUrl);
      assert.equal(response.status, 200);
      const html = await response.text();
      for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)) {
        const result = await fetch(`${apiUrl}${asset}`);
        assert.equal(result.status, 200);
        assert.match(result.headers.get("content-type"), asset.endsWith(".js") ? /javascript/ : /css/);
      }
      assert.equal((await fetch(`${apiUrl}/favicon.svg`)).status, 200);
      assert.match(await (await fetch(`${apiUrl}/workspace`)).text(), /id="root"/);
      await assertApiRoutes(apiUrl);
      assert.equal((await fetch(`${apiUrl}/api/unknown`)).status, 404);
    });

    await t.test("Vite transforms React source and proxies API requests without exposing secrets", async () => {
      dev = await createServer({ root, configFile: configuration, server: { port: 0, strictPort: false, proxy: { "/api": { target: apiUrl, changeOrigin: true } } } });
      await dev.listen();
      const url = `http://127.0.0.1:${dev.httpServer.address().port}`;
      const html = await (await fetch(url)).text();
      assert.match(html, /\/src\/main\.jsx/);
      assert.match(html, /@vite\/client/);
      const source = await fetch(`${url}/src/App.jsx`);
      assert.equal(source.status, 200);
      assert.match(source.headers.get("content-type"), /javascript/);
      assert.equal((await (await fetch(`${url}/api/health`)).json()).status, "ok");
      await assertApiRoutes(url);
      const blocked = await fetch(`${url}/.env`);
      assert.equal(blocked.status, 403);
    });

    await t.test("Vite preview serves the production build and proxies the same API", async () => {
      builtPreview = await preview({ root, configFile: configuration, preview: { port: 0, strictPort: false, proxy: { "/api": { target: apiUrl, changeOrigin: true } } } });
      const url = `http://127.0.0.1:${builtPreview.httpServer.address().port}`;
      assert.match(await (await fetch(url)).text(), /\/assets\//);
      await assertApiRoutes(url);
    });

    await t.test("Vercel builds to dist in Singapore and keeps API rewrites first", async () => {
      const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
      assert.equal(config.outputDirectory, "dist");
      assert.equal(config.buildCommand, "npm run build");
      assert.deepEqual(config.regions, ["sin1"]);
      assert.equal(config.rewrites[0].source, "/api/(.*)");
      assert.equal(config.rewrites.at(-1).destination, "/index.html");
    });
  } finally {
    await dev?.close();
    if (builtPreview) {
      builtPreview.httpServer.closeAllConnections();
      await new Promise((resolve) => builtPreview.httpServer.close(resolve));
    }
    if (api.exitCode === null) { const exited = once(api, "exit"); api.kill(); await exited; }
  }
});