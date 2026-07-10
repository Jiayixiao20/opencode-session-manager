#!/bin/bash
set -e

REPO="https://github.com/Jiayixiao20/opencode-session-manager"
INSTALL_DIR="$HOME/.opencode-session-manager"
BIN_DIR="$HOME/.local/bin"

echo "OpenCode Session Manager Installer"
echo "==================================="
echo ""

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required but not installed."
    echo "Please install Node.js 14+ first: https://nodejs.org"
    exit 1
fi

# Check for sqlite3
if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "sqlite3 is required but not installed."
    echo "Installing sqlite3..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y sqlite3
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y sqlite
    elif command -v brew >/dev/null 2>&1; then
        brew install sqlite3
    else
        echo "Please install sqlite3 manually"
        exit 1
    fi
fi

# Remove old installation
if [ -d "$INSTALL_DIR" ]; then
    echo "Removing old installation..."
    if [ -f "$INSTALL_DIR/sessions.html" ]; then
        BACKUP_FILE="/tmp/opencode-sessions.html.bak.$(date +%s)"
        cp "$INSTALL_DIR/sessions.html" "$BACKUP_FILE"
        echo "  Backed up existing sessions.html to $BACKUP_FILE"
    fi
    rm -rf "$INSTALL_DIR"
fi

# Clone repository
echo "Downloading from GitHub..."
git clone --depth 1 "$REPO.git" "$INSTALL_DIR" 2>/dev/null || {
    echo "Git not found, trying curl..."
    mkdir -p "$INSTALL_DIR"
    curl -L "$REPO/archive/main.tar.gz" | tar xz -C "$INSTALL_DIR" --strip-components=1
}

if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$INSTALL_DIR/sessions.html"
    echo "  Restored existing sessions.html"
fi

# Create bin directory
mkdir -p "$BIN_DIR"

# Create symlink
ln -sf "$INSTALL_DIR/bin/opencode-sessions" "$BIN_DIR/opencode-sessions"

if command -v systemctl >/dev/null 2>&1; then
    SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SYSTEMD_USER_DIR"
    cp "$INSTALL_DIR/systemd/opencode-session-manager.service" "$SYSTEMD_USER_DIR/"
    sed -i "s|%h|$HOME|g" "$SYSTEMD_USER_DIR/opencode-session-manager.service"
    sed -i "s|__USER_PATH__|$PATH|g" "$SYSTEMD_USER_DIR/opencode-session-manager.service"
    systemctl --user daemon-reload
    systemctl --user enable opencode-session-manager.service
    systemctl --user start opencode-session-manager.service
    echo ""
    echo "✓ systemd user service installed and started."
    echo "  Status:     systemctl --user status opencode-session-manager"
fi

if command -v launchctl >/dev/null 2>&1 && [ "$(uname -s)" = "Darwin" ]; then
    PLIST_DIR="$HOME/Library/LaunchAgents"
    mkdir -p "$PLIST_DIR"
    PLIST_FILE="$PLIST_DIR/com.opencode.session-manager.plist"
    cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.opencode.session-manager</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/bin/opencode-sessions</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/opencode-session-manager.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/opencode-session-manager.log</string>
</dict>
</plist>
EOF
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    launchctl load "$PLIST_FILE"
    echo ""
    echo "✓ macOS launchd agent installed and started."
fi

# Add to PATH if needed
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "Adding $BIN_DIR to PATH..."
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    echo "Please run: source ~/.bashrc"
fi

echo ""
echo "✓ Installation complete!"
echo ""
echo "Usage:"
echo "  opencode-sessions                          # Generate sessions.html"
echo "  opencode-sessions serve                    # Open interactive web UI"
echo "  opencode-sessions delete <session-id>      # Delete a session"
echo "  opencode-sessions delete --min-messages 1  # Delete low-value sessions"
echo "  opencode-sessions delete --older-than 30   # Delete sessions older than 30 days"
echo ""
echo "Auto-start service:"
echo "  systemctl --user start opencode-session-manager  # Start now"
echo "  systemctl --user stop opencode-session-manager   # Stop"
echo ""
echo "The HTML file will be saved to:"
echo "  $HOME/.opencode-session-manager/sessions.html"
echo ""
echo "Environment variables:"
echo "  OPENCODE_DB              # Custom database path"
echo "  OPENCODE_SESSIONS_OUTPUT # Custom output path"
