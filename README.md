# AC Sales AI OS · 销售冠军 AI 训练台（前端展示站）

暖通空调（HVAC）销售冠军 AI 训练操作系统的**前端展示站**。采用 **Frost & Ember（冷暖智控命令台）** 设计语言：冰川青 × 余烬橙双主色、玻璃拟态、仪器读数字体、入场动效。

## 直接体验
- 本仓库即一个纯静态站点，双击 `index.html` 或本地起服务即可运行：
  ```bash
  python3 -m http.server 4173
  # 浏览器打开 http://127.0.0.1:4173
  ```
- 站点内置 **Mock 数据层**（`mock.js`）：当检测不到后端（如 GitHub Pages 环境）时自动接管，无需任何服务器即可完整演示 10 个菜单、数字客户孪生、AI 陪练三栏训练、16 维能力报告与 Golden Script。
- 若部署在同机后端（FastAPI `/api/*`）旁，则自动优先使用真实后端，后端不可达时降级到 Mock。

## 技术
- 原生 HTML / CSS / JS，零构建、零运行时依赖（仅 Google Fonts）。
- 雷达图、情绪 8 维、需求漏斗等均为 Canvas / CSS 自绘。
- 设计令牌集中在 `styles.css` 顶部 `:root`，深色为默认、浅色通过 `[data-theme="light"]` 切换。

## 目录
```
index.html   框架（导航 / 顶栏 / 世界态指示 / 氛围背景）
styles.css   Frost & Ember 设计系统
app.js       10 菜单 SPA 路由 + 渲染 + Mock 自动降级
mock.js      离线数据层（数字孪生 / 16 维启发式评分 / 知识库）
```
