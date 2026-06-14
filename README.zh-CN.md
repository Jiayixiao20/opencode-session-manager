# OpenCode Session Manager（会话管理器）

列出你所有的 OpenCode 会话，并生成 HTML 表格，方便复制特定会话 ID 打开并继续与 OpenCode 对话。

## 功能特性

- **会话列表**：从本地数据库列出所有 OpenCode 会话
- **复制并打开**：一键复制 `opencode -s <会话ID>`，随时继续任何会话
- **HTML 表格**：生成美观、可搜索的 HTML 页面，方便浏览所有会话
- **交互式删除**：在 HTML 表格中点击 🗑️ 通过本地服务器删除会话
- **删除会话**：删除旧会话或无价值会话，释放磁盘空间
- **跨平台**：支持 Linux、macOS 和 Windows
- **搜索与筛选**：按会话名搜索，按时间范围筛选
- **零依赖**：仅需 Node.js 和 sqlite3
- **收藏夹支持**：生成后将 HTML 文件添加到浏览器收藏夹，随时都能查看所有 OpenCode 会话
- **可自定义**：通过环境变量覆盖数据库和输出路径

## 安装

### 一键安装（Linux/macOS）

```bash
curl -fsSL https://raw.githubusercontent.com/Jiayixiao20/opencode-session-manager/main/install.sh | bash
```

### 手动安装

```bash
git clone https://github.com/Jiayixiao20/opencode-session-manager.git
cd opencode-session-manager
npm link
```

### Windows

```powershell
npm install -g opencode-session-manager
```

## 使用方法

### 基本用法

```bash
opencode-sessions
```

这会在你的 `Downloads` 文件夹生成 `sessions.html`。

**💡 提示：** 生成后，用浏览器打开该 HTML 文件并添加到收藏夹，随时都能查看所有 OpenCode 会话。

### 交互式 Web 界面

启动本地服务器，在浏览器中打开带删除按钮的 HTML 表格：

```bash
opencode-sessions serve
```

然后在浏览器中访问 `http://localhost:8765`，点击每行后面的 🗑️ 即可删除该会话。页面会即时更新，数据库文件会自动 VACUUM 回收空间。

可通过环境变量修改端口：

```bash
OPENCODE_SESSIONS_PORT=8080 opencode-sessions serve
```

### 命令行删除

通过删除旧会话或低价值会话来释放磁盘空间。

```bash
# 删除指定会话
opencode-sessions delete <会话ID>

# 预览消息数 ≤ 1 的会话（不会真正删除）
opencode-sessions delete --min-messages 1 --dry-run

# 删除 30 天未更新的会话
opencode-sessions delete --older-than 30

# 强制删除低价值会话，不询问确认
opencode-sessions delete --min-messages 1 --force

# 删除旧且低价值的会话，并跳过 VACUUM
opencode-sessions delete --older-than 30 --min-messages 1 --no-vacuum
```

删除选项：

| 选项 | 说明 |
|------|------|
| `-d, --older-than <天数>` | 删除最近 N 天内未更新的会话 |
| `-m, --min-messages <数量>` | 删除消息数 ≤ N 的会话 |
| `-n, --dry-run` | 只预览将要删除的内容，不执行删除 |
| `-f, --force` | 跳过确认提示 |
| `--no-vacuum` | 删除后不执行 `VACUUM`（更快，但不会缩小数据库文件） |

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENCODE_DB` | OpenCode 数据库路径 | 根据系统自动检测 |
| `OPENCODE_SESSIONS_OUTPUT` | 输出 HTML 文件路径 | `~/Downloads/sessions.html` |

### 自定义数据库路径

```bash
OPENCODE_DB=/path/to/opencode.db opencode-sessions
```

### 自定义输出路径

```bash
OPENCODE_SESSIONS_OUTPUT=/path/to/output.html opencode-sessions
```

## 各系统数据库路径

| 系统 | 默认路径 |
|------|----------|
| Linux | `~/.local/share/opencode/opencode.db` |
| macOS | `~/Library/Application Support/opencode/opencode.db` |
| Windows | `%APPDATA%\opencode\opencode.db` |

## HTML 功能

- **会话表格**：显示会话 ID（缩短）、简介、消息数、最后活跃时间
- **复制按钮**：点击 📋 复制完整 `opencode -s <ID>` 命令
- **搜索**：实时搜索会话名和简介
- **时间筛选**：按今天、3天、7天、30天或全部筛选
- **排序**：按最后活跃时间倒序（最新的在最上面）

## 系统要求

- Node.js 14+
- sqlite3 命令行工具

## 许可证

MIT

## 贡献

欢迎提交 Pull Request。对于重大变更，请先打开 issue 讨论您想要更改的内容。

## 支持

如果遇到问题或有建议，请 [提交 issue](https://github.com/Jiayixiao20/opencode-session-manager/issues)。
