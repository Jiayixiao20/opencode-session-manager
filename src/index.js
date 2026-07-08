#!/usr/bin/env node

const { execFileSync } = require("child_process")
const { writeFileSync, createReadStream, existsSync, statSync, readFileSync, mkdirSync } = require("fs")
const path = require("path")
const os = require("os")
const readline = require("readline")
const http = require("http")
const { parse: parseUrl } = require("url")
const crypto = require("crypto")

function getDbPath() {
  const home = os.homedir()

  if (process.env.OPENCODE_DB) {
    return process.env.OPENCODE_DB
  }

  switch (process.platform) {
    case "darwin":
      return path.join(home, "Library/Application Support/opencode/opencode.db")
    case "win32":
      return path.join(process.env.APPDATA || home, "opencode", "opencode.db")
    default:
      return path.join(home, ".local/share/opencode/opencode.db")
  }
}

function getDefaultOutputPath() {
  const home = os.homedir()
  const customPath = process.env.OPENCODE_SESSIONS_OUTPUT

  if (customPath) {
    return customPath
  }

  return path.join(home, "Downloads", "sessions.html")
}

function getPortFilePath() {
  return path.join(os.homedir(), ".opencode-session-manager", "port")
}

function getDefaultPort() {
  return parseInt(process.env.OPENCODE_SESSIONS_PORT) || 8765
}

function writePortFile(port) {
  try {
    const portFile = getPortFilePath()
    const dir = path.dirname(portFile)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(portFile, String(port), "utf-8")
  } catch (err) {
    console.error(`Failed to write port file: ${err.message}`)
  }
}

let licenseSecret = null

function getLicensePath() {
  return path.join(os.homedir(), ".opencode-session-manager", "license")
}

function provisionLicenseSecret(secret) {
  licenseSecret = secret
}

function validateLicenseKey(key) {
  if (!licenseSecret) return false
  if (typeof key !== "string") return false
  key = key.trim().toUpperCase()
  if (!/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(key)) return false
  const parts = key.split("-")
  const sig = crypto.createHmac("sha256", licenseSecret)
    .update(parts[0] + "-" + parts[1] + "-" + parts[2])
    .digest("hex").toUpperCase()
  return sig.startsWith(parts[3])
}

function readLicense() {
  const lPath = getLicensePath()
  try {
    return JSON.parse(readFileSync(lPath, "utf-8"))
  } catch {
    return null
  }
}

function writeLicense(data) {
  const lPath = getLicensePath()
  const dir = path.dirname(lPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(lPath, JSON.stringify(data, null, 2), "utf-8")
}

function getLicenseStatus() {
  const lic = readLicense()
  if (lic && lic.type === "pro") {
    return { type: "pro", activated: lic.activated || null }
  }
  return { type: "free", activated: null }
}

function startServerWithPort(server, preferredPort, callback) {
  let port = preferredPort

  function tryListen() {
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        port++
        if (port > preferredPort + 100) {
          console.error(`Could not find an available port between ${preferredPort} and ${port}`)
          process.exit(1)
        }
        tryListen()
      } else {
        throw err
      }
    })

    server.listen(port, () => {
      writePortFile(port)
      callback(port)
    })
  }

  tryListen()
}
function formatDate(timestamp) {
  const date = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text || ""
  return text.slice(0, maxLength) + "..."
}

function shortenId(id) {
  return id.slice(0, 12) + "..."
}

function validateSessionId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_]+$/.test(id)
}

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''")
}

const MAX_BUFFER = 1024 * 1024 * 64

function execSql(sql) {
  const dbPath = getDbPath()
  return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8", maxBuffer: MAX_BUFFER })
}

function queryJson(sql) {
  try {
    const dbPath = getDbPath()
    const output = execFileSync("sqlite3", ["-json", dbPath, sql], { encoding: "utf-8", maxBuffer: MAX_BUFFER }).trim()
    if (!output) return []
    return JSON.parse(output)
  } catch (err) {
    console.error(`Error querying database: ${err.message}`)
    return []
  }
}

function execute(sql) {
  try {
    execSql(sql)
    return true
  } catch (err) {
    console.error(`Error executing SQL: ${err.message}`)
    return false
  }
}

function getDbSize() {
  try {
    return statSync(getDbPath()).size
  } catch {
    return 0
  }
}

function getSessionById(sessionId) {
  if (!validateSessionId(sessionId)) {
    console.error(`Invalid session ID: ${sessionId}`)
    return null
  }

  const rows = queryJson(`
    SELECT id, title, time_created AS created, time_updated AS updated
    FROM session
    WHERE id = '${escapeSqlString(sessionId)}' AND time_archived IS NULL
  `)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    title: row.title || "(Untitled)",
    created: parseInt(row.created),
    updated: parseInt(row.updated),
  }
}

function deleteSessionById(sessionId) {
  if (!validateSessionId(sessionId)) return false
  return execute(`PRAGMA foreign_keys = ON; DELETE FROM session WHERE id = '${escapeSqlString(sessionId)}'`)
}

function vacuumDatabase() {
  console.log("Running VACUUM to reclaim disk space...")
  try {
    execSql("VACUUM")
    console.log("✓ VACUUM complete")
    return true
  } catch (err) {
    console.error(`VACUUM failed: ${err.message}`)
    return false
  }
}

function buildSessionRow(sessions, index) {
  const s = sessions[index]
  const lowValueBadge = s.messageCount <= 1
    ? `<span class="low-value" title="Only ${s.messageCount} message(s)">low value</span>`
    : ""

  return `
    <tr data-search="${escapeHtml((s.id + " " + s.summary).toLowerCase())}" data-time="${s.updated}" data-id="${escapeHtml(s.id)}">
      <td>${index + 1}</td>
      <td>
        <code style="font-size:12px;">opencode -s ${escapeHtml(shortenId(s.id))}</code>
        <button class="copy-btn" onclick="copyText('opencode -s ${s.id}')" title="Copy full command">📋</button>
      </td>
      <td class="summary">${escapeHtml(s.summary)}${lowValueBadge}</td>
      <td>${s.messageCount}</td>
      <td>${formatDate(s.created)}</td>
      <td>${s.lastActive}</td>
      <td style="width: 90px;">
        <button class="delete-btn" onclick="deleteSession('${s.id}')" title="Delete this session">🗑️</button>
      </td>
    </tr>`
}

function generateHTML(sessions) {
  const rows = sessions
    .map((_, index) => buildSessionRow(sessions, index))
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Manager - OpenCode</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fafafa;
      color: #333;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      color: #1a1a1a;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-btns {
      display: flex;
      gap: 4px;
    }
    .filter-btn {
      padding: 6px 12px;
      font-size: 13px;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
    }
    .filter-btn:hover {
      background: #f5f5f5;
    }
    .filter-btn.active {
      background: #333;
      color: #fff;
      border-color: #333;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-box input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      width: 200px;
      outline: none;
    }
    .search-box input:focus {
      border-color: #666;
    }
    .search-box .count {
      font-size: 12px;
      color: #999;
      min-width: 60px;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    thead {
      background: #f5f5f5;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      font-size: 14px;
    }
    th {
      font-weight: 500;
      color: #666;
      border-bottom: 1px solid #e0e0e0;
    }
    td {
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
    }
    tr:hover {
      background: #fafafa;
    }
    tr.hidden {
      display: none;
    }
    code {
      font-family: "SF Mono", Monaco, monospace;
      font-size: 13px;
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      color: #333;
    }
    .copy-btn {
      margin-left: 8px;
      padding: 2px 6px;
      font-size: 12px;
      cursor: pointer;
      background: none;
      border: 1px solid #ddd;
      border-radius: 4px;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .copy-btn:hover {
      opacity: 1;
      background: #f0f0f0;
    }
    .delete-btn {
      padding: 2px 6px;
      font-size: 12px;
      cursor: pointer;
      background: none;
      border: 1px solid #ddd;
      border-radius: 4px;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .delete-btn:hover {
      opacity: 1;
      background: #fce8e6;
      border-color: #d93025;
    }
    .delete-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 18px;
      border-radius: 6px;
      font-size: 14px;
      color: #fff;
      background: #333;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s;
      z-index: 1000;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast.error {
      background: #d93025;
    }
    .summary {
      color: #666;
      max-width: 500px;
      word-break: break-word;
      line-height: 1.5;
    }
    .empty {
      text-align: center;
      padding: 60px 20px;
      color: #999;
      font-size: 14px;
    }
    .meta {
      margin-top: 16px;
      font-size: 12px;
      color: #999;
      text-align: right;
    }
    .low-value {
      color: #d93025;
      font-size: 11px;
      font-weight: 500;
      margin-left: 6px;
      border: 1px solid #fad2cf;
      background: #fce8e6;
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Session Manager</h1>
      <div class="controls">
        <div class="filter-btns">
          <button class="filter-btn active" data-days="all">All</button>
          <button class="filter-btn" data-days="1">Today</button>
          <button class="filter-btn" data-days="3">3 Days</button>
          <button class="filter-btn" data-days="7">7 Days</button>
          <button class="filter-btn" data-days="30">30 Days</button>
        </div>
        <div class="search-box">
          <input type="text" id="search" placeholder="Search sessions..." autocomplete="off">
          <span class="count" id="count">${sessions.length} total</span>
        </div>
      </div>
    </div>
    ${sessions.length === 0
      ? '<div class="empty">No sessions found</div>'
      : `<table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th style="width: 220px;">Session</th>
          <th>Summary</th>
          <th style="width: 80px;">Msgs</th>
          <th style="width: 130px;">Created</th>
          <th style="width: 120px;">Last Active</th>
          <th style="width: 90px;">Action</th>
        </tr>
      </thead>
      <tbody id="tbody">
        ${rows}
      </tbody>
    </table>`
    }
    <div class="meta">${sessions.length} sessions · Generated ${formatDate(Date.now())}</div>
    <div id="toast" class="toast"></div>
  </div>
  <script>
    const searchInput = document.getElementById('search');
    const countSpan = document.getElementById('count');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let currentDays = 'all';

    function filterRows() {
      const query = searchInput.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#tbody tr');
      const now = Date.now();
      let visible = 0;

      rows.forEach(row => {
        const searchable = row.getAttribute('data-search') || '';
        const time = parseInt(row.getAttribute('data-time') || '0');

        const matchesSearch = searchable.includes(query);
        let matchesTime = true;

        if (currentDays !== 'all') {
          const cutoff = now - parseInt(currentDays) * 24 * 60 * 60 * 1000;
          matchesTime = time >= cutoff;
        }

        if (matchesSearch && matchesTime) {
          row.classList.remove('hidden');
          visible++;
        } else {
          row.classList.add('hidden');
        }
      });

      countSpan.textContent = visible + ' sessions';
    }

    if (searchInput) {
      searchInput.addEventListener('input', filterRows);
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDays = btn.getAttribute('data-days');
        filterRows();
      });
    });

    function copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const original = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = original, 1500);
      });
    }

    const toast = document.getElementById('toast');
    function showToast(message, isError = false) {
      toast.textContent = message;
      toast.className = 'toast' + (isError ? ' error' : '');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    async function deleteSession(id) {
      if (!confirm('Delete this session? This cannot be undone.')) {
        return;
      }

      const row = document.querySelector('tr[data-id="' + id + '"]');
      const btn = row ? row.querySelector('.delete-btn') : null;
      if (btn) btn.disabled = true;

      try {
        const response = await fetch('/delete/' + id, { method: 'POST' });
        if (response.ok) {
          showToast('Session deleted');
          if (row) row.remove();
          filterRows();
          await fetch('/refresh', { method: 'POST' }).catch(() => {});
        } else {
          const text = await response.text();
          showToast('Delete failed: ' + text, true);
          if (btn) btn.disabled = false;
        }
      } catch (err) {
        showToast('Delete failed: ' + err.message, true);
        if (btn) btn.disabled = false;
      }
    }
  </script>
</body>
</html>`
}

function getSessionsWithStats() {
  const sessions = queryJson(`
    SELECT s.id, s.title, s.time_created AS created, s.time_updated AS updated,
           COUNT(m.session_id) AS messageCount
    FROM session s
    LEFT JOIN message m ON s.id = m.session_id
    WHERE s.time_archived IS NULL
    GROUP BY s.id
    ORDER BY s.time_updated DESC
  `)

  const firstMessages = queryJson(`
    WITH RankedUserMessages AS (
      SELECT session_id, data,
             ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY time_created ASC) AS rn
      FROM message
      WHERE json_extract(data, '$.role') = 'user'
    )
    SELECT session_id, data
    FROM RankedUserMessages
    WHERE rn = 1
  `)

  const firstMessageMap = new Map()
  for (const msg of firstMessages) {
    firstMessageMap.set(msg.session_id, msg.data)
  }

  return sessions.map((session) => {
    let summary = ""
    const dataStr = firstMessageMap.get(session.id)
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr)
        const parts = data.parts || []
        const textPart = parts.find((p) => p.type === "text")
        if (textPart?.text) {
          summary = truncate(textPart.text.trim(), 200)
        }
      } catch {
      }
    }

    if (!summary && session.title && session.title.toLowerCase().includes("lookup")) {
      summary = "lookup+" + session.title
    }

    return {
      id: session.id,
      title: session.title || "(Untitled)",
      summary: summary || session.title || "(No summary)",
      messageCount: session.messageCount || 0,
      created: parseInt(session.created),
      updated: parseInt(session.updated),
      lastActive: formatDate(parseInt(session.updated)),
    }
  })
}

function promptConfirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes")
    })
  })
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const command = args[0] || "generate"
  const options = {
    command,
    ids: [],
    olderThan: null,
    minMessages: null,
    dryRun: false,
    force: false,
    vacuum: true,
  }

  const isFlag = (arg) => arg.startsWith("-")

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    if (arg === "--older-than" || arg === "-d") {
      options.olderThan = parseInt(next)
      i++
    } else if (arg === "--min-messages" || arg === "-m") {
      options.minMessages = parseInt(next)
      i++
    } else if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true
    } else if (arg === "--force" || arg === "-f") {
      options.force = true
    } else if (arg === "--no-vacuum") {
      options.vacuum = false
    } else if (!isFlag(arg)) {
      options.ids.push(arg)
    }
  }

  return options
}

function printUsage() {
  console.log(`
OpenCode Session Manager

Usage:
  opencode-sessions                          Generate sessions.html (default)
  opencode-sessions delete <id>              Delete a specific session
  opencode-sessions delete --older-than 30   Delete sessions older than 30 days
  opencode-sessions delete --min-messages 1  Delete sessions with 1 or fewer messages
  opencode-sessions delete --older-than 30 --min-messages 1
  opencode-sessions serve                    Start local web server for interactive HTML

Delete options:
  -d, --older-than <days>   Delete sessions not updated in the last N days
  -m, --min-messages <n>    Delete sessions with N or fewer messages
  -n, --dry-run             Show what would be deleted without deleting
  -f, --force               Skip confirmation prompt
      --no-vacuum           Skip VACUUM after deletion

Server options:
  OPENCODE_SESSIONS_PORT    Port for the local server (default: 8765)

Environment variables:
  OPENCODE_DB               Path to OpenCode database
  OPENCODE_SESSIONS_OUTPUT  Output HTML file path
`)
}

async function handleDelete(options) {
  if (options.ids.length > 0 && (options.olderThan || options.minMessages !== null)) {
    console.error("Error: Cannot combine specific session IDs with --older-than or --min-messages")
    process.exit(1)
  }

  const stats = getSessionsWithStats()
  let targets = []

  if (options.ids.length > 0) {
    for (const id of options.ids) {
      const session = stats.find((s) => s.id === id) || getSessionById(id)
      if (!session) {
        console.error(`Session not found: ${id}`)
        process.exit(1)
      }
      targets.push(session)
    }
  } else {
    const now = Date.now()
    targets = stats.filter((s) => {
      if (options.olderThan && s.updated >= now - options.olderThan * 24 * 60 * 60 * 1000) {
        return false
      }
      if (options.minMessages !== null && s.messageCount > options.minMessages) {
        return false
      }
      return true
    })
  }

  if (targets.length === 0) {
    console.log("No sessions match the given criteria.")
    return
  }

  const totalMessages = targets.reduce((sum, s) => sum + s.messageCount, 0)

  console.log(`\nFound ${targets.length} session(s) to delete:`)
  for (const s of targets) {
    console.log(`  - ${shortenId(s.id)} | ${s.messageCount} msgs | ${s.summary}`)
  }
  console.log(`  Total messages: ${totalMessages}`)

  if (options.dryRun) {
    console.log("\n--dry-run: no changes made")
    return
  }

  if (!options.force) {
    const confirmed = await promptConfirm(`\nDelete ${targets.length} session(s)?`)
    if (!confirmed) {
      console.log("Cancelled")
      return
    }
  }

  const result = await performDelete(targets, options.vacuum)

  if (result.success > 0 && result.failed.length === 0 && options.exitCode !== false) {
    process.exit(0)
  }
}

async function performDelete(targets, shouldVacuum = true) {
  const sizeBefore = getDbSize()
  console.log(`\nDatabase size before: ${formatBytes(sizeBefore)}`)

  let success = 0
  const failed = []
  for (const s of targets) {
    if (deleteSessionById(s.id)) {
      success++
    } else {
      console.error(`Failed to delete session: ${s.id}`)
      failed.push(s.id)
    }
  }

  console.log(`✓ Deleted ${success}/${targets.length} session(s)`)

  if (shouldVacuum && success > 0) {
    vacuumDatabase()
    const sizeAfter = getDbSize()
    console.log(`Database size after:  ${formatBytes(sizeAfter)}`)
    if (sizeAfter < sizeBefore) {
      console.log(`Reclaimed:            ${formatBytes(sizeBefore - sizeAfter)}`)
    }
  }

  return { success, failed, sizeBefore, sizeAfter: getDbSize() }
}

async function handleServe() {
  const preferredPort = getDefaultPort()
  const outputPath = getDefaultOutputPath()

  if (!existsSync(outputPath)) {
    console.log(`Output file not found, generating ${outputPath}...`)
    const sessions = getSessionsWithStats().filter((s) => s.messageCount > 1)
    const html = generateHTML(sessions)
    writeFileSync(outputPath, html, "utf-8")
  }

  let actualPort = preferredPort

  const server = http.createServer(async (req, res) => {
    const { pathname } = parseUrl(req.url, true)

    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === "POST" && pathname.startsWith("/delete/")) {
      const lic = getLicenseStatus()
      if (lic.type !== "pro") {
        res.writeHead(402)
        res.end("Pro license required for delete operations")
        return
      }
      const id = pathname.slice("/delete/".length)
      if (!validateSessionId(id)) {
        res.writeHead(400)
        res.end("Invalid session ID")
        return
      }

      const session = getSessionById(id)
      if (!session) {
        res.writeHead(404)
        res.end("Session not found")
        return
      }

      const result = await performDelete([session], true)
      if (result.success > 0) {
        res.writeHead(200)
        res.end("OK")
      } else {
        res.writeHead(500)
        res.end("Delete failed")
      }
      return
    }

    if (pathname === "/refresh") {
      try {
        const sessions = getSessionsWithStats().filter((s) => s.messageCount > 1)
        const html = generateHTML(sessions)
        writeFileSync(outputPath, html, "utf-8")
        res.writeHead(200)
        res.end("OK")
      } catch (err) {
        res.writeHead(500)
        res.end(err.message)
      }
      return
    }

    if (pathname === "/api/sessions") {
      try {
        const sessions = getSessionsWithStats().filter((s) => s.messageCount > 1)
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ count: sessions.length, sessions }))
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    if (pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true, port: actualPort }))
      return
    }

    if (pathname === "/api/license/provision" && req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => body += chunk)
      req.on("end", () => {
        try {
          const { secret } = JSON.parse(body)
          if (secret && typeof secret === "string" && secret.length >= 16) {
            provisionLicenseSecret(secret)
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ ok: true }))
          } else {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ ok: false, error: "Invalid secret" }))
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Invalid request" }))
        }
      })
      return
    }

    if (pathname === "/api/license/status") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(getLicenseStatus()))
      return
    }

    if (pathname === "/api/license/activate" && req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => body += chunk)
      req.on("end", () => {
        try {
          const { key } = JSON.parse(body)
          if (validateLicenseKey(key)) {
            writeLicense({ key, type: "pro", activated: Date.now() })
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ ok: true, type: "pro" }))
          } else {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ ok: false, error: "Invalid license key" }))
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Invalid request" }))
        }
      })
      return
    }

    if (pathname === "/api/license/deactivate" && req.method === "POST") {
      try {
        const lPath = getLicensePath()
        if (existsSync(lPath)) {
          writeFileSync(lPath, JSON.stringify({ type: "free" }, null, 2), "utf-8")
        }
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ ok: true, type: "free" }))
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: err.message }))
      }
      return
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    createReadStream(outputPath).pipe(res)
  })

  startServerWithPort(server, preferredPort, (port) => {
    actualPort = port
    console.log(`Session server running at http://localhost:${port}`)
    console.log(`Open this URL in your browser to view and delete sessions`)
  })
}

async function handleGenerate() {
  console.log("Reading session data...")

  const sessions = getSessionsWithStats().filter((s) => s.messageCount > 1)
  console.log(`Found ${sessions.length} valid sessions`)

  const outputPath = getDefaultOutputPath()
  const html = generateHTML(sessions)
  writeFileSync(outputPath, html, "utf-8")

  console.log(`✓ Generated ${outputPath}`)
  console.log(`  ${sessions.length} valid sessions`)
  console.log(`\nTip: run "opencode-sessions serve" to open an interactive page with delete buttons`)
}

async function main() {
  const options = parseArgs(process.argv)

  switch (options.command) {
    case "generate":
    case "gen":
    case "html":
      await handleGenerate()
      break
    case "delete":
    case "rm":
      await handleDelete(options)
      break
    case "serve":
    case "server":
      await handleServe()
      break
    case "help":
    case "--help":
    case "-h":
      printUsage()
      break
    default:
      console.error(`Unknown command: ${options.command}`)
      printUsage()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
