const accountsGrid = document.querySelector("#accountsGrid");
const trashSection = document.querySelector("#trashSection");
const trashGrid = document.querySelector("#trashGrid");
const trashTitle = document.querySelector("#trashTitle");
const trashCount = document.querySelector("#trashCount");
const statusBadge = document.querySelector("#statusBadge");
const refreshButton = document.querySelector("#refreshButton");
const addButton = document.querySelector("#addButton");
const createGroupButton = document.querySelector("#createGroupButton");
const authLink = document.querySelector("#authLink");
const logOutput = document.querySelector("#logOutput");
const template = document.querySelector("#accountCardTemplate");
const trashTemplate = document.querySelector("#trashCardTemplate");
const groupTemplate = document.querySelector("#groupSectionTemplate");
const langZhButton = document.querySelector("#langZhButton");
const langEnButton = document.querySelector("#langEnButton");
const groupDialog = document.querySelector("#groupDialog");
const groupDialogTitle = document.querySelector("#groupDialogTitle");
const groupNameLabel = document.querySelector("#groupNameLabel");
const groupNoteLabel = document.querySelector("#groupNoteLabel");
const newGroupNameInput = document.querySelector("#newGroupNameInput");
const newGroupNoteInput = document.querySelector("#newGroupNoteInput");
const groupDialogError = document.querySelector("#groupDialogError");
const cancelGroupButton = document.querySelector("#cancelGroupButton");
const confirmGroupButton = document.querySelector("#confirmGroupButton");

const textNodes = {
  heroEyebrow: document.querySelector("#heroEyebrow"),
  heroTitle: document.querySelector("#heroTitle"),
  consoleTitle: document.querySelector("#consoleTitle"),
  sidebarTip1: document.querySelector("#sidebarTip1"),
  sidebarTip2: document.querySelector("#sidebarTip2"),
};

let loginPoll = null;
let currentLanguage = localStorage.getItem("codex-auth-lang") || "zh";
let accountsCache = [];
let trashCache = [];
let groupState = {
  groups: { default: { name: "默认分组", note: "" } },
  accountGroups: {},
  trashedAccounts: {},
};

const messages = {
  zh: {
    refreshAccounts: "刷新账号",
    addAccount: "新增账号",
    sidebarTip1: "切换会更新本机的 `~/.codex/auth.json` 登录态。",
    sidebarTip2: "切换完成后，会自动重启 Codex App 让账号生效。",
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
    groupLabel: "所属分组",
    addGroup: "新增分组",
    createGroup: "创建分组",
    createGroupTitle: "新增分组",
    cancel: "取消",
    saveGroup: "保存",
    deleteGroup: "删除分组",
    defaultGroupName: "默认分组",
    groupNameLabel: "分组名称",
    groupNamePlaceholder: "例如：主力账号、备用账号、项目账号",
    groupNoteLabel: "分组备注",
    groupNotePlaceholder: "备注这个组的用途，例如：主力号、备用号、客户项目、测试账号。",
    groupNameRequired: "请先输入分组名称",
    savingGroups: "正在保存分组...",
    groupsSaved: "分组已保存",
    groupSaved: "分组修改已保存",
    groupCreated: "分组已创建",
    duplicateGroupName: "分组名称不能重复",
    cannotDeleteDefaultGroup: "默认分组不能删除",
    confirmDeleteGroup: (name) => `删除“${name}”吗？该组账号会移回默认分组。`,
    groupDeleted: "分组已删除",
    trashTitle: "垃圾桶",
    trashCount: (count) => `${count} 个账号`,
    moveToTrash: "放入垃圾桶",
    movingToTrash: "正在放入垃圾桶...",
    movedToTrash: "已放入垃圾桶",
    cannotTrashActiveAccount: "当前使用中的账号不能放入垃圾桶，请先切换到其他账号。",
    confirmTrashAccount: (email) => `把“${email}”放入垃圾桶吗？之后可以从垃圾桶恢复。`,
    restoreAccount: "恢复",
    restoringAccount: "正在恢复...",
    accountRestored: "账号已恢复",
    deleteAccountPermanently: "永久删除",
    deletingAccount: "正在永久删除...",
    accountDeleted: "账号已永久删除",
    trashedAt: (time) => `放入时间：${time || "-"}`,
    confirmDeleteAccount: (email) => `永久删除“${email}”吗？这会删除本机保存的账号快照，不能从 GUI 恢复。`,
    activeNow: "当前使用中",
    active: "使用中",
    switch: "切换",
    switching: "切换并重启中...",
    switchedRestarting: "已切换，正在重启 Codex App",
    switchedRestartNotAvailable: "已切换，当前系统不支持自动重启 Codex App",
    loadingAccounts: "加载账号中...",
    loadedAccounts: (count) => `已加载 ${count} 个账号`,
    loadFailed: "加载失败",
    couldNotLoadAccounts: "账号加载失败",
    unknown: "未知账号",
    startingLogin: "正在启动登录...",
    preparingLoginFlow: "正在准备登录流程...",
    waitingForLoginLogs: "正在等待登录日志...",
    accountAdded: "账号已添加",
    accountAddedRestarting: "账号已添加，正在重启 Codex App",
    loginFailed: "登录失败",
    missingAccountIndex: "缺少账号序号",
  },
  en: {
    refreshAccounts: "Refresh Accounts",
    addAccount: "Add Account",
    sidebarTip1: "Switching updates your local `~/.codex/auth.json` session.",
    sidebarTip2: "After switching, Codex App restarts automatically so the new account takes effect.",
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
    groupLabel: "Group",
    addGroup: "Add group",
    createGroup: "Create group",
    createGroupTitle: "Add group",
    cancel: "Cancel",
    saveGroup: "Save",
    deleteGroup: "Delete group",
    defaultGroupName: "Default group",
    groupNameLabel: "Group name",
    groupNamePlaceholder: "Primary, backup, project, or testing",
    groupNoteLabel: "Group note",
    groupNotePlaceholder: "Add a note for this group, such as primary, backup, client project, or testing.",
    groupNameRequired: "Enter a group name first",
    savingGroups: "Saving groups...",
    groupsSaved: "Groups saved",
    groupSaved: "Group changes saved",
    groupCreated: "Group created",
    duplicateGroupName: "Group names must be unique",
    cannotDeleteDefaultGroup: "The default group cannot be deleted",
    confirmDeleteGroup: (name) => `Delete "${name}"? Accounts in this group will move back to the default group.`,
    groupDeleted: "Group deleted",
    trashTitle: "Trash",
    trashCount: (count) => `${count} account${count === 1 ? "" : "s"}`,
    moveToTrash: "Move to trash",
    movingToTrash: "Moving to trash...",
    movedToTrash: "Moved to trash",
    cannotTrashActiveAccount: "The active account cannot be moved to trash. Switch to another account first.",
    confirmTrashAccount: (email) => `Move "${email}" to trash? You can restore it later.`,
    restoreAccount: "Restore",
    restoringAccount: "Restoring...",
    accountRestored: "Account restored",
    deleteAccountPermanently: "Delete permanently",
    deletingAccount: "Deleting permanently...",
    accountDeleted: "Account permanently deleted",
    trashedAt: (time) => `Moved at: ${time || "-"}`,
    confirmDeleteAccount: (email) => `Permanently delete "${email}"? This deletes the local account snapshot and cannot be restored from the GUI.`,
    activeNow: "Active now",
    active: "Active",
    switch: "Switch",
    switching: "Switching and restarting...",
    switchedRestarting: "Switched. Restarting Codex App.",
    switchedRestartNotAvailable: "Switched. Automatic Codex App restart is not available here.",
    loadingAccounts: "Loading accounts...",
    loadedAccounts: (count) => `Loaded ${count} account${count === 1 ? "" : "s"}`,
    loadFailed: "Load failed",
    couldNotLoadAccounts: "Could not load accounts",
    unknown: "Unknown account",
    startingLogin: "Starting login...",
    preparingLoginFlow: "Preparing login flow...",
    waitingForLoginLogs: "Waiting for login logs...",
    accountAdded: "Account added",
    accountAddedRestarting: "Account added. Restarting Codex App.",
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
  createGroupButton.textContent = t("addGroup");
  textNodes.heroEyebrow.textContent = t("heroEyebrow");
  textNodes.heroTitle.textContent = t("heroTitle");
  textNodes.consoleTitle.textContent = t("consoleTitle");
  textNodes.sidebarTip1.textContent = t("sidebarTip1");
  textNodes.sidebarTip2.textContent = t("sidebarTip2");
  authLink.textContent = t("openLoginPage");
  trashTitle.textContent = t("trashTitle");
  groupDialogTitle.textContent = t("createGroupTitle");
  groupNameLabel.textContent = t("groupNameLabel");
  groupNoteLabel.textContent = t("groupNoteLabel");
  newGroupNameInput.placeholder = t("groupNamePlaceholder");
  newGroupNoteInput.placeholder = t("groupNotePlaceholder");
  cancelGroupButton.textContent = t("cancel");
  confirmGroupButton.textContent = t("createGroup");
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

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(currentLanguage === "zh" ? "zh-CN" : "en-US");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function sortedGroups() {
  const entries = Object.entries(groupState.groups || {});
  entries.sort(([a], [b]) => {
    if (a === "default") return -1;
    if (b === "default") return 1;
    return a.localeCompare(b);
  });
  return entries;
}

function groupIdForAccount(account) {
  if (!account.accountKey) return "default";
  return groupState.accountGroups?.[account.accountKey] || "default";
}

function buildGroupOptions(selectedGroupId) {
  return sortedGroups()
    .map(([id, group]) => {
      const selected = id === selectedGroupId ? "selected" : "";
      return `<option value="${id}" ${selected}>${group.name}</option>`;
    })
    .join("");
}

function normalizedGroupName(name) {
  return String(name || "").trim().toLocaleLowerCase();
}

function groupNameExists(name, exceptGroupId = null) {
  const normalizedName = normalizedGroupName(name);
  return sortedGroups().some(([id, group]) => {
    return id !== exceptGroupId && normalizedGroupName(group.name) === normalizedName;
  });
}

async function saveGroupState(successText = t("groupsSaved")) {
  setStatus(t("savingGroups"));
  const data = await fetchJson("/api/groups", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(groupState),
  });
  groupState = data.state;
  setStatus(successText);
  renderAccounts(accountsCache);
}

async function moveAccountToTrash(account) {
  if (account.active) {
    setStatus(t("cannotTrashActiveAccount"));
    return;
  }
  if (!account.accountKey) return;
  const email = account.account || t("unknown");
  if (!window.confirm(t("confirmTrashAccount", email))) return;

  try {
    setStatus(t("movingToTrash"));
    const data = await fetchJson("/api/accounts/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountKey: account.accountKey }),
    });
    groupState = data.state || groupState;
    setStatus(t("movedToTrash"));
    await loadAccounts();
  } catch (error) {
    setStatus(error.message);
  }
}

async function restoreAccount(account) {
  if (!account.accountKey) return;
  try {
    setStatus(t("restoringAccount"));
    const data = await fetchJson("/api/accounts/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountKey: account.accountKey }),
    });
    groupState = data.state || groupState;
    setStatus(t("accountRestored"));
    await loadAccounts();
  } catch (error) {
    setStatus(error.message);
  }
}

async function deleteAccountPermanently(account) {
  if (!account.accountKey) return;
  const email = account.account || t("unknown");
  if (!window.confirm(t("confirmDeleteAccount", email))) return;

  try {
    setStatus(t("deletingAccount"));
    const data = await fetchJson("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountKey: account.accountKey }),
    });
    groupState = data.state || groupState;
    setStatus(t("accountDeleted"));
    await loadAccounts();
  } catch (error) {
    setStatus(error.message);
  }
}

function setGroupDialogError(message = "") {
  groupDialogError.textContent = message;
}

function openGroupDialog() {
  newGroupNameInput.value = "";
  newGroupNoteInput.value = "";
  setGroupDialogError();
  groupDialog.classList.remove("hidden");
  groupDialog.setAttribute("aria-hidden", "false");
  window.setTimeout(() => newGroupNameInput.focus(), 0);
}

function closeGroupDialog() {
  groupDialog.classList.add("hidden");
  groupDialog.setAttribute("aria-hidden", "true");
  setGroupDialogError();
}

async function createGroup() {
  const name = newGroupNameInput.value.trim();
  const note = newGroupNoteInput.value.trim();
  if (!name) {
    setGroupDialogError(t("groupNameRequired"));
    newGroupNameInput.focus();
    return;
  }
  if (groupNameExists(name)) {
    setGroupDialogError(t("duplicateGroupName"));
    newGroupNameInput.focus();
    return;
  }

  let id = `group_${Date.now().toString(36)}`;
  while (groupState.groups[id]) {
    id = `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }
  groupState.groups[id] = { name, note };
  closeGroupDialog();
  try {
    await saveGroupState(t("groupCreated"));
  } catch (error) {
    delete groupState.groups[id];
    setStatus(error.message);
  }
}

async function saveGroupEdits(groupId, nameInput, noteInput) {
  const name = nameInput.value.trim();
  const note = noteInput.value.trim();
  if (!name) {
    nameInput.focus();
    setStatus(t("groupNameRequired"));
    return;
  }
  if (groupNameExists(name, groupId)) {
    nameInput.focus();
    setStatus(t("duplicateGroupName"));
    return;
  }
  const previousGroup = { ...groupState.groups[groupId] };
  groupState.groups[groupId].name = name;
  groupState.groups[groupId].note = note;
  try {
    await saveGroupState(t("groupSaved"));
  } catch (error) {
    groupState.groups[groupId] = previousGroup;
    nameInput.value = previousGroup.name;
    noteInput.value = previousGroup.note || "";
    setStatus(error.message);
  }
}

async function deleteGroup(groupId) {
  if (groupId === "default") {
    setStatus(t("cannotDeleteDefaultGroup"));
    return;
  }
  const groupName = groupState.groups[groupId]?.name || t("defaultGroupName");
  if (!window.confirm(t("confirmDeleteGroup", groupName))) return;

  delete groupState.groups[groupId];
  for (const [accountKey, assignedGroupId] of Object.entries(groupState.accountGroups)) {
    if (assignedGroupId === groupId) {
      delete groupState.accountGroups[accountKey];
    }
  }
  await saveGroupState();
  setStatus(t("groupDeleted"));
}

function renderAccountCard(account) {
  const node = template.content.firstElementChild.cloneNode(true);
  const selectedGroupId = groupIdForAccount(account);

  node.querySelector(".account-index").textContent = `${t("account")} ${account.index}`;
  node.querySelector(".account-email").textContent = account.account || account.raw || t("unknown");
  node.querySelector(".plan-pill").textContent = account.plan || "Plan";
  node.querySelector(".label-group").textContent = t("groupLabel");
  node.querySelector(".label-5h").textContent = t("usage5hLabel");
  node.querySelector(".label-weekly").textContent = t("usageWeeklyLabel");
  node.querySelector(".label-last-activity").textContent = t("lastActivityLabel");
  node.querySelector(".usage-5h").textContent = account.usage5h || "-";
  node.querySelector(".usage-weekly").textContent = account.usageWeekly || "-";
  node.querySelector(".last-activity").textContent = account.lastActivity || "-";

  const groupSelect = node.querySelector(".group-select");
  groupSelect.innerHTML = buildGroupOptions(selectedGroupId);
  groupSelect.addEventListener("change", async () => {
    if (!account.accountKey) return;
    if (groupSelect.value === "default") {
      delete groupState.accountGroups[account.accountKey];
    } else {
      groupState.accountGroups[account.accountKey] = groupSelect.value;
    }
    await saveGroupState();
  });

  const activeLabel = node.querySelector(".active-label");
  activeLabel.textContent = t("activeNow");
  if (account.active) activeLabel.classList.remove("hidden");

  const trashButton = node.querySelector(".trash-account-button");
  trashButton.textContent = t("moveToTrash");
  trashButton.disabled = !!account.active || !account.accountKey;
  trashButton.title = account.active ? t("cannotTrashActiveAccount") : "";
  trashButton.addEventListener("click", () => moveAccountToTrash(account));

  const switchButton = node.querySelector(".switch-button");
  switchButton.disabled = !!account.active;
  switchButton.textContent = account.active ? t("active") : t("switch");
  switchButton.addEventListener("click", async () => {
    try {
      setStatus(t("switching"));
      const normalizedIndex = String(Number.parseInt(account.index, 10));
      const data = await fetchJson("/api/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: normalizedIndex }),
      });
      setStatus(data.restart?.scheduled ? t("switchedRestarting") : t("switchedRestartNotAvailable"));
      await loadAccounts();
    } catch (error) {
      setStatus(error.message);
    }
  });

  return node;
}

function renderTrashCard(account) {
  const node = trashTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".trash-index").textContent = `${t("account")} ${account.index}`;
  node.querySelector(".trash-email").textContent = account.account || account.raw || t("unknown");
  node.querySelector(".trash-meta").textContent = t("trashedAt", formatDateTime(account.trashedAt));

  const restoreButton = node.querySelector(".restore-account-button");
  restoreButton.textContent = t("restoreAccount");
  restoreButton.addEventListener("click", () => restoreAccount(account));

  const deleteButton = node.querySelector(".delete-account-button");
  deleteButton.textContent = t("deleteAccountPermanently");
  deleteButton.addEventListener("click", () => deleteAccountPermanently(account));

  return node;
}

function renderTrash(accounts) {
  trashGrid.innerHTML = "";
  trashCount.textContent = t("trashCount", accounts.length);
  trashSection.classList.toggle("hidden", accounts.length === 0);
  for (const account of accounts) {
    trashGrid.appendChild(renderTrashCard(account));
  }
}

function renderAccounts(accounts) {
  accountsGrid.innerHTML = "";
  for (const [groupId, group] of sortedGroups()) {
    const section = groupTemplate.content.firstElementChild.cloneNode(true);
    const groupAccounts = accounts.filter((account) => groupIdForAccount(account) === groupId);
    const nameInput = section.querySelector(".group-name-input");
    const noteInput = section.querySelector(".group-note-input");
    const saveGroupButton = section.querySelector(".save-group-button");
    const deleteGroupButton = section.querySelector(".delete-group-button");
    const groupAccountsNode = section.querySelector(".group-accounts");

    nameInput.value = group.name;
    noteInput.value = group.note || "";
    noteInput.placeholder = t("groupNotePlaceholder");
    saveGroupButton.textContent = t("saveGroup");
    saveGroupButton.addEventListener("click", () => saveGroupEdits(groupId, nameInput, noteInput));
    deleteGroupButton.textContent = t("deleteGroup");
    deleteGroupButton.disabled = groupId === "default";
    deleteGroupButton.title = groupId === "default" ? t("cannotDeleteDefaultGroup") : "";
    deleteGroupButton.addEventListener("click", () => deleteGroup(groupId));

    nameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveGroupEdits(groupId, nameInput, noteInput);
      }
    });

    for (const account of groupAccounts) {
      groupAccountsNode.appendChild(renderAccountCard(account));
    }
    accountsGrid.appendChild(section);
  }
}

async function loadAccounts() {
  try {
    setStatus(t("loadingAccounts"));
    const data = await fetchJson("/api/accounts");
    accountsCache = data.accounts;
    trashCache = data.trash || [];
    groupState = data.state || groupState;
    renderAccounts(accountsCache);
    renderTrash(trashCache);
    setStatus(t("loadedAccounts", data.accounts.length));
  } catch (error) {
    accountsGrid.innerHTML = `<article class="account-card"><h3>${t("couldNotLoadAccounts")}</h3><p>${error.message}</p></article>`;
    renderTrash([]);
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
      setStatus(data.restart?.scheduled ? t("accountAddedRestarting") : t("accountAdded"));
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
createGroupButton.addEventListener("click", openGroupDialog);
cancelGroupButton.addEventListener("click", closeGroupDialog);
confirmGroupButton.addEventListener("click", createGroup);
groupDialog.addEventListener("click", (event) => {
  if (event.target === groupDialog) closeGroupDialog();
});
newGroupNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createGroup();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !groupDialog.classList.contains("hidden")) {
    closeGroupDialog();
  }
});
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
