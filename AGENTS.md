# AGENTS.md

Scope: this file applies to the whole repository.

## Project shape

- This repo stores personal proxy rules and client profiles.
- `profiles/mihomo.yaml` is the primary maintained config for mihomo-based clients such as OpenClash, Clash Verge Rev, and FlClash.
- `profiles/shadowrocket.conf` is a simplified Shadowrocket profile derived from the mihomo config.
- `rules/direct.list` and `rules/proxy.list` are small self-maintained rule lists shared by profiles.
- Keep the repository lean. Prefer direct edits to rules and profiles over adding generators, build steps, or extra tooling.

## Editing rules

- Preserve existing group names, emoji labels, and rule order unless a coordinated rename is required.
- Keep `rules/direct.list` for destinations that should be forced direct.
- Keep `rules/proxy.list` for destinations that should be forced through proxy.
- When a destination changes, check every maintained profile that duplicates logic or names, especially `profiles/mihomo.yaml` and `profiles/shadowrocket.conf`.
- Keep rules as small as practical. Start with the narrowest useful match and avoid unnecessary complexity.
- Do not change remote rule URLs or provider sources unless the user asked for it.
- Leave unrelated user changes alone.

## mihomo-specific notes

- `profiles/mihomo.yaml` should stay valid YAML.
- Keep the placeholder `proxy-providers` structure unless the task is to redesign subscriptions.
- Do not casually rename strategy groups. DNS policies and rules may refer to the group names through `#<group name>` suffixes or `RULE-SET` targets.
- Keep the `🕳️ 漏网之鱼` group defaulting to direct first unless the user explicitly asks to change the fallback behavior.
- Keep the config simple; do not add heavy leak-prevention logic unless the user explicitly asks for it.

## DNS rules

- Be careful when editing `dns:` in `profiles/mihomo.yaml`.
- Preserve `respect-rules: true` unless the user explicitly asks to change how DNS connections are routed.
- Preserve `enhanced-mode: fake-ip` for the current TUN transparent-proxy setup unless the task is specifically about DNS mode.
- Keep `direct-nameserver` on domestic DNS resolvers unless the user asks for another direct-DNS strategy.
- Keep `direct-nameserver-follow-policy: false` unless the user explicitly wants direct DNS to follow `nameserver-policy`.
- When using DNS policy entries with a proxy group suffix, make sure the suffix exactly matches an existing strategy group name, for example `#🤖 AI` or `#💬 社交平台`.

## Rule-provider notes

- Prefer MetaCubeX `meta-rules-dat` `.mrs` rule sets for mihomo remote providers.
- For npm, use the `npmjs.mrs` geosite rule set name.
- For PyPI / Python package ecosystem rules, use the `python.mrs` geosite rule set name.
- Keep custom `rules/direct.list` and `rules/proxy.list` in classical text format.

## File-specific notes

- `profiles/mihomo.yaml`: primary profile; preserve YAML syntax, strategy group names, DNS policy links, and rule-provider references.
- `profiles/shadowrocket.conf`: preserve Shadowrocket syntax, section layout, and simplified group structure.
- `rules/direct.list`: add only clear direct destinations.
- `rules/proxy.list`: add only clear proxy-only destinations.
- `README.md`: update it when the repo structure, supported clients, DNS strategy, rule categories, or sourcing strategy changes.

## Validation

- Check syntax after edits: YAML for mihomo, INI-like syntax for Shadowrocket, plain text for rule lists.
- Verify that renamed groups or rule keys still match every reference in the repo.
- Search the tree before finishing if a change touches shared names, URLs, rule-provider keys, or strategy group names.

## Commit Message

- Always generate the commit message from the actual diff, not from a generic task label.
- Use this required format:
  ```text
  - <本次 commit 的真实汇总信息>
    1. <真实明细 1>
    2. <真实明细 2>
  ```
- The first line must be a concrete summary of the commit outcome. It should mention the changed area and the user-visible behavior when possible.
- Each numbered item must describe one real change from the diff. Do not use placeholders, vague wording, or repeated restatements of the summary.
- Prefer 2-4 numbered items. Use more only when the commit genuinely touches multiple independent concerns.

### Commit message generator

Before committing, answer these questions from the diff:

1. Which files changed?
2. Which behavior, rule, source, group, or documentation contract changed?
3. Which existing behavior was intentionally preserved?
4. Did any shared name, rule order, DNS policy, remote URL, or strategy group reference change?

Then generate the message as follows:

1. Choose the summary target:
   - `profiles/mihomo.yaml` -> mention mihomo, DNS, strategy groups, or rule providers.
   - `profiles/shadowrocket.conf` -> mention Shadowrocket, proxy groups, AI/GitHub rules, or fallback behavior.
   - `rules/direct.list` -> mention forced-direct destinations.
   - `rules/proxy.list` -> mention forced-proxy destinations.
   - `README.md` or `AGENTS.md` -> mention documentation or agent guidance.
2. Write the summary as `- <action> <target> <outcome>`.
3. Write each numbered item as `<action> <specific object> <reason or result>`.
4. If a change preserves an important order or fallback behavior, include that preservation as a numbered item.
5. If the commit is a follow-up correction, still describe the actual file/content change instead of writing only `规范提交` or `修正 commit message`.

### Good examples

```text
- 优化 Shadowrocket 策略组与 GitHub 分流
  1. 将策略组命名调整为与 mihomo.yaml 一致的图标风格
  2. 新增 👨🏿‍💻 GitHub 独立策略组并改写 GitHub 规则目标
  3. 保留 direct/proxy 规则集顺序和 GEOIP CN 直连兜底
```

```text
- 调整 mihomo DNS 策略联动
  1. 为 AI 和 GitHub 规则集配置跟随对应策略组的 DoH 解析
  2. 保留 direct-nameserver 使用国内 DNS 且不跟随 nameserver-policy
  3. 维持 fake-ip 与 respect-rules 以适配当前 TUN 透明代理场景
```

```text
- 补充自定义代理规则
  1. 将 example.com 加入 rules/proxy.list 以强制走代理
  2. 确认 direct.list 未添加重复或冲突规则
```

```text
- 完善仓库代理配置说明
  1. 更新 README.md 中的规则来源说明
  2. 补充 Shadowrocket 与 mihomo 配置职责差异
```

### Bad examples

Do not use vague summaries:

```text
Optimize config
Update files
Fix rules
规范提交
```

Do not use generic details:

```text
- 优化配置
  1. 更新内容
  2. 修复问题
```

Do not mention only process when the commit changes repository content:

```text
- 规范 AGENTS.md 提交
  1. 按要求修改格式
```

Prefer a content-based message instead:

```text
- 完善 AGENTS.md 提交信息生成规则
  1. 增加提交信息生成流程、摘要模板和明细规则
  2. 补充不同配置变更场景的示例和反例
```

## Style

- Keep comments concise and consistent with the surrounding file.
- Prefer ASCII in prose unless the nearby content or user-facing labels rely on Chinese or emoji.
- Do not rewrite large unrelated sections just for formatting.
