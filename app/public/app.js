const accountsGrid = document.querySelector("#accountsGrid");
const statusBadge = document.querySelector("#statusBadge");
const refreshButton = document.querySelector("#refreshButton");
const addButton = document.querySelector("#addButton");
const authLink = document.querySelector("#authLink");
const logOutput = document.querySelector("#logOutput");
const template = document.querySelector("#accountCardTemplate");
const langZhButton = document.querySelector("#langZhButton");
const langEnButton = document.querySelector("#langEnButton");

const textNodes = {
  heroEyebrow: document.querySelector("#heroEyebrow"),
  heroTitle: document.querySelector("#heroTitle"),
  consoleTitle: document.querySelector("#consoleTitle"),
  sidebarTip1: document.querySelector("#sidebarTip1"),
  sidebarTip2: document.querySelector("#sidebarTip2"),
};

let loginPoll = null;
let currentLanguage = localStorage.getItem("codex-auth-lang") || "zh";

const messages = {
  zh: {
    refreshAccounts: "刷新账号",
    addAccount: "新增账号",
    sidebarTip1: "切换会更新本机的 `~/.codex/auth.json` 登录态。",
    sidebarTip2: "切换完成后，重启 Codex App 即可生效。",
    heroEyebrow: "本地控制台",
    heroTitle: "把多个 Plus 账号放进一个顺手的切换面板里。",
    ready: "就绪",
    consoleTitle: "登录流程",
    openLoginPage: "打开登录页",
    noActiveLoginSession: "当前没有正在进行的登录任务。",
    account: "账号",
    usage5hLabel: "5小时用量",
    usageWeeklyLabel: "每周用量",
    lastActivityLabel: "最近活动",
    activeNow: "当前使用中",
    active: "使用中",
    switch: "切换",
    switching: "切换中...",
    switchedRestart: "已切换，请重启 Codex App",
    loadingAccounts: "加载账号中...",
    loadedAccounts: (count) => `已加载 ${count} 个账号`,
    loadFailed: "加载失败",
    couldNotLoadAccounts: "账号加载失败",
    unknown: "未知账号",
    startingLogin: "正在启动登录...",
    preparingLoginFlow: "正在准备登录流程...",
    waitingForLoginLogs: "正在等待登录日志...",
    accountAdded: "账号已添加",
    loginFailed: "登录失败",
    missingAccountIndex: "缺少账号序号",
  },
  en: {
    refreshAccounts: "Refresh Accounts",
    addAccount: "Add Account",
    sidebarTip1: "Switching updates your local `~/.codex/auth.json` session.",
    sidebarTip2: "Restart Codex App after switching to apply the new account.",
    heroEyebrow: "Local Dashboard",
    heroTitle: "Keep multiple Plus accounts inside one polished switchboard.",
    ready: "Ready",
    consoleTitle: "Login Flow",
    openLoginPage: "Open Login Page",
    noActiveLoginSession: "No active login session.",
    account: "Account",
    usage5hLabel: "5h usage",
    usageWeeklyLabel: "Weekly usage",
    lastActivityLabel: "Last activity",
    activeNow: "Active now",
    active: "Active",
    switch: "Switch",
    switching: "Switching...",
    switchedRestart: "Switched. Restart Codex App.",
    loadingAccounts: "Loading accounts...",
    loadedAccounts: (count) => `Loaded ${count} account${count === 1 ? "" : "s"}`,
    loadFailed: "Load failed",
    couldNotLoadAccounts: "Could not load accounts",
    unknown: "Unknown account",
    startingLogin: "Starting login...",
    preparingLoginFlow: "Preparing login flow...",
    waitingForLoginLogs: "Waiting for login logs...",
    accountAdded: "Account added",
    loginFailed: "Login failed",
    missingAccountIndex: "Missing account index",
  },
};

function t(key, ...args) {
  const value = messages[currentLanguage][key];
  return typeof value === "function" ? value(...args) : value;
}

function renderStaticText() {
  refreshButton.textContent = t("refreshAccounts");
  addButton.textContent = t("addAccount");
  textNodes.heroEyebrow.textContent = t("heroEyebrow");
  textNodes.heroTitle.textContent = t("heroTitle");
  textNodes.consoleTitle.textContent = t("consoleTitle");
  textNodes.sidebarTip1.textContent = t("sidebarTip1");
  textNodes.sidebarTip2.textContent = t("sidebarTip2");
  authLink.textContent = t("openLoginPage");
  if (!logOutput.dataset.hasLogs) {
    logOutput.textContent = t("noActiveLoginSession");
  }
  if (!statusBadge.dataset.customStatus) {
    setStatus(t("ready"));
  }
  langZhButton.classList.toggle("active", currentLanguage === "zh");
  langEnButton.classList.toggle("active", currentLanguage === "en");
}

function setStatus(text) {
  statusBadge.dataset.customStatus = "1";
  statusBadge.textContent = text;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderAccounts(accounts) {
  accountsGrid.innerHTML = "";
  for (const account of accounts) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".account-index").textContent = `${t("account")} ${account.index}`;
    node.querySelector(".account-email").textContent = account.account || account.raw || t("unknown");
    node.querySelector(".plan-pill").textContent = account.plan || "Plan";
    node.querySelector(".label-5h").textContent = t("usage5hLabel");
    node.querySelector(".label-weekly").textContent = t("usageWeeklyLabel");
    node.querySelector(".label-last-activity").textContent = t("lastActivityLabel");
    node.querySelector(".usage-5h").textContent = account.usage5h || "-";
    node.querySelector(".usage-weekly").textContent = account.usageWeekly || "-";
    node.querySelector(".last-activity").textContent = account.lastActivity || "-";

    const activeLabel = node.querySelector(".active-label");
    activeLabel.textContent = t("activeNow");
    if (account.active) activeLabel.classList.remove("hidden");

    const switchButton = node.querySelector(".switch-button");
    switchButton.disabled = !!account.active;
    switchButton.textContent = account.active ? t("active") : t("switch");
    switchButton.addEventListener("click", async () => {
      try {
        setStatus(t("switching"));
        const normalizedIndex = String(Number.parseInt(account.index, 10));
        await fetchJson("/api/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: normalizedIndex }),
        });
        setStatus(t("switchedRestart"));
        await loadAccounts();
      } catch (error) {
        setStatus(error.message);
      }
    });

    accountsGrid.appendChild(node);
  }
}

async function loadAccounts() {
  try {
    setStatus(t("loadingAccounts"));
    const data = await fetchJson("/api/accounts");
    renderAccounts(data.accounts);
    setStatus(t("loadedAccounts", data.accounts.length));
  } catch (error) {
    accountsGrid.innerHTML = `<article class="account-card"><h3>${t("couldNotLoadAccounts")}</h3><p>${error.message}</p></article>`;
    setStatus(t("loadFailed"));
  }
}

async function pollLogin(sessionId) {
  try {
    const data = await fetchJson(`/api/login/${sessionId}`);
    logOutput.dataset.hasLogs = data.logs ? "1" : "";
    logOutput.textContent = data.logs || "Waiting for login logs...";
    if (data.url) {
      authLink.href = data.url;
      authLink.classList.remove("hidden");
    }
    if (data.status === "completed") {
      clearInterval(loginPoll);
      loginPoll = null;
      setStatus(t("accountAdded"));
      await loadAccounts();
    } else if (data.status === "failed") {
      clearInterval(loginPoll);
      loginPoll = null;
      setStatus(t("loginFailed"));
    }
  } catch (error) {
    setStatus(error.message);
  }
}

refreshButton.addEventListener("click", loadAccounts);
addButton.addEventListener("click", async () => {
  try {
    setStatus(t("startingLogin"));
    authLink.classList.add("hidden");
    logOutput.dataset.hasLogs = "";
    logOutput.textContent = t("preparingLoginFlow");
    const { sessionId } = await fetchJson("/api/login", { method: "POST" });
    if (loginPoll) clearInterval(loginPoll);
    loginPoll = setInterval(() => pollLogin(sessionId), 1500);
    await pollLogin(sessionId);
  } catch (error) {
    setStatus(error.message);
    logOutput.textContent = error.message;
  }
});

langZhButton.addEventListener("click", async () => {
  currentLanguage = "zh";
  localStorage.setItem("codex-auth-lang", currentLanguage);
  statusBadge.dataset.customStatus = "";
  renderStaticText();
  await loadAccounts();
});

langEnButton.addEventListener("click", async () => {
  currentLanguage = "en";
  localStorage.setItem("codex-auth-lang", currentLanguage);
  statusBadge.dataset.customStatus = "";
  renderStaticText();
  await loadAccounts();
});

renderStaticText();
loadAccounts();
