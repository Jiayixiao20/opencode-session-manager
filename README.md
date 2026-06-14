# OpenCode Session Manager

A CLI tool that lists all your OpenCode sessions and generates an HTML table, making it easy to copy and open a specific session to continue your conversation with OpenCode.

## Features

- **Session Listing**: Lists all your OpenCode sessions from the local database
- **Copy & Open**: One-click copy of `opencode -s <session-id>` to continue any session
- **HTML Table**: Generates a beautiful, searchable HTML page for browsing sessions
- **Interactive Delete**: Click 🗑️ in the HTML table to delete sessions via a local server
- **Delete Sessions**: Delete old or low-value sessions and reclaim disk space from the CLI
- **Cross-Platform**: Works on Linux, macOS, and Windows
- **Search & Filter**: Search by session name and filter by time range
- **Zero Dependencies**: Only requires Node.js and sqlite3
- **Bookmark-Friendly**: Once generated, bookmark the HTML file in your browser for instant access to all sessions
- **Customizable**: Override database and output paths via environment variables

## Installation

### One-Line Install (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.sh | bash
```

### Manual Install

```bash
git clone https://github.com/Jiayixiao20/opencode-session-manager.git
cd opencode-session-manager
npm link
```

### Windows

```powershell
npm install -g opencode-session-manager
```

## Usage

### Basic Usage

```bash
opencode-sessions
```

This will generate `sessions.html` in your `Downloads` folder.

**💡 Tip:** After generating, open the HTML file in your browser and bookmark it. This gives you instant access to all your OpenCode sessions anytime.

### Interactive Web UI

Start a local server to open the HTML table in your browser with delete buttons on every row:

```bash
opencode-sessions serve
```

Then open `http://localhost:8765` in your browser. Click 🗑️ to delete a session; the page will update immediately and the database file will be vacuumed to reclaim space.

You can change the port with the environment variable:

```bash
OPENCODE_SESSIONS_PORT=8080 opencode-sessions serve
```

### Delete from Command Line

Free up disk space by deleting old or low-value sessions.

```bash
# Delete a specific session
opencode-sessions delete <session-id>

# Preview sessions with 1 or fewer messages (no deletion)
opencode-sessions delete --min-messages 1 --dry-run

# Delete sessions older than 30 days
opencode-sessions delete --older-than 30

# Delete low-value sessions without confirmation
opencode-sessions delete --min-messages 1 --force

# Delete old, low-value sessions and skip VACUUM
opencode-sessions delete --older-than 30 --min-messages 1 --no-vacuum
```

Delete options:

| Option | Description |
|--------|-------------|
| `-d, --older-than <days>` | Delete sessions not updated in the last N days |
| `-m, --min-messages <n>` | Delete sessions with N or fewer messages |
| `-n, --dry-run` | Preview what would be deleted without making changes |
| `-f, --force` | Skip the confirmation prompt |
| `--no-vacuum` | Skip `VACUUM` after deletion (faster, but does not shrink the database file) |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENCODE_DB` | Path to OpenCode database | Auto-detected by OS |
| `OPENCODE_SESSIONS_OUTPUT` | Output HTML file path | `~/Downloads/sessions.html` |

### Custom Database Path

```bash
OPENCODE_DB=/path/to/opencode.db opencode-sessions
```

### Custom Output Path

```bash
OPENCODE_SESSIONS_OUTPUT=/path/to/output.html opencode-sessions
```

## Database Paths by OS

| OS | Default Path |
|----|--------------|
| Linux | `~/.local/share/opencode/opencode.db` |
| macOS | `~/Library/Application Support/opencode/opencode.db` |
| Windows | `%APPDATA%\opencode\opencode.db` |

## HTML Features

- **Session Table**: Displays session ID (shortened), summary, message count, and last active time
- **Copy Button**: Click 📋 to copy the full `opencode -s <id>` command
- **Search**: Real-time search across session names and summaries
- **Time Filter**: Filter by Today, 3 Days, 7 Days, 30 Days, or All
- **Sorting**: Sessions sorted by last active time (newest first)

## Requirements

- Node.js 14+
- sqlite3 command-line tool

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/Jiayixiao20/opencode-session-manager/issues).
