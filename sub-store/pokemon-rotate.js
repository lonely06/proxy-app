// Sub-Store 组合订阅：宝可梦多账号串行切换。
// 合集先收齐全部宝可梦节点，本脚本只放行当前账号的 [PKMn]，再写回 tag。
// 当前 airport 账号未耗尽则继续用；耗尽后按名称顺序切下一个还有余量的；全部耗尽则不输出宝可梦节点。
// 过滤是这次下载的依据；tag / noFlow 只给下次收源和 flow-alert 用。
//
// 挂到组合订阅，放在 flow-alert.js 前面：
//   脚本：https://raw.githubusercontent.com/lonely06/proxy-app/refs/heads/main/sub-store/pokemon-rotate.js
//   参数：minRemainMB=100&bark=https://api.day.app/<device_key>/[推送标题]/[推送内容]?group=SubStore
//
// 账号约定：名称 宝可梦1/2/3…，节点前缀 [PKM1]/[PKM2]/[PKM3]…，组 tag=pokemon。
// 当前在用额外打 airport；其余打 pokemon-standby，但保留流量查询。
// 不要把设备 Key 写进仓库。

const BARK_TITLE_TOKEN = "[推送标题]";
const BARK_BODY_TOKEN = "[推送内容]";
const STATE_KEY = "pokemon-rotate-state";
const NAME_RE = /^宝可梦(\d+)$/;
const PREFIX_RE = /\[PKM(\d*)\]/;
const MB = 1024 * 1024;

// eslint-disable-next-line no-unused-vars -- Sub-Store entry point
async function operator(proxies = [], _targetPlatform, context) {
	const $ = $substore;
	const collection = context && context.source && context.source._collection;
	if (!collection || Object.keys(context.source).length > 1) {
		throw new Error("请在组合订阅中使用此脚本");
	}

	const args = $arguments || {};
	const groupTag = String(args.groupTag || "pokemon");
	const activeTag = String(args.activeTag || "airport");
	const standbyTag = String(args.standbyTag || "pokemon-standby");
	const minRemain = Number(args.minRemainMB || 100) * MB;
	const bark = String(args.bark || "").trim();

	const allSubs = $.read("subs") || [];
	const accounts = listAccounts(allSubs, groupTag);
	if (!accounts.length) {
		await notifyUnavailable($, bark, accounts, null);
		return proxies;
	}

	try {
		const { parseFlowHeaders, getFlowHeaders, normalizeFlowHeader } = flowUtils;
		const counted = countPrefixes(proxies);
		for (const acc of accounts) {
			acc.nodeCount = counted[acc.prefix] || 0;
			try {
				const header = await readFlowHeader(
					acc.sub,
					getFlowHeaders,
					normalizeFlowHeader,
				);
				acc.info = header ? parseFlowHeaders(header) : null;
			} catch (err) {
				$.error(
					`宝可梦切号 ${acc.name} 读流量失败: ${err && err.message ? err.message : err}`,
				);
				acc.info = null;
			}
			acc.exhausted = isExhausted(acc, minRemain);
		}

		const current = currentAccount(accounts, activeTag);
		const chosen = pickAccount(accounts, current);
		const selectedPrefix = chosen ? chosen.prefix : null;
		const switched = !!(chosen && current && chosen.name !== current.name);

		await notifyUnavailable($, bark, accounts, chosen);
		persistTags($, allSubs, accounts, chosen, {
			groupTag,
			activeTag,
			standbyTag,
		});

		if (switched) {
			const remain = remainingBytes(chosen.info);
			try {
				await notifyBark(
					$,
					bark,
					`已切换：${chosen.name}`,
					`${current.name} → ${chosen.name}`,
					remain == null ? "下一账号仍有余量" : `下一账号剩余 ${fmt(remain)}`,
				);
			} catch (err) {
				$.error(`宝可梦切号 Bark 失败: ${err && err.message ? err.message : err}`);
			}
		}

		return filterProxies(
			proxies,
			selectedPrefix,
			current && current.prefix,
			false,
		);
	} catch (err) {
		$.error(
			`宝可梦切号失败，仅保留当前账号: ${err && err.message ? err.message : err}`,
		);
		const current = currentAccount(accounts, activeTag);
		return filterProxies(
			proxies,
			current && current.prefix,
			current && current.prefix,
			true,
		);
	}
}

function listAccounts(allSubs, groupTag) {
	const out = [];
	(allSubs || []).forEach((sub) => {
		if (!sub || !sub.name) return;
		const matched = sub.name.match(NAME_RE);
		if (!matched) return;
		if (
			groupTag &&
			!(Array.isArray(sub.tag) && sub.tag.indexOf(groupTag) !== -1)
		) {
			return;
		}
		out.push({
			name: sub.name,
			prefix: `PKM${matched[1]}`,
			index: Number(matched[1]),
			sub,
			info: null,
			nodeCount: 0,
			exhausted: false,
		});
	});
	out.sort((a, b) => a.index - b.index);
	return out;
}

function currentAccount(accounts, activeTag) {
	return (
		accounts.find(
			(acc) => Array.isArray(acc.sub.tag) && acc.sub.tag.indexOf(activeTag) !== -1,
		) || null
	);
}

function pickAccount(accounts, current) {
	if (current && !current.exhausted) return current;
	const start = current ? accounts.indexOf(current) : -1;
	for (let i = 1; i <= accounts.length; i++) {
		const acc = accounts[(start + i) % accounts.length];
		if (acc && !acc.exhausted) return acc;
	}
	return current && !current.exhausted ? current : null;
}

function isExhausted(acc, minRemain) {
	if (!acc.nodeCount) return true;
	const total = Number(acc.info && acc.info.total);
	if (!(total > 0)) return false;
	const used = usedBytes(acc.info);
	if (used >= total) return true;
	return total - used < minRemain;
}

function usedBytes(info) {
	if (!info || !info.usage) return 0;
	return Number(info.usage.upload || 0) + Number(info.usage.download || 0);
}

function remainingBytes(info) {
	const total = Number(info && info.total);
	if (!(total > 0)) return null;
	return Math.max(total - usedBytes(info), 0);
}

function prefixOf(name) {
	const matched = String(name || "").match(PREFIX_RE);
	if (!matched) return null;
	return matched[1] ? `PKM${matched[1]}` : "PKM1";
}

function countPrefixes(proxies) {
	const counted = {};
	(proxies || []).forEach((proxy) => {
		const prefix = prefixOf(proxy && proxy.name);
		if (!prefix) return;
		counted[prefix] = (counted[prefix] || 0) + 1;
	});
	return counted;
}

function filterProxies(proxies, selectedPrefix, fallbackPrefix, failed) {
	const keep = selectedPrefix || (failed ? fallbackPrefix : null);
	return (proxies || []).filter((proxy) => {
		const prefix = prefixOf(proxy && proxy.name);
		if (!prefix) return true;
		return keep ? prefix === keep : false;
	});
}

function persistTags($, allSubs, accounts, chosen, tags) {
	let dirty = false;
	accounts.forEach((acc) => {
		const active = !!(chosen && acc.name === chosen.name);
		if (applyTags(acc.sub, active, tags)) dirty = true;
	});
	if (dirty) $.write(allSubs, "subs");
}

function applyTags(sub, active, tags) {
	const next = Array.isArray(sub.tag) ? sub.tag.slice() : [];
	addTag(next, tags.groupTag);
	if (active) {
		addTag(next, tags.activeTag);
		removeTag(next, tags.standbyTag);
	} else {
		addTag(next, tags.standbyTag);
		removeTag(next, tags.activeTag);
	}
	const nextNoFlow = false;
	const same = sameTags(sub.tag, next) && Boolean(sub.noFlow) === nextNoFlow;
	if (same) return false;
	sub.tag = next;
	sub.noFlow = nextNoFlow;
	return true;
}

function addTag(list, tag) {
	if (tag && list.indexOf(tag) === -1) list.push(tag);
}

function removeTag(list, tag) {
	const i = list.indexOf(tag);
	if (i !== -1) list.splice(i, 1);
}

function sameTags(a, b) {
	const left = Array.isArray(a) ? a.slice().sort().join("\0") : "";
	const right = Array.isArray(b) ? b.slice().sort().join("\0") : "";
	return left === right;
}

async function readFlowHeader(sub, getFlowHeaders, normalizeFlowHeader) {
	let flowInfo;
	if (
		sub.source !== "local" ||
		["localFirst", "remoteFirst"].includes(sub.mergeSources)
	) {
		let url =
			String(sub.url || "")
				.split(/[\r\n]+/)
				.map((i) => i.trim())
				.filter(Boolean)[0] || "";
		const rawArgs = url.split("#");
		url = rawArgs[0];
		if (/^https?:/.test(url)) {
			flowInfo = await getFlowHeaders(url, undefined, undefined, sub.proxy);
		}
	}

	let custom = sub.subUserinfo;
	if (custom && /^https?:\/\//.test(custom)) {
		custom = await getFlowHeaders(
			undefined,
			undefined,
			undefined,
			sub.proxy,
			custom,
		);
	}

	const headers = normalizeFlowHeader(
		[custom, flowInfo].filter(Boolean).join(";"),
		true,
	);
	return headers && headers["subscription-userinfo"];
}

async function notifyUnavailable($, bark, accounts, chosen) {
	const state = $.read(STATE_KEY) || {};
	if (chosen) {
		if (state.unavailable) {
			delete state.unavailable;
			$.write(state, STATE_KEY);
		}
		return;
	}
	if (state.unavailable) return;

	try {
		await notifyBark(
			$,
			bark,
			"宝可梦订阅不可用",
			"没有可用账号",
			accounts.length
				? `${accounts.map((acc) => acc.name).join("、")} 均已耗尽或无有效节点，已移除宝可梦节点。`
				: "未配置宝可梦账号，已移除宝可梦节点。",
		);
		$.write({ unavailable: true }, STATE_KEY);
	} catch (err) {
		$.error(
			`宝可梦无可用订阅通知失败: ${err && err.message ? err.message : err}`,
		);
	}
}

async function notifyBark($, bark, title, subtitle, body) {
	const content = [subtitle, body].filter(Boolean).join("\n");
	if (bark) {
		const url = buildBarkUrl(bark, title, content);
		const res = await $.http.get(url);
		const status = res && (res.status || res.statusCode);
		if (status && status >= 400) throw new Error(`Bark HTTP ${status}`);
		return;
	}
	$.notify(title, subtitle, body);
}

function buildBarkUrl(bark, title, body) {
	const encodedTitle = encodeURIComponent(title);
	const encodedBody = encodeURIComponent(body);
	if (
		bark.indexOf(BARK_TITLE_TOKEN) !== -1 ||
		bark.indexOf(BARK_BODY_TOKEN) !== -1
	) {
		return bark
			.split(BARK_TITLE_TOKEN)
			.join(encodedTitle)
			.split(BARK_BODY_TOKEN)
			.join(encodedBody);
	}
	return bark.replace(/\/+$/, "") + `/${encodedTitle}/${encodedBody}`;
}

function fmt(n) {
	n = Number(n);
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i++;
	}
	return `${n.toFixed(2)} ${units[i]}`;
}

if (typeof $substore === "undefined" && typeof process !== "undefined") {
	const minRemain = 100 * MB;
	const GB = 1024 * MB;
	const acc = (name, index, tag, info, nodeCount) => ({
		name,
		prefix: `PKM${index}`,
		index,
		sub: { tag: tag.slice() },
		info,
		nodeCount,
		exhausted: false,
	});
	const used = (n, total) => ({
		total,
		usage: { upload: 0, download: n },
	});

	if (prefixOf("🇭🇰 [PKM] 香港") !== "PKM1") throw new Error("bare PKM");
	if (prefixOf("🇭🇰 [PKM1] 香港") !== "PKM1") throw new Error("PKM1");
	if (prefixOf("🇯🇵 [PKM2] 东京") !== "PKM2") throw new Error("PKM2");
	if (prefixOf("🇺🇸 [PQ] 洛杉矶") !== null) throw new Error("non-pokemon");

	const a1 = acc("宝可梦1", 1, ["pokemon", "airport"], used(10, 60 * GB), 48);
	const a2 = acc(
		"宝可梦2",
		2,
		["pokemon", "pokemon-standby"],
		used(0, 60 * GB),
		48,
	);
	const a3 = acc(
		"宝可梦3",
		3,
		["pokemon", "pokemon-standby"],
		used(62 * GB, 60 * GB),
		48,
	);
	a1.exhausted = isExhausted(a1, minRemain);
	a2.exhausted = isExhausted(a2, minRemain);
	a3.exhausted = isExhausted(a3, minRemain);
	if (a1.exhausted || a2.exhausted || !a3.exhausted) {
		throw new Error("exhaust flags");
	}
	if (pickAccount([a1, a2, a3], a1) !== a1) throw new Error("keep current");

	a1.info = used(60 * GB - 50 * MB, 60 * GB);
	a1.exhausted = isExhausted(a1, minRemain);
	if (!a1.exhausted) throw new Error("low remain");
	if (pickAccount([a1, a2, a3], a1) !== a2) throw new Error("switch to 2");

	a1.nodeCount = 0;
	a1.info = used(10, 60 * GB);
	a1.exhausted = isExhausted(a1, minRemain);
	if (!a1.exhausted) throw new Error("zero nodes");

	a1.exhausted = true;
	a2.exhausted = true;
	a3.exhausted = true;
	if (pickAccount([a1, a2, a3], a1) !== null) throw new Error("drop when all exhausted");

	const standby = { tag: ["pokemon", "pokemon-standby"], noFlow: true };
	applyTags(standby, false, {
		groupTag: "pokemon",
		activeTag: "airport",
		standbyTag: "pokemon-standby",
	});
	if (standby.noFlow) throw new Error("keep standby flow query");

	const mixed = [
		{ name: "🇭🇰 [PKM1] 香港" },
		{ name: "🇭🇰 [PKM2] 香港" },
		{ name: "🇯🇵 [PQ] 东京" },
	];
	const kept = filterProxies(mixed, "PKM2", "PKM1", false).map((p) => p.name);
	if (kept.join() !== "🇭🇰 [PKM2] 香港,🇯🇵 [PQ] 东京") {
		throw new Error("filter selected");
	}
	const closed = filterProxies(mixed, null, "PKM1", true).map((p) => p.name);
	if (closed.join() !== "🇭🇰 [PKM1] 香港,🇯🇵 [PQ] 东京") {
		throw new Error("fail closed");
	}
	const none = filterProxies(mixed, null, null, true).map((p) => p.name);
	if (none.join() !== "🇯🇵 [PQ] 东京") throw new Error("fail drop all pokemon");
}
