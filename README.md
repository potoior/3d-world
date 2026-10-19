# 3d-world

四座中国地标的可交互 Three.js 3D 场景。全部资源本地化，无需构建步骤。

## 场景

- **紫禁城**：明清宫城中轴、三大殿、宫门、角楼、御花园，支持第一人称漫游。
- **拙政园**：江南园林水池、远香堂、荷风四面亭、小飞虹、香洲、见山楼与东园。
- **武汉东湖**：真实 OSM 湖岸线、行吟阁、楚天台、听涛、楚城、樱园与环湖绿道。
- **八达岭长城**：山脊城墙、敌楼、垛口、好汉坡与燕山山景。

## 本地运行

在项目根目录启动任意静态 HTTP 服务：

```bash
python3 -m http.server 8123
```

打开 <http://localhost:8123>。

> 必须通过 HTTP 访问，直接双击 `index.html` 会因 ES Modules 限制而无法加载。

## 操作

- 拖拽旋转 · 滚轮缩放 · 右键平移
- 导览按钮切换视角
- **第一人称漫游**：`WASD` 移动 · `Space` 跳跃 · 鼠标环顾 · `Shift` 加速 · `Esc` 退出

## 技术

- Three.js r160（本地 vendor）
- ES Modules + import map
- 程序化几何、纹理与动态元素
- 无外部 CDN、无构建依赖

## 目录

```text
.
├── index.html                  # 场景选择页
├── assets/                     # 缩略图
├── forbidden-city-3d/
├── humble-administrators-garden/
├── wuhan-east-lake/
└── badaling-great-wall/
```

## 部署

仓库可直接用于 GitHub Pages：在仓库 Settings → Pages 中选择 `main` 分支根目录即可。
