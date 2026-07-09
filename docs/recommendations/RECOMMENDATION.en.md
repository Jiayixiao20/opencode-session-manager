# 🧩 OpenCode Session Manager — Never Lose a Session Again

<div align="center">

![OpenCode Session Manager](https://img.shields.io/badge/OpenCode-Session%20Manager-2563EB?style=flat-square&logo=github&logoColor=white)
![100% Free](https://img.shields.io/badge/Free-100%25-brightgreen?style=flat-square)
![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A514-339933?style=flat-square&logo=node.js&logoColor=white)

**OpenCode Session Manager** — A local service + browser extension combo that lets you find and resume any OpenCode conversation in one click.

[⭐ GitHub](https://github.com/Jiayixiao20/opencode-session-manager) · [📖 Docs](https://github.com/Jiayixiao20/opencode-session-manager) · [🔌 Extension ZIP](https://github.com/Jiayixiao20/opencode-session-manager/releases)

</div>

---

## 📖 Table of Contents

- [What Is It?](#what-is-it)
- [Key Features](#key-features)
- [Installation](#installation)
- [Usage](#usage)
- [System Requirements](#system-requirements)
- [FAQ](#faq)

---

## 🎯 What Is It?

Ever had 50+ OpenCode conversations and couldn't find the one you needed? **OpenCode Session Manager** solves that.

Two components, zero cloud dependency:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   OpenCode Session Manager                               │
│   ┌──────────────────┐       ┌──────────────────────┐  │
│   │  Local Node.js   │◀──────▶│  Browser Extension   │  │
│   │  opencode-sessions│       │  Search · Filter ·   │  │
│   │  (Port 8765)     │       │  Resume Sessions     │  │
│   └──────────────────┘       └──────────────────────┘  │
│             │                                              │
│             ▼                                              │
│   ~/.local/share/opencode/opencode.db                     │
│   (Your OpenCode SQLite DB — never leaves your machine)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

| Component | Description |
|-----------|-------------|
| **Local service** | `opencode-sessions serve` — reads your OpenCode SQLite database |
| **Web UI** | `http://localhost:8765` — search, filter, delete sessions |
| **Browser extension** | Chrome / Edge popup button for one-click dashboard access |
| **Static HTML** | `opencode-sessions` — export to a portable HTML file |

> 🔒 **Privacy**: All data stays on your machine. No cloud sync. No telemetry. No accounts.

---

## ✨ Key Features

### 🔍 Global Search

Search every OpenCode session instantly from the web UI.

```
Type keyword → Live filter → Click session → opencode -s <ID> → Resume
```

### 📊 Smart Filters

| Range | Button |
|-------|--------|
| All time | **All** |
| Today | **Today** |
| Last 3 days | **3 Days** |
| Last 7 days | **7 Days** |
| Last 30 days | **30 Days** |

### 🗑️ One-Click Delete

Every row has a delete button. Deletion triggers a SQLite `VACUUM` to reclaim disk space immediately.

**CLI bulk cleanup:**

```bash
# Preview low-value sessions (≤1 messages, no deletion)
opencode-sessions delete --min-messages 1 --dry-run

# Force-delete low-value sessions, skip confirmation
opencode-sessions delete --min-messages 1 --force

# Delete sessions older than 30 days
opencode-sessions delete --older-than 30
```

### 🌐 Bilingual Interface

Automatically detects your browser language and renders in **English** or **中文**. No manual toggle needed.

### ⚡ Auto-Start on Boot

- **Linux** → systemd user service (auto-configured by installer)
- **macOS** → launchd agent (auto-configured by installer)

---

## 🚀 Installation

### Method 1: One-Line Install (Recommended)

<div align="center">

| Platform | Command |
|----------|---------|
| **macOS / Linux** | `curl -fsSL https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.sh \| bash` |
| **Windows (PowerShell)** | `irm https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.ps1 \| iex` |

</div>

### Method 2: Browser Extension

1. Download `opencode-session-manager-extension.zip` from [Releases](https://github.com/Jiayixiao20/opencode-session-manager/releases)
2. Extract → Open `chrome://extensions/` in Chrome / Edge
3. Enable **Developer mode** → **Load unpacked** → select the extracted folder
4. Click the extension icon → **Install Local Service**

### Method 3: Manual Install

```bash
# 1. Clone
git clone https://github.com/Jiayixiao20/opencode-session-manager.git
cd opencode-session-manager

# 2. Link to PATH
npm link

# 3. Start the service
opencode-sessions serve

# 4. Open in browser
open http://localhost:8765
```

---

## 🛠️ Usage

### Start the Service

```bash
opencode-sessions serve                     # Default port 8765
OPENCODE_SESSIONS_PORT=8080 opencode-sessions serve  # Custom port
```

### Generate Static HTML

```bash
opencode-sessions   # Outputs to ~/.opencode-session-manager/sessions.html
```

### Manage the Service

```bash
systemctl --user start opencode-session-manager    # Start
systemctl --user stop opencode-session-manager     # Stop
systemctl --user status opencode-session-manager   # Status
systemctl --user disable opencode-session-manager  # Disable auto-start
```

### Custom Database Path

```bash
OPENCODE_DB=/path/to/opencode.db opencode-sessions serve
```

---

## 📋 System Requirements

| Requirement | Details |
|-------------|---------|
| Node.js | ≥ 14.0.0 (18+ recommended) |
| sqlite3 | CLI tool (auto-installed by the installer) |
| Disk | < 1 MB project size |
| Database | `~/.local/share/opencode/opencode.db` (created by OpenCode) |

---

## ❓ FAQ

**Q: Port 8765 is already in use?**  
A: Use `OPENCODE_SESSIONS_PORT=8080 opencode-sessions serve`

**Q: Where does OpenCode store its database?**  
A: `~/.local/share/opencode/opencode.db` (Linux) / `~/Library/Application Support/opencode/` (macOS) / `%APPDATA%\opencode\` (Windows)

**Q: How do I update?**  
A: Re-run the install script. It overwrites the old version automatically.

---

<div align="center">

⭐ **Star it on GitHub** — [github.com/Jiayixiao20/opencode-session-manager](https://github.com/Jiayixiao20/opencode-session-manager)

**MIT License · 100% Free · Always will be**

</div>
