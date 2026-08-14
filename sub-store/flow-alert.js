// Sub-Store 组合订阅流量告警。
// 按合集当前成员逐条检查；单条用量 >= 阈值时走 Bark。
// 成员 = 合集 subscriptions ∪ 命中合集 subscriptionTags 的订阅。
// 不写死任何 tag；节点原样返回。
//
// 挂到组合订阅：编辑 → 节点操作+ → 脚本操作。
// 脚本链接填到「脚本」栏，参数填到同一条操作的「参数」栏（不要拼在链接后面）。
// 参数示例：
//   threshold=90&cooldownHours=24&bark=https://api.day.app/<device_key>/[推送标题]/[推送内容]?group=SubStore
//
// 参数放置：
//   脚本：https://raw.githubusercontent.com/lonely06/proxy-app/refs/heads/main/sub-store/flow-alert.js
//   参数：threshold=90&cooldownHours=24&bark=...
//   对应 $arguments.threshold / $arguments.cooldownHours / $arguments.bark
//
// Bark 地址格式（arguments.bark）：
//   官方：  https://api.day.app/<device_key>/[推送标题]/[推送内容]?group=SubStore&sound=minuet&level=timeSensitive
//   自建：  https://bark.example.com/<device_key>/[推送标题]/[推送内容]?group=SubStore
// 占位符 [推送标题]、[推送内容] 由本脚本替换。
// 只填基础地址（https://api.day.app/<device_key>）时，会自动补 /{title}/{body}。
// 未传 bark 时回退到 $.notify（Docker SUB_STORE_PUSH_SERVICE）。

const BARK_TITLE_TOKEN = '[推送标题]'
const BARK_BODY_TOKEN = '[推送内容]'
const STATE_KEY = 'flow-alert-state'

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const { source } = context
  const collection = source && source._collection
  if (!collection || Object.keys(source).length > 1) {
    throw new Error('请在组合订阅中使用此脚本')
  }

  const args = $arguments || {}
  const threshold = Number(args.threshold || 90)
  const cooldownHours = Number(args.cooldownHours || 24)
  const bark = String(args.bark || '').trim()

  const { parseFlowHeaders, getFlowHeaders, normalizeFlowHeader } = flowUtils
  const allSubs = $.read('subs') || []
  const names = collectMemberNames(collection, allSubs)
  if (!names.length) return proxies

  const now = Date.now()
  const state = $.read(STATE_KEY) || {}
  const cooldownMs = cooldownHours * 3600 * 1000

  for (const sub of allSubs) {
    if (!names.includes(sub.name)) continue

    let header
    try {
      header = await readFlowHeader(sub, getFlowHeaders, normalizeFlowHeader)
    } catch (err) {
      $.error(`流量告警 ${sub.name} 读取失败: ${err && err.message ? err.message : err}`)
      continue
    }
    if (!header) continue

    const info = parseFlowHeaders(header)
    const total = Number(info.total || 0)
    const used =
      Number((info.usage && info.usage.upload) || 0) + Number((info.usage && info.usage.download) || 0)
    if (!(total > 0)) continue

    const percent = (used / total) * 100
    if (percent < threshold) {
      if (state[sub.name]) {
        delete state[sub.name]
        $.write(state, STATE_KEY)
      }
      continue
    }

    const prev = state[sub.name] || {}
    if (prev.at && now - prev.at < cooldownMs) continue

    const expire = info.expires ? new Date(info.expires * 1000).toISOString().slice(0, 10) : ''
    const title = `流量告警：${sub.name}`
    const subtitle = `已用 ${percent.toFixed(1)}%（阈值 ${threshold}%）`
    const body =
      `已用：${fmt(used)}\n剩余：${fmt(Math.max(total - used, 0))}` + (expire ? `\n到期：${expire}` : '')

    try {
      await notifyBark($, bark, title, subtitle, body)
    } catch (err) {
      $.error(`流量告警 ${sub.name} Bark 推送失败: ${err && err.message ? err.message : err}`)
      continue
    }

    state[sub.name] = { at: now, percent: Number(percent.toFixed(1)) }
    $.write(state, STATE_KEY)
  }

  return proxies
}

function collectMemberNames(collection, allSubs) {
  const names = []
  ;(collection.subscriptions || []).forEach(name => {
    if (name && !names.includes(name)) names.push(name)
  })

  const tags = collection.subscriptionTags || []
  if (Array.isArray(tags) && tags.length > 0) {
    allSubs.forEach(sub => {
      if (!sub || !sub.name || names.includes(sub.name)) return
      if (Array.isArray(sub.tag) && sub.tag.some(tag => tags.includes(tag))) {
        names.push(sub.name)
      }
    })
  }
  return names
}

async function readFlowHeader(sub, getFlowHeaders, normalizeFlowHeader) {
  let flowInfo
  if (sub.source !== 'local' || ['localFirst', 'remoteFirst'].includes(sub.mergeSources)) {
    let url =
      String(sub.url || '')
        .split(/[\r\n]+/)
        .map(i => i.trim())
        .filter(Boolean)[0] || ''
    const rawArgs = url.split('#')
    url = rawArgs[0]
    let urlArgs = {}
    if (rawArgs.length > 1) {
      try {
        urlArgs = JSON.parse(decodeURIComponent(rawArgs[1]))
      } catch (e) {
        rawArgs[1].split('&').forEach(pair => {
          const key = pair.split('=')[0]
          const value = pair.split('=')[1]
          urlArgs[key] = value == null || value === '' ? true : decodeURIComponent(value)
        })
      }
    }
    if (!urlArgs.noFlow && /^https?:/.test(url)) {
      flowInfo = await getFlowHeaders(
        urlArgs.insecure ? `${url}#insecure` : url,
        urlArgs.flowUserAgent,
        undefined,
        sub.proxy,
        urlArgs.flowUrl
      )
    }
  }

  let custom = sub.subUserinfo
  if (custom && /^https?:\/\//.test(custom)) {
    custom = await getFlowHeaders(undefined, undefined, undefined, sub.proxy, custom)
  }

  const headers = normalizeFlowHeader([custom, flowInfo].filter(Boolean).join(';'), true)
  return headers && headers['subscription-userinfo']
}

async function notifyBark($, bark, title, subtitle, body) {
  const content = [subtitle, body].filter(Boolean).join('\n')
  if (bark) {
    const url = buildBarkUrl(bark, title, content)
    const res = await $.http.get(url)
    const status = res && (res.status || res.statusCode)
    if (status && status >= 400) {
      throw new Error(`Bark HTTP ${status}`)
    }
    return
  }
  $.notify(title, subtitle, body)
}

function buildBarkUrl(bark, title, body) {
  const encodedTitle = encodeURIComponent(title)
  const encodedBody = encodeURIComponent(body)
  if (bark.indexOf(BARK_TITLE_TOKEN) !== -1 || bark.indexOf(BARK_BODY_TOKEN) !== -1) {
    return bark.split(BARK_TITLE_TOKEN).join(encodedTitle).split(BARK_BODY_TOKEN).join(encodedBody)
  }
  return bark.replace(/\/+$/, '') + `/${encodedTitle}/${encodedBody}`
}

function fmt(n) {
  n = Number(n)
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(2)} ${units[i]}`
}
