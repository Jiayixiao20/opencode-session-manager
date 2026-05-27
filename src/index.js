#!/usr/bin/env node

const { execSync } = require("child_process")
const { writeFileSync } = require("fs")
const path = require("path")
const os = require("os")

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

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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

function query(sql) {
  const dbPath = getDbPath()
  try {
    const output = execSync(`sqlite3 "${dbPath}" "${sql}"`, { encoding: "utf-8" })
    return output.trim().split("\n").filter(Boolean)
  } catch (err) {
    console.error(`Error querying database: ${err.message}`)
    return []
  }
}

function getSessions() {
  const rows = query(`
    SELECT id, title, time_created, time_updated
    FROM session
    WHERE time_archived IS NULL
    ORDER BY time_updated DESC
  `)

  return rows.map((row) => {
    const [id, title, created, updated] = row.split("|")
    return {
      id,
      title: title || "(Untitled)",
      created: parseInt(created),
      updated: parseInt(updated),
    }
  })
}

function getMessageCount(sessionId) {
  const rows = query(`
    SELECT COUNT(*) FROM message WHERE session_id = '${sessionId}'
  `)
  return parseInt(rows[0] || "0")
}

function getFirstUserMessage(sessionId) {
  const rows = query(`
    SELECT data FROM message
    WHERE session_id = '${sessionId}'
    ORDER BY time_created ASC
    LIMIT 5
  `)

  for (const row of rows) {
    try {
      const data = JSON.parse(row)
      if (data.role === "user") {
        const parts = data.parts || []
        const textPart = parts.find((p) => p.type === "text")
        if (textPart?.text) {
          return truncate(textPart.text.trim(), 200)
        }
      }
    } catch {
      continue
    }
  }
  return ""
}

function generateHTML(sessions) {
  const rows = sessions
    .map(
      (s, index) => `
    <tr data-search="${escapeHtml((s.id + " " + s.summary).toLowerCase())}" data-time="${s.updated}">
      <td>${index + 1}</td>
      <td>
        <code style="font-size:12px;">opencode -s ${escapeHtml(shortenId(s.id))}</code>
        <button class="copy-btn" onclick="copyText('opencode -s ${s.id}')" title="Copy full command">📋</button>
      </td>
      <td class="summary">${escapeHtml(s.summary)}</td>
      <td>${s.messageCount}</td>
      <td>${s.lastActive}</td>
    </tr>`
    )
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
    .summary {
      color: #666;
      max-width: 600px;
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
          <th style="width: 200px;">Session</th>
          <th>Summary</th>
          <th style="width: 80px;">Msgs</th>
          <th style="width: 120px;">Last Active</th>
        </tr>
      </thead>
      <tbody id="tbody">
        ${rows}
      </tbody>
    </table>`
    }
    <div class="meta">${sessions.length} sessions · Generated ${formatDate(Date.now())}</div>
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
  </script>
</body>
</html>`
}

function main() {
  console.log("Reading session data...")

  const sessions = getSessions()
  console.log(`Found ${sessions.length} sessions`)

  const results = []
  for (const session of sessions) {
    const messageCount = getMessageCount(session.id)
    if (messageCount <= 1) {
      continue
    }

    let summary = getFirstUserMessage(session.id)
    
    if (!summary && session.title && session.title.toLowerCase().includes('lookup')) {
      summary = "lookup+" + session.title
    }

    results.push({
      id: session.id,
      summary: summary || session.title || "(No summary)",
      messageCount,
      lastActive: formatDate(session.updated),
      updated: session.updated,
    })
  }

  const outputPath = getDefaultOutputPath()
  const html = generateHTML(results)
  writeFileSync(outputPath, html, "utf-8")

  console.log(`✓ Generated ${outputPath}`)
  console.log(`  ${results.length} valid sessions`)
}

main()
