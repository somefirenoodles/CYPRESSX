import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function reservePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  if (!address || typeof address === "string" || !Number.isInteger(address.port)) {
    probe.close();
    throw new Error("No se pudo asignar un puerto local.");
  }
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const env = { ...process.env, CYPRESS_BASE_URL: baseUrl };
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: root,
    stdio: "inherit",
    env,
  },
);

let serverExit;
server.once("exit", (code) => { serverExit = code ?? 1; });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", env });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function waitForWeb() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverExit !== undefined) throw new Error(`Vite terminó antes de iniciar (código ${serverExit}).`);
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("La aplicación web no respondió en 30 segundos.");
}

try {
  await waitForWeb();
  const browser = process.platform === "win32" ? "edge" : "chrome";
  const exitCode = await run(process.execPath, ["node_modules/cypress/bin/cypress", "run", "--browser", browser]);
  process.exitCode = exitCode;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.kill();
}
