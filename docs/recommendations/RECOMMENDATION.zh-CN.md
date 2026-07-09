# 🧩 OpenCode Session Manager — Never Lose a Session Again

<div align="center">

![OpenCode Session Manager](https://img.shields.io/badge/OpenCode-Session%20Manager-2563EB?style=flat-square&logo=github&logoColor=white)
![100% Free](https://img.shields.io/badge/Free-100%25-brightgreen?style=flat-square)
![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A514-339933?style=flat-square&logo=node.js&logoColor=white)

**OpenCode 会话管理器** — 本地服务 + 浏览器插件，一行命令即可找回所有 OpenCode 对话，随时继续。

[⭐ GitHub](https://github.com/Jiayixiao20/opencode-session-manager) · [📖 文档](https://github.com/Jiayixiao20/opencode-session-manager) · [🔌 插件安装包](https://github.com/Jiayixiao20/opencode-session-manager/releases)

</div>

---

## 📖 目录

- [它是什么？](#它是什么)
- [核心功能](#核心功能)
- [安装步骤](#安装步骤)
- [使用指南](#使用指南)
- [系统要求](#系统要求)
- [常见问题](#常见问题)

---

## 🎯 它是什么？

你是否有过这样的经历：OpenCode 里有几十上百个对话历史，想找某个之前的讨论却要挨个翻？**OpenCode Session Manager** 就是为解决这个问题而生的。

它由两部分组成：

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   OpenCode 会话管理器                                     │
│   ┌──────────────────┐       ┌──────────────────────┐  │
│   │  本地 Node.js 服务  │──────▶│   浏览器插件/HTML 页面  │  │
│   │  opencode-sessions │       │  搜索 · 筛选 · 打开会话  │  │
│   └──────────────────┘       └──────────────────────┘  │
│             │                                              │
│             ▼                                              │
│   ~/.local/share/opencode/opencode.db                     │
│   （你的 OpenCode 会话数据库，绝不离开本地机器）               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

| 组件 | 说明 |
|------|------|
| **本地服务** | `opencode-sessions serve` — 持续运行，读取 OpenCode 本地数据库 |
| **Web 界面** | `http://localhost:8765` — 美观的搜索页面，支持中英文 |
| **浏览器插件** | Chrome/Edge 弹窗快捷按钮，一键打开控制台 |
| **HTML 导出** | `opencode-sessions` — 生成静态 HTML 文件 |

> 🔒 **隐私说明**：所有数据仅存于本地 SQLite 数据库，无云端上传，无遥测收集。

---

## ✨ 核心功能

### 🔍 全局搜索

直接在 Web 界面搜索所有 OpenCode 会话，毫秒级响应。

```
输入关键词 → 实时过滤 → 点击会话 → opencode -s <ID> 继续对话
```

### 📊 智能筛选

| 时间范围 | 按钮 |
|----------|------|
| 全部会话 | **全部** |
| 今天 | **今天** |
| 近 3 天 | **3 天** |
| 近 7 天 | **7 天** |
| 近 30 天 | **30 天** |

### 🗑️ 一键删除

Web 界面每一行都有删除按钮，删除后自动执行 SQLite `VACUUM` 回收空间。也可通过 CLI 批量清理：

```bash
# 预览低价值会话（≤1 条消息）
opencode-sessions delete --min-messages 1 --dry-run

# 强制删除低价值会话，无需确认
opencode-sessions delete --min-messages 1 --force

# 删除 30 天未更新的会话
opencode-sessions delete --older-than 30
```

### 🌐 中英文双语界面

浏览器使用中文 → 自动显示中文界面，无需手动切换。

### ⚡ 自动开机启动

- **Linux** → systemd user service（安装后自动生效）
- **macOS** → launchd agent（安装后自动生效）

---

## 🚀 安装步骤

### 方式一：一键安装（推荐）

<div align="center">

| 平台 | 命令 |
|------|------|
| **macOS / Linux** | `curl -fsSL https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.sh \| bash` |
| **Windows (PowerShell)** | `irm https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.ps1 \| iex` |

</div>

### 方式二：浏览器插件

1. 下载 `opencode-session-manager-extension.zip`：[ Releases ](https://github.com/Jiayixiao20/opencode-session-manager/releases)
2. 解压 → Chrome/Edge 打开 `chrome://extensions/`
3. 开启「开发者模式」→ 加载已解压的扩展程序
4. 点击插件图标 → 点击 **Install Local Service**

### 方式三：手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/Jiayixiao20/opencode-session-manager.git
cd opencode-session-manager

# 2. 链接到 PATH
npm link

# 3. 启动服务
opencode-sessions serve

# 4. 浏览器打开
open http://localhost:8765
```

---

## 🛠️ 使用指南

### 启动服务

```bash
opencode-sessions serve         # 启动 Web 界面（默认端口 8765）
OPENCODE_SESSIONS_PORT=8080 opencode-sessions serve  # 自定义端口
```

### 生成静态 HTML

```bash
opencode-sessions               # 生成 ~/.opencode-session-manager/sessions.html
```

### 管理服务

```bash
systemctl --user start opencode-session-manager   # 启动
systemctl --user stop opencode-session-manager    # 停止
systemctl --user status opencode-session-manager  # 状态
systemctl --user disable opencode-session-manager # 关闭自启
```

### 自定义数据库路径

```bash
OPENCODE_DB=/path/to/opencode.db opencode-sessions serve
```

---

## 📋 系统要求

| 项目 | 要求 |
|------|------|
| Node.js | ≥ 14.0.0（推荐 18+） |
| sqlite3 | 命令行工具（安装程序会自动安装） |
| 磁盘 | < 1 MB（项目本体） |
| 数据库 | ~/.local/share/opencode/opencode.db（OpenCode 自动创建） |

---

## ❓ 常见问题

### 端口 8765 被占用怎么办？

```bash
OPENCODE_SESSIONS_PORT=8080 opencode-sessions serve
```

### 找不到 OpenCode 数据库？

- **Linux**：`~/.local/share/opencode/opencode.db`
- **macOS**：`~/Library/Application Support/opencode/opencode.db`
- **Windows**：`%APPDATA%\opencode\opencode.db`

### 如何更新插件？

重新运行安装脚本即可，旧版本会被自动覆盖。

---

<div align="center">

⭐ 觉得有用？给个 [GitHub Star](https://github.com/Jiayixiao20/opencode-session-manager) 支持一下！

MIT License · 永久免费 · 永不收费

</div>
