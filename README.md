# Arcana 卡包

基于 [holo](https://holo.yashb.xyz/) 公开页面恢复的互动开包项目。当前版本加入了古典塔罗牌、原版角色牌以及可配置的卡包与卡池，保留了撕包、卡片展开、倾斜反光、粒子和音效。

## 当前卡池

- **塔罗牌**：10 张大阿尔卡那牌，使用统一的古典插画风格。
- **经典角色牌**：保留原版 Blip、Cubit、Facet、Ringo、Nova 五张角色牌。
- **传世名剑**：10 张国潮幻想卡：纯钧、赤霄、轩辕、湛卢、太阿、龙渊、干将、莫邪、鱼肠、承影。共用金属浮雕框与牌名设计，各有不同剑形、配色与背景；均为完整背景与透明剑身两层。
- **卡包**：塔罗包只抽塔罗牌；经典包只抽角色牌；名剑包只抽名剑；混合包从三类牌的合并卡池中抽取。每次出现的卡包类型自动随机决定，无需手动选择。

每包五张，每个位置独立随机抽取，**允许同一张牌在同一包中重复出现**。目前池内每张牌的抽取概率相同；混合包可能随机出现单一类型的结果，并非保证每种类型都出现。

## 运行与构建

需要 Node.js 20 或以上版本，不需要安装第三方依赖。

```powershell
npm start       # 启动本地服务器，默认 http://127.0.0.1:4173/
npm run build   # 生成可直接离线打开的 dist/index.html
npm run check   # 校验卡池、抽牌规则、资源和离线构建
```

通过本地服务器访问时，修改 JSON 后刷新页面即可生效。要更新可直接打开的离线版本，请运行 `npm run build`。

`dist/` 是生成目录，不随源码提交；需要离线版本时在本地执行构建即可。

## 独立玩法 Demo

[`alchemy-demo/`](alchemy-demo/README.md) 是单独运行的抽卡构筑试玩，不影响原开包页面。

```powershell
npm --prefix alchemy-demo start
```

打开 `http://127.0.0.1:4175/`。当前包含阵列计分、三格随身背包、合成与背包上阵、默认带出一张，以及卡牌效果扩展带出名额。仓库和牌局自动保存在当前浏览器。

每包一次行动的规则仍是待实现设计，当前 Demo 保留各选一张入阵与入包的操作。

## 扩充卡牌和卡包

在 `data/catalog.json` 中维护类型、牌和卡包：

1. 在 `types` 中添加类型 ID、显示名称以及对应视觉效果所属的 `visualPack`。
2. 在 `cards` 中为每张牌设置唯一 ID、所属 `type`、名称、编号、可编辑的 `description` 和图片路径。完整牌面可使用 `image`；推荐使用 5:7 的图片。卡牌展开后，悬停、触摸或键盘选中可查看描述。
3. 在 `packs` 中创建卡包，在 `types` 中填写允许出现的类型 ID。填写一个类型即为单一包，填写多个类型即为混合包；现有展示布局每包固定五张。

单一类型卡包的 `visuals` 单独配置包装外观与配色、彩虹颜色和开关、纸屑颜色与数量，以及包装边缘和封口的反光强度。经典包使用原版效果，塔罗包使用复古效果。混合包在出现时先抽出内容，再根据数量最多的卡牌类型，沿用该类型 `visualPack` 的效果；若类型数量并列，则从并列类型中随机选择效果。

抽牌逻辑位于 `src/draw.js`。当前实现按卡包允许的类型筛选卡池，再对每个位置独立抽取；以后可在这里扩展权重、稀有度等规则。

名剑图鉴入口是 `/?preview=swords`，可按编号切换全部十把名剑；`/?pack=swords` 可直接体验名剑包。新增八张直接由 `layers.background` 和 `layers.subject` 渲染完整卡面，无需另存合成图；图鉴用“查看平面 / 查看立体”比较深度，纯钧和赤霄仍保留原图对比。每包仅预热本次抽中的图片。素材位于 `assets/swords/<卡牌ID>/`，内置图片生成提示词保存在 `assets/swords/layered-prompts.json` 与 `assets/swords/remaining-eight-prompts.json`，干将莫邪的补充参考说明见 `assets/swords/paired-design-notes.md`。

10 张塔罗牌均使用两层画面：`layers.background` 是补全的完整背景，`layers.subject` 是带透明通道的主体，`image` 保留原版。展开时主体浮出卡面，悬停时增加深度与投影。部分牌用 `layerLayout` 的 `scale`、`x`、`y` 校准主体在整张牌中的位置；生成图尺寸略有差异时，CSS 将两层完整画布映射到同一张 5:7 卡面。生成提示词保存在 `assets/tarot/layered-generation-prompts.json`，魔术师提示词保存在 `assets/tarot/the-magician-layered-prompts.md`。访问 `/?preview=tarot` 可打开立体图鉴，选择任意一张牌并用“查看原版 / 查看分层版”对比；也可直接使用 `/?preview=moon` 等卡牌 ID。正常开包规则不受预览模式影响。

## 主要文件

| 文件 | 说明 |
| --- | --- |
| `index.html`、`src/styles.css` | 页面结构、包装和卡片样式 |
| `data/catalog.json`、`src/draw.js` | 卡牌与卡包配置、抽牌逻辑 |
| `src/app.js` | 交互、物理动画、视觉特效和合成声音 |
| `data/art.json`、`assets/characters/` | 原版角色素材路径和表情定位数据 |
| `assets/tarot/` | 塔罗牌原图、网页用压缩图和生成提示词 |
| `scripts/` | 本地服务器、离线构建及检查脚本 |
| `reference/original.html` | 保存的原站响应 |

`npm run recover` 是原始快照恢复脚本，会覆盖当前的 `index.html`、`src/app.js`、`src/styles.css` 等文件，从而破坏塔罗版本；如需恢复原项目，请先备份当前更改。

原始页面未声明源码或素材许可证；原站代码及角色美术的权利归各自权利人。本目录的整理不为原始内容另行授予许可。
