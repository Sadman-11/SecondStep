import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const api = spawn(process.execPath, [fileURLToPath(new URL("../functions/index.js", import.meta.url))], {
  cwd: root, env: process.env, stdio: ["ignore", "inherit", "inherit"]
});
let vite;
let stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  await vite?.close();
  if (api.exitCode === null && api.signalCode === null) {
    const exited = once(api, "exit").catch(() => {});
    api.kill();
    await exited;
  }
}

api.on("error", (error) => { console.error("Could not start the local API:", error.message); void stop(1); });
api.on("exit", (code) => { if (!stopping) void stop(code || 1); });
process.once("SIGINT", () => { void stop(); });
process.once("SIGTERM", () => { void stop(); });
// Also support clean shutdown from non-interactive process supervisors/tests on Windows.
process.on("message", (message) => { if (message === "shutdown") void stop(); });

try {
  vite = await createServer({ root });
  if (stopping) await vite.close();
  else {
    await vite.listen();
    vite.printUrls();
  }
} catch (error) {
  console.error("Could not start Vite:", error.message);
  await stop(1);
}