# AGENTS.md

Scope: this file applies to the whole repository.

## Project shape
- This repo stores proxy rule lists and client profiles for mihomo, OpenClash, sing-box, Shadowrocket, and Loon.
- Keep the repository lean. Prefer direct edits to rules and profiles over adding generators or extra tooling.

## Editing rules
- Preserve existing group names, emoji labels, and rule order unless a coordinated rename is required.
- Keep `rules/direct.list` for direct destinations and `rules/proxy.list` for proxy-only destinations.
- When a destination changes, check every profile that duplicates logic or names, especially `profiles/shadowrocket.conf` and `profiles/openclash.ini`.
- Keep rules as small as practical. Start with the narrowest useful match and avoid unnecessary complexity.
- Do not change remote rule URLs or provider sources unless the user asked for it.

## File-specific notes
- `profiles/mihomo.yaml`: keep the YAML valid and leave the placeholder/provider structure intact unless the task is to redesign it.
- `profiles/openclash.ini` and `profiles/shadowrocket.conf`: preserve client-specific syntax, quoting, and section layout.
- `sing-box/proxy.json`: keep valid JSON and avoid reformatting noise.
- `README.md`: update it when the repo structure, supported clients, or sourcing strategy changes.

## Validation
- Check syntax after edits: YAML, JSON, and INI.
- Verify that renamed groups or rule keys still match every reference in the repo.
- Search the tree before finishing if a change touches shared names or URLs.

## Commit Message
- Use this format:
  ```text
  - <本次commit的汇总信息>
    1. <明细1>
    2. <明细2>
  ```
- The first line should be the real summary for this commit, not a fixed phrase.
- Each numbered item should also be the real detail for this commit, not fixed placeholder text.
- Keep the summary as a bullet, with the main changes listed underneath as numbered items.

## Style
- Keep comments concise and consistent with the surrounding file.
- Prefer ASCII unless the nearby content clearly relies on non-ASCII labels.
- Leave unrelated user changes alone.
