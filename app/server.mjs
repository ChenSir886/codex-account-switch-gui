import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import os from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(__dirname, "public");
const codexPathDir = "/Applications/Codex.app/Contents/Resources";
const envPath = `${codexPathDir}:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`;
const env = { ...process.env, PATH: envPath };
const port = Number(process.env.PORT || 4185);
const loginSessions = new Map();
const codexHome = path.join(os.homedir(), ".codex");
const accountsDir = path.join(codexHome, "accounts");
const registryPath = path.join(accountsDir, "registry.json");
const activeAuthPath = path.join(codexHome, "auth.json");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function serveFile(res, filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

function runCodexAuth(args, { interactive = false } = {}) {
  return new Promise((resolve, reject) => {
    const command = path.join(rootDir, "run-codex-auth.sh");
    const child = spawn(command, args, {
      cwd: rootDir,
      env,
      stdio: interactive ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `codex-auth exited with code ${code}`));
      }
    });
  });
}

function parseAccounts(raw) {
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => /^\*?\s*\d+\s+/.test(line))
    .map((line) => {
      const active = line.trimStart().startsWith("*");
      const clean = line.replace(/^\*\s*/, "").trim();
      const match = clean.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.+?)\s{2,}(.+?)\s{2,}(.+)$/);
      if (!match) {
        return { raw: line, active };
      }
      return {
        active,
        index: match[1],
        account: match[2],
        plan: match[3],
        usage5h: match[4].trim(),
        usageWeekly: match[5].trim(),
        lastActivity: match[6].trim(),
      };
    });
}

function encodeAccountKey(accountKey) {
  return Buffer.from(accountKey, "utf8").toString("base64url");
}

function readRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function switchAccountLocally(indexValue) {
  const numericIndex = Number.parseInt(String(indexValue), 10);
  if (!Number.isFinite(numericIndex) || numericIndex < 1) {
    throw new Error("Invalid account index");
  }

  const registry = readRegistry();
  const record = registry.accounts?.[numericIndex - 1];
  if (!record) {
    throw new Error(`No account matches '${indexValue}'.`);
  }

  const snapshotPath = path.join(accountsDir, `${encodeAccountKey(record.account_key)}.auth.json`);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error("Account snapshot file is missing.");
  }

  fs.copyFileSync(snapshotPath, activeAuthPath);
  registry.active_account_key = record.account_key;
  registry.active_account_activated_at_ms = Date.now();
  record.last_used_at = Math.floor(Date.now() / 1000);
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  return {
    account: record.email,
    accountKey: record.account_key,
  };
}

function createLoginSession() {
  const id = Math.random().toString(36).slice(2);
  const command = path.join(rootDir, "run-codex-auth.sh");
  const child = spawn(command, ["login"], {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const session = {
    id,
    status: "running",
    url: null,
    logs: [],
  };
  loginSessions.set(id, session);

  const onData = (chunk) => {
    const text = chunk.toString();
    session.logs.push(text);
    const urlMatch = text.match(/https:\/\/auth\.openai\.com\/[^\s]+/);
    if (urlMatch) session.url = urlMatch[0];
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("close", (code) => {
    session.status = code === 0 ? "completed" : "failed";
    session.code = code;
  });
  child.on("error", (error) => {
    session.status = "failed";
    session.logs.push(`\n${error.message}\n`);
  });

  return session;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/accounts") {
    try {
      const { stdout } = await runCodexAuth(["list"]);
      sendJson(res, 200, { accounts: parseAccounts(stdout), raw: stdout });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/switch") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const { index } = JSON.parse(body || "{}");
        if (!index) {
          sendJson(res, 400, { error: "Missing account index" });
          return;
        }
        const switched = switchAccountLocally(index);
        sendJson(res, 200, { ok: true, switched });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const session = createLoginSession();
    sendJson(res, 200, { sessionId: session.id });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/login/")) {
    const sessionId = url.pathname.split("/").pop();
    const session = loginSessions.get(sessionId);
    if (!session) {
      sendJson(res, 404, { error: "Session not found" });
      return;
    }
    sendJson(res, 200, {
      status: session.status,
      url: session.url,
      logs: session.logs.join(""),
    });
    return;
  }

  const filePath =
    url.pathname === "/" ? path.join(publicDir, "index.html") : path.join(publicDir, url.pathname);
  serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Codex Auth GUI running at http://localhost:${port}`);
});
