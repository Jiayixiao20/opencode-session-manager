const DEFAULT_PORT = 8765
const PORT_START = 8765
const PORT_END = 8876
const PROBE_TIMEOUT_MS = 1500

// CWS 构建时替换为真实密钥，GitHub 仅为占位符
const PROVISION_SECRET = 'REPLACE_ME_BEFORE_CWS_BUILD'

async function setServicePort(port) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ servicePort: port }, resolve)
  })
}

async function getStoredPort() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['servicePort'], (r) => resolve(r.servicePort))
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

async function provisionSecret(port) {
  try {
    await fetch(`http://localhost:${port}/api/license/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: PROVISION_SECRET })
    })
  } catch {
  }
}

async function fetchLicense(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/license/status`)
    if (res.ok) return res.json()
  } catch {
  }
  return { type: 'free', activated: null }
}

async function updateUI() {
  const statusEl = document.getElementById('status')
  const licenseEl = document.getElementById('license')
  const openBtn = document.getElementById('open')
  const installBtn = document.getElementById('install')
  const upgradeBtn = document.getElementById('upgrade')

  const { ok, url, port } = await checkService()

  if (ok) {
    await provisionSecret(port)
    const lic = await fetchLicense(port)
    statusEl.textContent = `✓ Service online (port ${port})`
    statusEl.className = 'status ok'
    openBtn.style.display = 'block'
    openBtn.onclick = () => chrome.tabs.create({ url })
    installBtn.style.display = 'none'

    if (lic.type === 'pro') {
      licenseEl.textContent = `✦ Pro`
      licenseEl.className = 'license pro'
      upgradeBtn.style.display = 'none'
    } else {
      licenseEl.textContent = '♢ Free (delete requires Pro)'
      licenseEl.className = 'license free'
      upgradeBtn.style.display = 'block'
      upgradeBtn.onclick = () => chrome.tabs.create({ url: 'https://example.com/buy' })
    }
  } else {
    statusEl.textContent = '✗ Local service not running'
    statusEl.className = 'status err'
    openBtn.style.display = 'none'
    installBtn.style.display = 'block'
    licenseEl.style.display = 'none'
  }
}

document.getElementById('install').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/Jiayixiao20/opencode-session-manager#installation' })
})

document.addEventListener('DOMContentLoaded', updateUI)
