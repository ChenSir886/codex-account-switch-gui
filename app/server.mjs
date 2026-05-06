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
const guiStatePath = path.join(codexHome, "account-switch-gui.json");
const defaultGroup = { name: "默认分组", note: "" };

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

function normalizeEmail(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function readGuiState() {
  if (!fs.existsSync(guiStatePath)) {
    return { groups: { default: defaultGroup }, accountGroups: {}, trashedAccounts: {}, mappingVersion: 2 };
  }
  try {
    const state = JSON.parse(fs.readFileSync(guiStatePath, "utf8"));
    return {
      groups: state.groups && typeof state.groups === "object" ? state.groups : {},
      accountGroups:
        state.accountGroups && typeof state.accountGroups === "object" ? state.accountGroups : {},
      trashedAccounts:
        state.trashedAccounts && typeof state.trashedAccounts === "object" ? state.trashedAccounts : {},
      mappingVersion: Number.isFinite(state.mappingVersion) ? state.mappingVersion : 1,
    };
  } catch {
    return { groups: { default: defaultGroup }, accountGroups: {}, trashedAccounts: {}, mappingVersion: 2 };
  }
}

function writeGuiState(state) {
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(guiStatePath, `${JSON.stringify(state, null, 2)}\n`);
}

function normalizeGuiState(input) {
  const groups = {};
  const accountGroups = {};
  const trashedAccounts = {};
  const normalizedNames = new Set();
  const rawGroups = input?.groups && typeof input.groups === "object" ? input.groups : {};

  for (const [id, group] of Object.entries(rawGroups)) {
    if (!id || typeof group !== "object") continue;
    const rawName = String(group.name || "").trim() || "未命名分组";
    const normalizedName = rawName.toLocaleLowerCase();
    if (normalizedNames.has(normalizedName)) {
      throw new Error(`Group name already exists: ${rawName}`);
    }
    normalizedNames.add(normalizedName);
    groups[id] = {
      name: rawName,
      note: String(group.note || "").trim(),
    };
  }
  if (!groups.default) {
    groups.default = defaultGroup;
  }

  const rawAccountGroups =
    input?.accountGroups && typeof input.accountGroups === "object" ? input.accountGroups : {};
  for (const [accountKey, groupId] of Object.entries(rawAccountGroups)) {
    if (typeof groupId === "string" && groupId !== "default" && groups[groupId]) {
      accountGroups[accountKey] = groupId;
    }
  }

  const rawTrashedAccounts =
    input?.trashedAccounts && typeof input.trashedAccounts === "object" ? input.trashedAccounts : {};
  for (const [accountKey, value] of Object.entries(rawTrashedAccounts)) {
    if (!accountKey) continue;
    const item = value && typeof value === "object" ? value : {};
    trashedAccounts[accountKey] = {
      email: String(item.email || "").trim(),
      trashedAt: String(item.trashedAt || new Date().toISOString()),
    };
    delete accountGroups[accountKey];
  }

  const mappingVersion = Number.isFinite(input?.mappingVersion) ? input.mappingVersion : 2;
  return { groups, accountGroups, trashedAccounts, mappingVersion };
}

function accountsWithRegistry(accounts) {
  const registry = fs.existsSync(registryPath) ? readRegistry() : { accounts: [] };
  const recordsByEmail = new Map(
    (registry.accounts || [])
      .filter((record) => record?.email)
      .map((record) => [normalizeEmail(record.email), record]),
  );
  return accounts.map((account) => {
    const record = recordsByEmail.get(normalizeEmail(account.account));
    return {
      ...account,
      accountKey: record?.account_key ?? null,
      alias: record?.alias ?? "",
      accountName: record?.account_name ?? null,
      active: record?.account_key ? record.account_key === registry.active_account_key : account.active,
    };
  });
}

function migrateLegacyGroupMappings(state, accounts, registry) {
  if ((state.mappingVersion || 1) >= 2) return state;

  const recordsByEmail = new Map(
    (registry.accounts || [])
      .filter((record) => record?.email)
      .map((record) => [normalizeEmail(record.email), record]),
  );
  const transformedAssignments = {};
  const consumedLegacyKeys = new Set();

  for (const account of accounts) {
    const numericIndex = Number.parseInt(account.index, 10);
    const legacyRecord = registry.accounts?.[numericIndex - 1];
    const currentRecord = recordsByEmail.get(normalizeEmail(account.account));
    if (!legacyRecord?.account_key || !currentRecord?.account_key) continue;
    const assignedGroup = state.accountGroups?.[legacyRecord.account_key];
    if (!assignedGroup) continue;

    transformedAssignments[currentRecord.account_key] = assignedGroup;
    if (legacyRecord.account_key !== currentRecord.account_key) {
      consumedLegacyKeys.add(legacyRecord.account_key);
    }
  }

  const accountGroups = { ...(state.accountGroups || {}) };
  for (const accountKey of consumedLegacyKeys) {
    delete accountGroups[accountKey];
  }
  Object.assign(accountGroups, transformedAssignments);

  return {
    ...state,
    accountGroups,
    mappingVersion: 2,
  };
}

function readGuiStateForAccounts(accounts, registry) {
  const rawState = readGuiState();
  const state = migrateLegacyGroupMappings(rawState, accounts, registry);
  const normalizedState = normalizeGuiState(state);
  if (
    rawState.mappingVersion !== normalizedState.mappingVersion ||
    JSON.stringify(rawState.accountGroups || {}) !== JSON.stringify(normalizedState.accountGroups || {}) ||
    JSON.stringify(rawState.trashedAccounts || {}) !== JSON.stringify(normalizedState.trashedAccounts || {})
  ) {
    writeGuiState(normalizedState);
  }
  return normalizedState;
}

function findRegistryRecordByKey(accountKey) {
  const registry = readRegistry();
  const record = registry.accounts?.find((account) => account.account_key === accountKey);
  return { registry, record };
}

async function readRequestJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk.toString();
  }
  return JSON.parse(body || "{}");
}

function moveAccountToTrash(accountKey) {
  const { registry, record } = findRegistryRecordByKey(accountKey);
  if (!record) {
    throw new Error("Account not found.");
  }
  if (record.account_key === registry.active_account_key) {
    throw new Error("The active account cannot be moved to trash. Switch to another account first.");
  }

  const state = normalizeGuiState(readGuiState());
  state.trashedAccounts[record.account_key] = {
    email: record.email || "",
    trashedAt: new Date().toISOString(),
  };
  delete state.accountGroups[record.account_key];
  writeGuiState(state);
  return state;
}

function restoreAccountFromTrash(accountKey) {
  const state = normalizeGuiState(readGuiState());
  if (!state.trashedAccounts[accountKey]) {
    throw new Error("Account is not in trash.");
  }
  delete state.trashedAccounts[accountKey];
  writeGuiState(state);
  return state;
}

async function removeTrashedAccountPermanently(accountKey) {
  const state = normalizeGuiState(readGuiState());
  if (!state.trashedAccounts[accountKey]) {
    throw new Error("Move the account to trash before permanently deleting it.");
  }

  const { record } = findRegistryRecordByKey(accountKey);
  if (!record) {
    delete state.trashedAccounts[accountKey];
    delete state.accountGroups[accountKey];
    writeGuiState(state);
    return state;
  }

  await runCodexAuth(["remove", accountKey]);
  delete state.trashedAccounts[accountKey];
  delete state.accountGroups[accountKey];
  writeGuiState(state);
  return state;
}

async function switchAccountLocally(indexValue) {
  const numericIndex = Number.parseInt(String(indexValue), 10);
  if (!Number.isFinite(numericIndex) || numericIndex < 1) {
    throw new Error("Invalid account index");
  }

  const { stdout } = await runCodexAuth(["list"]);
  const listedAccount = parseAccounts(stdout).find((account) => {
    return Number.parseInt(account.index, 10) === numericIndex;
  });
  if (!listedAccount?.account) {
    throw new Error(`No account matches '${indexValue}'.`);
  }

  const registry = readRegistry();
  const record = registry.accounts?.find((account) => {
    return normalizeEmail(account.email) === normalizeEmail(listedAccount.account);
  });
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

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function restartCodexAppSoon() {
  if (process.platform !== "darwin") {
    return { scheduled: false, reason: "Codex App restart is only supported on macOS." };
  }

  const guiLogPath = path.join(codexHome, "account-switch-gui.log");
  const quotedRootDir = shellQuote(rootDir);
  const quotedGuiLogPath = shellQuote(guiLogPath);
  const script = [
    "sleep 1",
    'osascript -e \'tell application id "com.openai.codex" to quit\' >/dev/null 2>&1 || true',
    "sleep 2",
    `if ! /usr/sbin/lsof -tiTCP:${port} -sTCP:LISTEN >/dev/null 2>&1; then cd ${quotedRootDir} && nohup npm run gui >> ${quotedGuiLogPath} 2>&1 & fi`,
    "sleep 1",
    'open -b com.openai.codex >/dev/null 2>&1 || open -a Codex >/dev/null 2>&1 || true',
  ].join("; ");

  const child = spawn("sh", ["-c", script], {
    cwd: rootDir,
    env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return { scheduled: true };
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
    restart: null,
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
    if (code === 0) {
      session.restart = restartCodexAppSoon();
    }
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
      const accounts = parseAccounts(stdout);
      const registry = fs.existsSync(registryPath) ? readRegistry() : { accounts: [] };
      const state = readGuiStateForAccounts(accounts, registry);
      const allAccounts = accountsWithRegistry(accounts);
      const visibleAccounts = allAccounts.filter((account) => {
        return !account.accountKey || !state.trashedAccounts[account.accountKey];
      });
      const trash = allAccounts
        .filter((account) => account.accountKey && state.trashedAccounts[account.accountKey])
        .map((account) => ({
          ...account,
          trashedAt: state.trashedAccounts[account.accountKey]?.trashedAt || "",
        }));
      sendJson(res, 200, {
        accounts: visibleAccounts,
        trash,
        state,
        raw: stdout,
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/groups") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const state = normalizeGuiState(JSON.parse(body || "{}"));
        writeGuiState(state);
        sendJson(res, 200, { ok: true, state });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/accounts/trash") {
    try {
      const { accountKey } = await readRequestJson(req);
      if (!accountKey) {
        sendJson(res, 400, { error: "Missing account key" });
        return;
      }
      const state = moveAccountToTrash(accountKey);
      sendJson(res, 200, { ok: true, state });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/accounts/restore") {
    try {
      const { accountKey } = await readRequestJson(req);
      if (!accountKey) {
        sendJson(res, 400, { error: "Missing account key" });
        return;
      }
      const state = restoreAccountFromTrash(accountKey);
      sendJson(res, 200, { ok: true, state });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && url.pathname === "/api/accounts") {
    try {
      const { accountKey } = await readRequestJson(req);
      if (!accountKey) {
        sendJson(res, 400, { error: "Missing account key" });
        return;
      }
      const state = await removeTrashedAccountPermanently(accountKey);
      sendJson(res, 200, { ok: true, state });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/switch") {
    try {
      const { index } = await readRequestJson(req);
      if (!index) {
        sendJson(res, 400, { error: "Missing account index" });
        return;
      }
      const switched = await switchAccountLocally(index);
      const restart = restartCodexAppSoon();
      sendJson(res, 200, { ok: true, switched, restart });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
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
      restart: session.restart,
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
