# proxy-app

个人代理配置与规则仓库，当前以 mihomo / OpenClash 场景为主，同时保留 Shadowrocket 和 Loon 移动端配置。

## 仓库结构

- `profiles/mihomo.yaml`：主力 mihomo 配置，适用于 OpenClash、Clash Verge Rev、FlClash 等 mihomo 内核客户端。
- `profiles/shadowrocket.conf`：Shadowrocket 基础配置，基于主力 mihomo 配置做了简化适配。
- `profiles/loon.conf`：Loon 主配置，参考 mihomo 分流和 DNS 思路，保留常用脚本 / 插件入口。
- `scripts/`：Loon 使用的本地脚本与 `myCookie.conf`，原先来自 lonely06/Quanx 的远程脚本现已放到本仓库。
- `sub-store/`：Sub-Store 组合订阅脚本，与 Loon `scripts/` 分开维护。
- `rules/direct.list`：自维护直连规则，优先放明确需要直连的域名。
- `rules/proxy.list`：自维护代理规则，优先放明确需要代理的域名。
- `AGENTS.md`：给 Codex / Agent 修改本仓库时使用的约束说明。

## 主要使用环境

- OpenWrt / ImmortalWrt
  - OpenClash
- PC
  - Clash Verge Rev
  - FlClash
- Mobile
  - FlClash
  - Shadowrocket
  - Loon

## mihomo 配置要点

`profiles/mihomo.yaml` 是当前主配置，核心思路是：

- 使用 `fake-ip` 作为 TUN 透明代理场景下的增强 DNS 模式。
- 开启 `respect-rules`，让 DNS 查询本身遵守路由规则。
- `fake-ip-filter` 保留局域网、保留域、时间同步和 `lone1.top` 等特殊解析域名的真实 IP，减少 TUN 场景下的兼容性问题。
- `direct-nameserver` 固定使用国内 DNS，避免直连域名被国外 DNS 解析。
- `nameserver-policy` 按业务大类分流，AI、GitHub、社交平台、开发服务、加密货币等尽量跟随对应策略组。
- `🕳️ 漏网之鱼` 默认优先直连，符合“漏网走国内”的使用习惯。

## 策略组分类

主配置当前按以下方向组织策略：

- `🚀 默认代理`：通用代理出口。
- `🤖 AI`：AI / ChatGPT / Claude / Gemini 等相关服务。
- `👨🏿‍💻 GitHub`：GitHub 相关服务。
- `💬 社交平台`：Telegram、Twitter / X、Discord 等。
- `🛠️ 开发服务`：Docker、npm / npmjs、PyPI / python 等开发生态。
- `💰 加密货币`：Binance、OKX、Bybit、TradingView 等加密货币与行情服务。
- `🪟 Microsoft`、`🍎 Apple`：常见系统与云服务，其中 OneDrive 归入 Microsoft 组。
- `🎯 直连`：国内和明确直连流量。
- `🕳️ 漏网之鱼`：未命中前面规则的兜底流量，默认优先直连。

## Loon 配置要点

`profiles/loon.conf` 是移动端 Loon 配置，核心策略组命名尽量与 mihomo 保持一致。使用前请先在 Loon 中导入机场订阅，配置内通过 `Remote Filter` 按节点名称筛选地区节点，不保存任何订阅 URL。

Loon 端 DNS 只能做近似适配：使用 `223.5.5.5`、`119.29.29.29`、阿里 DoH 和腾讯 DoH，不能完全复刻 mihomo 的 `respect-rules` 和 `nameserver-policy`；通过 `real-ip` 让 `lone1.top` 及其子域名返回真实 IP。Shadowrocket 使用对应的 `always-real-ip` 设置。脚本、远程脚本和插件入口保留在 Loon 配置中；中青阅读 / 签到 / 看看赚和 `myCookie.conf` 现已改为引用本仓库 `scripts/`，不再依赖 lonely06/Quanx 远程脚本。已移除不再使用的猫眼本地脚本和对应 MITM hostname。

订阅地址：

- `https://raw.githubusercontent.com/lonely06/proxy-app/refs/heads/main/profiles/loon.conf`

## 规则来源

- 自维护规则：
  - `rules/direct.list`
  - `rules/proxy.list`
- mihomo 远程规则集：
  - [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)
  - [QuixoticHeart/rule-set](https://github.com/QuixoticHeart/rule-set)
  - 主要使用 `.mrs` 格式规则集
- Shadowrocket 补充规则：
  - `QuixoticHeart/rule-set` 的 AI 与加密货币规则
  - 少量手写 GitHub 核心域名
- Loon 补充规则：
  - `blackmatrix7/ios_rule_script` 的 Loon 规则
  - `QuixoticHeart/rule-set` 的 AI 与加密货币规则

注意：MetaCubeX 规则集中，npm 对应 `npmjs.mrs`，PyPI 相关规则归在 `python.mrs`。

## Sub-Store 流量与到期告警

`sub-store/flow-alert.js` 挂在组合订阅的脚本操作上，按合集当前成员逐条检查；单条用量达到阈值，或剩余天数达到 `expireDays` 后走 Bark。启用 `noFlow` 的合集或成员订阅会跳过流量/到期查询，但不影响节点输出。用量和到期分开记冷却。成员来自合集自己的 `subscriptions` 和 `subscriptionTags`，不写死任何 tag。

放置位置：组合订阅 → 编辑 → 节点操作+ → 脚本操作。脚本链接填「脚本」栏，参数填同一条操作的「参数」栏，不要拼在链接后面。

脚本链接：

- `https://raw.githubusercontent.com/lonely06/proxy-app/refs/heads/main/sub-store/flow-alert.js`

参数栏填写：

```text
threshold=90&expireDays=7&cooldownHours=12&bark=https://api.day.app/<device_key>/[推送标题]/[推送内容]?group=SubStore
```

对应 `$arguments.threshold`、`$arguments.expireDays`、`$arguments.cooldownHours`、`$arguments.bark`。`expireDays=0` 关闭到期提醒。Bark 占位符由脚本替换。设备 Key 只写进这条参数，不要写进仓库。

## Sub-Store 宝可梦串行切号

`sub-store/pokemon-rotate.js` 挂在同一个组合订阅上，放在 `flow-alert.js` 前面。合集先收齐全部宝可梦账号，脚本只放行当前账号的 `[PKM1]` / `[PKM2]` / `[PKM3]`；赔钱机场等其他节点原样保留。当前 `airport` 账号未耗尽就继续用；用量超套、剩余不足 `minRemainMB`，或这个号 0 个有效节点时，按名称顺序切下一个还有余量的号；全部账号耗尽时移除全部宝可梦节点。筛选是这次下载的依据；tag / `noFlow` 只给下次收源和 `flow-alert` 用。脚本失败时只保留当前账号，不把备用号漏进测速。

脚本链接：

- `https://raw.githubusercontent.com/lonely06/proxy-app/refs/heads/main/sub-store/pokemon-rotate.js`

参数栏填写：

```text
minRemainMB=100&bark=https://api.day.app/<device_key>/[推送标题]/[推送内容]?group=SubStore
```

账号约定：订阅名 `宝可梦1/2/3`，节点前缀 `[PKM1]` / `[PKM2]` / `[PKM3]`，组 tag `pokemon`。当前在用额外打 `airport`；其余 `pokemon-standby` + `noFlow`。合集 `subscriptionTags` 需同时收 `airport` 和 `pokemon`。设备 Key 只写进参数，不要写进仓库。

## 修改建议

- 修改规则前，先判断是应该加入 `rules/direct.list` 还是 `rules/proxy.list`。
- 泄漏检测、出口检测和浏览器指纹检测站点放入 `rules/proxy.list`，避免漏网默认直连影响测试结果。
- 修改 `profiles/mihomo.yaml` 时，注意策略组名称、DNS policy 后缀和规则引用要保持一致。
- 修改 `profiles/loon.conf` 时，注意策略组名称、`Remote Rule` 的 `policy=` 和插件里的 `policy=` 要保持一致。
- 不要为了“防泄露”盲目增加复杂规则；在满足使用需求的前提下，保持配置精简。
- 新增客户端配置时，再同步更新本 README 和 `AGENTS.md`。
