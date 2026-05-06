# Codex Account Switch 本地用法

这个目录里已经放好了可直接使用的启动脚本，基于 `@loongphy/codex-auth`。

## 推荐入口

- `start-gui.command`
  - 启动本地可视化界面。

## 你也可以直接用这 3 个文件

- `login-account.command`
  - 给当前 `Codex` 登录一个新账号，并把这个账号保存进切号列表。
- `switch-account.command`
  - 在已保存账号之间切换。
- `list-accounts.command`
  - 查看当前已保存的账号列表。

## 可视化界面

现在这个仓库还带了一个本地 GUI 控制台。

启动：

```bash
cd codex-auth
npm run gui
```

打开：

```text
http://localhost:4185
```

界面里可以直接：

- 查看账号列表
- 查看 5h / Weekly 用量
- 手动给账号分组，创建时直接填写名称和备注
- 编辑分组名称和分组备注，确认后再保存
- 防止分组重名
- 删除分组时账号自动回到默认分组
- 一键切换账号，并在 macOS 上自动重启 Codex App
- 发起新账号登录，登录完成后自动重启 Codex App
- 将账号放入垃圾桶、恢复账号，或从垃圾桶永久删除账号

点击“新增账号”后，页面会显示官方登录链接和实时日志。完成登录后，账号会自动加入列表。

分组和备注会保存在本机：

```text
~/.codex/account-switch-gui.json
```

这个文件是个人本地状态，不会上传到 GitHub。

分组规则：

- 默认分组不能删除
- 分组名称不能重复
- 新增分组需要先填写名称，不会自动生成默认名字
- 删除分组后，该组账号会自动回到默认分组

账号删除规则：

- 当前使用中的账号不能直接放入垃圾桶，需要先切到其他账号
- 放入垃圾桶只会隐藏账号并保留本地快照，可以随时恢复
- 永久删除只能在垃圾桶里操作，会调用 `codex-auth remove` 删除本地保存的账号快照

## 日常使用建议

`Codex App` 运行时会缓存当前登录态。GUI 里点击“切换”或完成“新增账号”后，会先更新本机 `~/.codex/auth.json`，再自动重启 Codex App。

如果 GUI 是从 Codex 里启动的，Codex 重启时可能会顺带结束旧的 GUI 进程。本项目会在后台自动把 GUI 服务重新拉起；如果页面短暂断开，等几秒后重新打开：

```text
http://localhost:4185
```

如果你是用终端命令切换，仍然需要手动重启 `Codex App` 或重新打开 `codex` 终端。

## 第一次使用

第一次双击或终端运行时，会自动通过 `npx` 下载 `@loongphy/codex-auth`，需要联网，等它装完即可。

## 推荐流程

### 1. 保存第一个账号

运行：

```bash
./login-account.command
```

它会调用 `codex login`，你按官方流程登录第一个 ChatGPT Plus 账号。

### 2. 保存第二个账号

先在 `Codex` 里退出当前账号，然后再运行一次：

```bash
./login-account.command
```

这次登录第二个 ChatGPT Plus 账号。

### 3. 切换账号

运行：

```bash
./switch-account.command
```

选择目标账号后，重启 `Codex.app` 或重新打开 `codex` 终端。

## 也可以直接在终端里用

```bash
./run-codex-auth.sh list
./run-codex-auth.sh switch
./run-codex-auth.sh status
```

## 说明

- 这个工具切换的是本机 `~/.codex/auth.json` 登录态。
- 切换完成后，`Codex CLI` 和 `Codex App` 通常都需要重开一次才会生效。
- 不建议手动复制或粘贴 token JSON；走官方登录最稳。
