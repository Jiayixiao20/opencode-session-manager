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
    rm -rf "$INSTALL_DIR"
fi

# Clone repository
echo "Downloading from GitHub..."
git clone --depth 1 "$REPO.git" "$INSTALL_DIR" 2>/dev/null || {
    echo "Git not found, trying curl..."
    mkdir -p "$INSTALL_DIR"
    curl -L "$REPO/archive/main.tar.gz" | tar xz -C "$INSTALL_DIR" --strip-components=1
}

# Create bin directory
mkdir -p "$BIN_DIR"

# Create symlink
ln -sf "$INSTALL_DIR/bin/opencode-sessions" "$BIN_DIR/opencode-sessions"

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
echo "  opencode-sessions           # Generate sessions.html"
echo ""
echo "The HTML file will be saved to:"
echo "  $HOME/Downloads/sessions.html"
echo ""
echo "Environment variables:"
echo "  OPENCODE_DB              # Custom database path"
echo "  OPENCODE_SESSIONS_OUTPUT # Custom output path"
