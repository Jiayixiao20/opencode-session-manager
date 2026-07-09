## OpenCode Session Manager v1.1.0

A CLI tool that lists all your OpenCode sessions and generates an HTML table, making it easy to copy and open a specific session to continue your conversation with OpenCode. Now with session deletion to reclaim disk space.

### What's New

- **Interactive Delete**: HTML table now includes 🗑️ delete buttons when served via `opencode-sessions serve`
- **Local Server**: New `serve` command starts a web UI for interactive session management
- **Session Deletion**: Delete specific sessions or bulk-delete by age and message count
- **Disk Space Reclaim**: Automatic `VACUUM` after deletion shrinks the database file
- **Dry Run Mode**: Preview deletions before committing
- **Safe Defaults**: Confirmation prompt before deletion (skip with `--force`)
- **Low-Value Highlight**: HTML table tags sessions with only one message

### Interactive Web UI

```bash
opencode-sessions serve
```

Open `http://localhost:8765` and click 🗑️ to delete sessions directly from the browser.

### Delete from Command Line

```bash
# Delete a specific session
opencode-sessions delete <session-id>

# Delete sessions older than 30 days
opencode-sessions delete --older-than 30

# Delete sessions with 1 or fewer messages
opencode-sessions delete --min-messages 1

# Preview only
opencode-sessions delete --min-messages 1 --dry-run
```

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

### Basic Usage

```bash
opencode-sessions
```

Generates `sessions.html` in `~/.opencode-session-manager/`. Open it in your browser and bookmark for quick access.

### Requirements

- Node.js 14+
- sqlite3

### Links

- [Full Documentation](https://github.com/Jiayixiao20/opencode-session-manager#readme)
- [中文文档](https://github.com/Jiayixiao20/opencode-session-manager/blob/main/README.zh-CN.md)
- [Report Issues](https://github.com/Jiayixiao20/opencode-session-manager/issues)

---

**Note:** This release requires `sqlite3` to be installed on your system. The database path is auto-detected based on your OS.

## OpenCode Session Manager v1.0.0

A CLI tool that lists all your OpenCode sessions and generates an HTML table, making it easy to copy and open a specific session to continue your conversation with OpenCode.

### What's New

- **Session Listing**: Lists all OpenCode sessions from the local database
- **Copy & Open**: One-click copy of `opencode -s <id>` to continue any session
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

Generates `sessions.html` in `~/.opencode-session-manager/`. Open it in your browser and bookmark for quick access.

### Requirements

- Node.js 14+
- sqlite3

### Links

- [Full Documentation](https://github.com/Jiayixiao20/opencode-session-manager#readme)
- [中文文档](https://github.com/Jiayixiao20/opencode-session-manager/blob/main/README.zh-CN.md)
- [Report Issues](https://github.com/Jiayixiao20/opencode-session-manager/issues)

---

**Note:** This release requires `sqlite3` to be installed on your system. The database path is auto-detected based on your OS.
