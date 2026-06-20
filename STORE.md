Chrome Web Store 发布说明
==========================

扩展名称: OpenCode Session Manager
描述: Browser companion for the opencode-sessions CLI tool.
      View, search, and delete your OpenCode sessions directly from your browser.

分类: Developer Tools
语言: English (default) / Chinese

上传步骤:
  1. 打开 https://chrome.google.com/webstore/devconsole
  2. 注册开发者 ($5 一次性)
  3. 创建新项目，上传 opencode-session-manager-extension.zip
  4. 填写以下信息:

Store listing:
  - Title: OpenCode Session Manager
  - Description: A browser companion for the opencode-sessions local service.
    View your OpenCode session list, search by name or time, and delete unwanted
    sessions — all from your browser.

    REQUIREMENTS:
    - Node.js 18+ and sqlite3 CLI installed
    - `opencode-sessions serve` running locally (install via install.sh)
    - Auto-start on login via systemd (Linux) or launchd (macOS)

    HOW IT WORKS:
    1. Install the local service: curl -fsSL ... | bash
    2. The service auto-starts on login
    3. Click the extension icon to open the dashboard
    4. Browse, search, filter, and delete sessions

  - Category: Developer Tools
  - Language: English (United States)
  - Homepage URL: https://github.com/Jiayixiao20/opencode-session-manager

Privacy:
  - No user data collected
  - All data stays on your local machine
  - Only connects to localhost:8765

权限说明（提交审核时需解释）:
  - storage: 缓存服务端口信息
  - tabs: 打开 dashboard 页面
  - http://localhost:*/*: 连接本地服务
