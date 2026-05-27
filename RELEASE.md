## OpenCode Session Manager v1.0.0

A CLI tool that lists all your OpenCode sessions and generates an HTML table, making it easy to copy and open a specific session to continue your conversation with OpenCode.

### What's New

- **Session Listing**: Lists all OpenCode sessions from the local database
- **Copy & Open**: One-click copy of `opencode -s <session-id>` to continue any session
- **HTML Table**: Generates a beautiful, searchable HTML page
- **Bookmark-Friendly**: Bookmark the generated HTML for instant access
- **Cross-Platform**: Works on Linux, macOS, and Windows
- **Search & Filter**: Real-time search and time range filtering

### Installation

**One-line install (Linux/macOS):**
```bash
curl -fsSL https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.sh | bash
```

**Via npm:**
```bash
npm install -g opencode-session-manager
```

**Manual:**
```bash
git clone https://github.com/Jiayixiao20/opencode-session-manager.git
cd opencode-session-manager
npm link
```

### Usage

```bash
opencode-sessions
```

Generates `sessions.html` in your `Downloads` folder. Open it in your browser and bookmark for quick access.

### Requirements

- Node.js 14+
- sqlite3

### Links

- [Full Documentation](https://github.com/Jiayixiao20/opencode-session-manager#readme)
- [中文文档](https://github.com/Jiayixiao20/opencode-session-manager/blob/main/README.zh-CN.md)
- [Report Issues](https://github.com/Jiayixiao20/opencode-session-manager/issues)

---

**Note:** This release requires `sqlite3` to be installed on your system. The database path is auto-detected based on your OS.
