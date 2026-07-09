const DEFAULT_PORT = 8765
const PORT_START = 8765
const PORT_END = 8876
const PROBE_TIMEOUT_MS = 1500

// ── i18n ──────────────────────────────────────────────────────────────────
const I18N = {
  en: {
    heading: "OpenCode Session Manager",
    checking: "Checking local service...",
    online: (port) => `✓ Service online (port ${port})`,
    offline: "✗ Local service not running",
    openDashboard: "Open Dashboard",
    installService: "Install Local Service",
  },
  zh: {
    heading: "OpenCode 会话管理器",
    checking: "正在检测本地服务...",
    online: (port) => `✓ 服务运行中（端口 ${port}）`,
    offline: "✗ 本地服务未运行",
    openDashboard: "打开控制台",
    installService: "安装本地服务",
  },
}

function detectLang() {
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en"
}

function t(key, ...args) {
  const d = I18N[detectLang()]
  const v = d[key]
  return typeof v === "function" ? v(...args) : v
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n")
    el.textContent = t(key)
  })
}
// ─────────────────────────────────────────────────────────────────────────

async function getStoredPort() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["servicePort"], (r) => resolve(r.servicePort))
  })
}

async function setServicePort(port) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ servicePort: port }, resolve)
  })
}

async function probePort(port) {
  const url = `http://localhost:${port}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(`${url}/api/health`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) return { ok: true, url, port }
  } catch {
  }
  return { ok: false, url, port }
}

async function scanPorts() {
  const stored = await getStoredPort()
  const portsToTry = new Set()
  if (stored) portsToTry.add(stored)
  portsToTry.add(DEFAULT_PORT)
  for (let p = PORT_START; p <= PORT_END; p++) portsToTry.add(p)

  const probes = Array.from(portsToTry).map((port) => probePort(port))
  const results = await Promise.all(probes)
  const found = results.find((r) => r.ok)
  if (found) {
    await setServicePort(found.port)
    return found
  }
  return { ok: false, url: `http://localhost:${DEFAULT_PORT}`, port: DEFAULT_PORT }
}

async function checkService() {
  const stored = await getStoredPort()
  if (stored) {
    const result = await probePort(stored)
    if (result.ok) return result
  }
  return scanPorts()
}

async function updateUI() {
  const statusEl = document.getElementById("status")
  const openBtn = document.getElementById("open")
  const installBtn = document.getElementById("install")

  const { ok, url, port } = await checkService()

  if (ok) {
    statusEl.textContent = t("online", port)
    statusEl.className = "status ok"
    openBtn.style.display = "block"
    openBtn.onclick = () => chrome.tabs.create({ url })
    installBtn.style.display = "none"
  } else {
    statusEl.textContent = t("offline")
    statusEl.className = "status err"
    openBtn.style.display = "none"
    installBtn.style.display = "block"
  }

  applyI18n()
}

document.getElementById("install").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://github.com/Jiayixiao20/opencode-session-manager#installation" })
})

document.addEventListener("DOMContentLoaded", updateUI)
