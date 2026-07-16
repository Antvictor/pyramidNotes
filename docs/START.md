# Pyramid Notes 本地启动

## 推荐方式

```bash
nvm use
npm start
```

项目根目录的 `.nvmrc` 固定为 Node 22。`npm start` 会启动前端 Vite 服务，并同时启动 Electron 开发应用。

## 一条命令启动

```bash
./scripts/start-dev.sh
```

这个脚本会自动加载 `nvm`、执行 `nvm use`，然后运行 `npm start`。

## 首次安装依赖

```bash
nvm use
pnpm install
```

如果启动时出现原生模块版本不匹配，重新执行：

```bash
nvm use
pnpm install
```
