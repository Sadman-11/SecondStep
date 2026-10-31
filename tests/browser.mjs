import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { alternativeResult, mistakeResult, steps } from "./fixtures.mjs";
import { createServer as createViteServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const browserPath = [process.env.BROWSER_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find((file) => file && existsSync(file));
if (!browserPath) throw new Error("Chrome/Edge not found. Set BROWSER_PATH to an installed Chromium browser.");
const artifacts = path.join(root, "test-results");
await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), "secondstep-browser-"));
const requests = [];
const runtimeErrors = [];
const consoleErrors = [];
const development = process.argv.includes("--dev");
let vite;
let nextResponse = {};
let browser;
let client;
let passed = 0;

const server = createServer(async (req, res) => {
  if (req.url === "/api/analyze" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push(JSON.parse(body));
    const response = nextResponse;
    nextResponse = {};
    await new Promise((resolve) => setTimeout(resolve, response.delay ?? 0));
    res.writeHead(response.status ?? 200, { "Content-Type": response.type ?? "application/json" });
    res.end(response.raw ?? JSON.stringify(response.body ?? mistakeResult()));
    return;
  }
  if (vite) { vite.middlewares(req, res); return; }
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!/^(index\.html|favicon\.svg|assets\/[a-zA-Z0-9_.-]+\.(js|css))$/.test(file)) { res.writeHead(404); res.end(); return; }
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml" };
  try {
    const contents = await readFile(path.join(root, "dist", file));
    res.writeHead(200, { "Content-Type": types[path.extname(file)] });
    res.end(contents);
  } catch { res.writeHead(500); res.end(); }
});

class DevTools {
  constructor(url) {
    this.pending = new Map();
    this.sequence = 0;
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text + ": " + (message.params.exceptionDetails.exception?.description ?? ""));
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`DevTools timeout: ${method}`)); }, 15000);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, description, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await pause(30); }
  throw new Error(`Timed out waiting for ${description}`);
}
const evaluate = (code) => client.evaluate(code);
const visible = (id) => evaluate(`!document.getElementById(${JSON.stringify(id)}).hidden`);
const waitFor = (id) => until(() => visible(id), id);
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const text = (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
// Use the browser's native setter so React's controlled-input tracker sees the edit.
const input = (id, value) => evaluate(`{ const input = document.getElementById(${JSON.stringify(id)}); const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event("input", { bubbles: true })); }`);
const submit = () => evaluate('document.getElementById("attempt-form").requestSubmit()');
async function screenshot(name) {
  const result = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(path.join(artifacts, name), Buffer.from(result.data, "base64"));
}
async function check(name, callback) {
  await callback();
  passed += 1;
  console.log(`PASS ${name}`);
}
async function loadDistribution() { await click('[data-example="distribution"]'); }

try {
  if (development) vite = await createViteServer({ root, server: { middlewareMode: true, hmr: false, proxy: {} } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = spawn(browserPath, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let browserError;
  browser.on("error", (error) => { browserError = error; });
  await until(() => { if (browserError) throw browserError; return existsSync(path.join(profile, "DevToolsActivePort")); }, "browser startup", 15000);
  const port = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0].trim();
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  client = new DevTools(target.webSocketDebuggerUrl);
  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("Network.enable")]);
  // Tests work offline and never send anything to external services, including font CDNs.
  await client.send("Network.setBlockedURLs", { urls: ["https://*"] });
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await client.send("Page.navigate", { url });
  await until(() => evaluate('document.readyState === "complete" && !!document.getElementById("review-button")'), "page load");
  // Module execution is verified by observing a real event handler, not just static markup.
  await until(async () => { await click('[data-example="distribution"]'); return (await text("session-status")).includes("example loaded"); }, "app module initialization");
  await click("#reset-button");

  await check("empty state, semantic controls, unique IDs, no fake results", async () => {
    assert.match(await evaluate("document.title"), /SecondStep/);
    assert.equal(await visible("feedback-empty"), true);
    assert.equal(await visible("feedback-result"), false);
    assert.equal(await visible("practice-form"), false);
    assert.equal(requests.length, 0);
    assert.equal(await evaluate('!!document.querySelector("#root #attempt-form")'), true);
    assert.equal(await evaluate('document.querySelectorAll("[id]").length === new Set([...document.querySelectorAll("[id]")].map(el => el.id)).size'), true);
    assert.equal(await evaluate('[...document.querySelectorAll("label[for]")].every(label => !!document.getElementById(label.htmlFor))'), true);
    await screenshot("desktop-empty.png");
  });

  await check("required fields validate locally and focus the first error", async () => {
    await submit();
    assert.equal(await visible("problem-error"), true);
    assert.equal(await visible("steps-error"), true);
    assert.equal(await evaluate("document.activeElement.id"), "problem-input");
    assert.equal(requests.length, 0);
  });

  await check("all example chips populate editable work without submitting", async () => {
    for (const [name, problem] of [["distribution", "2(x + 3) = 14"], ["negative-signs", "-3(x - 2) = 12"], ["balancing", "4x + 5 = 21"]]) {
      await click(`[data-example="${name}"]`);
      assert.equal(await evaluate('document.getElementById("problem-input").value'), problem);
      assert.equal(await text("step-count"), "3 / 20 steps");
      assert.equal(await evaluate(`document.querySelector('[data-example="${name}"]').getAttribute("aria-pressed")`), "true");
    }
    assert.equal(requests.length, 0);
    await loadDistribution();
  });

  await check("loading blocks duplicate requests and exact submitted steps are reviewed", async () => {
    nextResponse = { delay: 250 };
    await evaluate('document.getElementById("attempt-form").requestSubmit(); document.getElementById("attempt-form").requestSubmit(); document.getElementById("attempt-form").requestSubmit();');
    assert.equal(await visible("feedback-loading"), true);
    assert.equal(await evaluate('document.getElementById("review-button").disabled'), true);
    await waitFor("feedback-result");
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0], { problem: "2(x + 3) = 14", steps });
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".step-text")].map(el => el.textContent)'), steps);
    assert.equal(await evaluate('document.querySelectorAll(".step-needs-attention").length'), 1);
    assert.match(await text("hint-text"), /multiply 3 by 2/);
    assert.equal(await evaluate('document.getElementById("correction-details").open'), false);
    assert.equal(await evaluate("document.activeElement.id"), "feedback-title");
    assert.equal(await evaluate('document.querySelectorAll(".practice-option").length'), 4);
    await screenshot("desktop-feedback.png");
  });

  await check("worked correction disclosure is keyboard accessible", async () => {
    await client.send("Page.bringToFront");
    await evaluate('document.querySelector("#correction-details summary").focus()');
    assert.equal(await evaluate('document.activeElement.tagName'), "SUMMARY");
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await until(() => evaluate('document.getElementById("correction-details").open'), "keyboard disclosure activation");
    assert.match(await text("correction-steps"), /x = 4/);
  });

  await check("practice supports wrong answer, explanation, retry, and passed check", async () => {
    assert.equal(await evaluate('document.getElementById("check-answer-button").disabled'), true);
    await click('input[value="a"]');
    await click("#check-answer-button");
    assert.match(await text("practice-feedback-title"), /Not quite/);
    assert.match(await text("practice-feedback-text"), /Multiply both terms/);
    assert.equal(await evaluate('document.getElementById("practice-fieldset").disabled'), true);
    await click("#check-answer-button");
    assert.equal(await visible("practice-feedback"), false);
    assert.equal(await evaluate('document.getElementById("practice-fieldset").disabled'), false);
    await click('input[value="b"]');
    await click("#check-answer-button");
    assert.match(await text("practice-feedback-title"), /Practice check passed/);
    assert.equal(await visible("practice-reset-button"), true);
    assert.equal(await visible("check-answer-button"), false);
  });

  await check("editing invalidates feedback, practice, disclosure, and selected example", async () => {
    await input("steps-input", "2x + 6 = 14\n2x = 8\nx = 4");
    assert.equal(await visible("feedback-empty"), true);
    assert.equal(await visible("practice-form"), false);
    assert.equal(await evaluate('document.querySelectorAll(".practice-option").length'), 0);
    assert.equal(await evaluate('document.getElementById("correction-details").open'), false);
    assert.equal(await evaluate('document.querySelectorAll("[data-example][aria-pressed=true]").length'), 0);
    assert.match(await text("session-status"), /work changed/);
  });

  for (const outcome of ["no_mistake_found", "insufficient_work", "unsupported_problem"]) {
    await check(`${outcome} has no highlighted mistake or fabricated correction`, async () => {
      await loadDistribution();
      nextResponse = { body: alternativeResult(outcome) };
      await submit();
      await waitFor("feedback-result");
      assert.equal(await evaluate('document.querySelectorAll(".step-needs-attention").length'), 0);
      assert.equal(await visible("correction-details"), false);
      assert.equal(await visible("practice-form"), outcome === "no_mistake_found");
    });
  }

  for (const [status, expected] of [[404, /isn’t connected yet/], [429, /busy/], [500, /couldn’t complete/]]) {
    await check(`HTTP ${status} preserves input and offers retry`, async () => {
      await loadDistribution();
      nextResponse = { status };
      await submit();
      await waitFor("feedback-error");
      assert.match(await text("request-error-message"), expected);
      assert.equal(await evaluate('document.getElementById("steps-input").value'), steps.join("\n"));
      assert.equal(await visible("retry-button"), true);
      assert.equal(await evaluate('document.getElementById("review-button").disabled'), false);
    });
  }

  await check("retry uses the same live review flow", async () => {
    await click("#retry-button");
    await waitFor("feedback-result");
    assert.deepEqual(requests.at(-1).steps, steps);
  });

  await check("invalid and non-JSON responses never render feedback", async () => {
    for (const response of [{ body: { ...mistakeResult(), incorrectStepQuote: "invented line" } }, { raw: "<html>fallback</html>", type: "text/html" }]) {
      await loadDistribution();
      nextResponse = response;
      await submit();
      await waitFor("feedback-error");
      assert.match(await text("request-error-message"), /couldn’t be verified/);
      assert.equal(await visible("practice-form"), false);
    }
  });

  await check("learner and model markup is rendered as text, not executable HTML", async () => {
    const markup = '<img src=x onerror="window.injected=true">';
    await input("steps-input", markup);
    const result = mistakeResult();
    result.incorrectStepQuote = markup;
    result.explanation = markup;
    result.hint = markup;
    result.workedCorrection = [markup];
    result.practice.question = markup;
    result.practice.options[0].text = markup;
    nextResponse = { body: result };
    await submit();
    await waitFor("feedback-result");
    assert.equal(await text("hint-text"), markup);
    assert.equal(await evaluate('document.querySelectorAll("#feedback-result img, #practice-form img").length'), 0);
    assert.equal(await evaluate("window.injected === undefined"), true);
  });

  await check("late responses cannot restore results after edits, even if abort is ignored", async () => {
    await loadDistribution();
    await evaluate('window.originalFetch = window.fetch; window.fetch = (url, options) => window.originalFetch(url, { ...options, signal: undefined })');
    nextResponse = { delay: 220 };
    await submit();
    await input("problem-input", "x + 1 = 2");
    await pause(350);
    assert.equal(await visible("feedback-empty"), true);
    assert.equal(await visible("practice-form"), false);
    await evaluate("window.fetch = window.originalFetch");
  });

  await check("reset during review cancels and clears the whole session", async () => {
    await loadDistribution();
    nextResponse = { delay: 200 };
    await submit();
    await click("#reset-button");
    await pause(300);
    assert.equal(await evaluate('document.getElementById("problem-input").value'), "");
    assert.equal(await evaluate('document.getElementById("steps-input").value'), "");
    assert.equal(await visible("feedback-empty"), true);
    assert.equal(await text("step-count"), "0 / 20 steps");
  });

  await check("network failure and timeout restore the review action", async () => {
    await loadDistribution();
    await evaluate('window.fetch = async () => { throw new TypeError("offline"); }');
    await submit();
    await waitFor("feedback-error");
    assert.match(await text("request-error-message"), /connection/);
    await evaluate('window.fetch = window.originalFetch; window.originalSetTimeout = window.setTimeout; window.setTimeout = (fn, ms, ...args) => window.originalSetTimeout(fn, ms === 45000 ? 50 : ms, ...args)');
    nextResponse = { delay: 200 };
    await submit();
    await waitFor("feedback-error");
    assert.match(await text("request-error-message"), /took too long/);
    assert.equal(await evaluate('document.getElementById("review-button").disabled'), false);
    await evaluate("window.setTimeout = window.originalSetTimeout");
    await pause(250);
  });

  await check("desktop, tablet, and mobile layouts have no horizontal overflow", async () => {
    await click("#reset-button");
    for (const width of [1440, 1024, 801, 800, 768, 601, 600, 390, 375, 320]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      const dimensions = await evaluate('({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, columns: getComputedStyle(document.getElementById("workspace")).gridTemplateColumns.split(" ").length })');
      assert.ok(dimensions.scroll <= dimensions.width, `Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
      assert.equal(dimensions.columns, width <= 800 ? 1 : 2);
    }
    await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await evaluate("window.scrollTo(0, 0)");
    await screenshot("mobile-empty.png");
    await loadDistribution();
    await submit();
    await waitFor("feedback-result");
    assert.equal(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), true);
    await screenshot("mobile-feedback.png");
  });

  await check("reduced motion and in-memory-only session", async () => {
    await client.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".loading-spinner")).animationName'), "none");
    assert.equal(await evaluate("localStorage.length + sessionStorage.length"), 0);
    assert.deepEqual(runtimeErrors, []);
    assert.deepEqual(consoleErrors, [], "No React console errors, including controlled input or key warnings");
  });

  await check("skip navigation is hidden until focused and targets the workspace", async () => {
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".skip-link")).clipPath'), "inset(100%)");
    await evaluate('document.querySelector(".skip-link").focus()');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".skip-link")).clipPath'), "none");
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await until(() => evaluate('document.activeElement.id === "workspace"'), "skip navigation focus");
  });

  console.log(`\n${passed} browser checks passed (${development ? "Vite development + React StrictMode" : "Vite production build"}). Screenshots: ${artifacts}`);
} catch (error) {
  if (client) await screenshot("failure.png").catch(() => {});
  throw error;
} finally {
  if (client) {
    await client.send("Browser.close").catch(() => {});
    client.socket.close();
  }
  if (browser && browser.exitCode === null) {
    await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), pause(3000)]);
    if (browser.exitCode === null) browser.kill();
  }
  await vite?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  // Only remove the unique temporary browser profile created by this test run.
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}