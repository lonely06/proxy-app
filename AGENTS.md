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

- Generate the commit message from the actual diff, not from a generic task label.
- Use this required format:
  ```text
  - <真实汇总信息>
    1. <真实明细 1>
    2. <真实明细 2>
  ```
- The summary must mention the changed area and actual outcome.
- Each numbered item must describe one real change from the diff.
- Prefer 2-4 numbered items.
- Include preserved behavior when it matters, such as rule order, fallback behavior, DNS strategy, remote URLs, or existing group names.
- Do not use vague summaries such as `Optimize config`, `Update files`, `Fix rules`, `规范提交`, or `修正 commit message`.

Example:

```text
- 优化 Shadowrocket 策略组与 GitHub 分流
  1. 将策略组命名调整为与 mihomo.yaml 一致的图标风格
  2. 新增 👨🏿‍💻 GitHub 独立策略组并改写 GitHub 规则目标
  3. 保留 direct/proxy 规则集顺序和 GEOIP CN 直连兜底
```

## Style

- Keep comments concise and consistent with the surrounding file.
- Prefer ASCII in prose unless the nearby content or user-facing labels rely on Chinese or emoji.
- Do not rewrite large unrelated sections just for formatting.
