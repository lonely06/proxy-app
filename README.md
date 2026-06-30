# proxy-app

个人代理配置与规则仓库，当前以 mihomo / OpenClash 场景为主，同时保留 Shadowrocket 和 Loon 移动端配置。

## 仓库结构

- `profiles/mihomo.yaml`：主力 mihomo 配置，适用于 OpenClash、Clash Verge Rev、FlClash 等 mihomo 内核客户端。
- `profiles/shadowrocket.conf`：Shadowrocket 基础配置，基于主力 mihomo 配置做了简化适配。
- `profiles/loon.conf`：Loon 主配置，参考 mihomo 分流和 DNS 思路，保留常用脚本 / 插件入口。
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
- `fake-ip-filter` 保留局域网、保留域、时间同步和部分特殊解析域名的真实 IP，减少 TUN 场景下的兼容性问题。
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

Loon 端 DNS 只能做近似适配：使用 `223.5.5.5`、`119.29.29.29`、阿里 DoH 和腾讯 DoH，不能完全复刻 mihomo 的 `fake-ip`、`respect-rules` 和 `nameserver-policy`。脚本、远程脚本和插件入口保留在 Loon 配置中；已移除不再使用的猫眼本地脚本和对应 MITM hostname。

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

## 修改建议

- 修改规则前，先判断是应该加入 `rules/direct.list` 还是 `rules/proxy.list`。
- 泄漏检测、出口检测和浏览器指纹检测站点放入 `rules/proxy.list`，避免漏网默认直连影响测试结果。
- 修改 `profiles/mihomo.yaml` 时，注意策略组名称、DNS policy 后缀和规则引用要保持一致。
- 修改 `profiles/loon.conf` 时，注意策略组名称、`Remote Rule` 的 `policy=` 和插件里的 `policy=` 要保持一致。
- 不要为了“防泄露”盲目增加复杂规则；在满足使用需求的前提下，保持配置精简。
- 新增客户端配置时，再同步更新本 README 和 `AGENTS.md`。
