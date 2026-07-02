import type { ExtractedSchedule } from '@famicale/shared'

// Workers AI vision モデル経由でプリント画像から日付/イベントを抽出。
// 認証は wrangler login の OAuth で済む (個別 API キー不要)、 無料枠 10,000 Neurons/日。
// モデルは llama-3.2-11b-vision-instruct を採用、 精度が出なければ
// @cf/mistralai/mistral-small-3.1-24b-instruct に切替検討。
const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct'

// PDF のテキストレイヤから抽出するときは画像不要なので軽量なテキストモデルを使う
// (vision より速く Neurons も食わない)。 精度不足なら llama-3.3-70b-instruct-fp8-fast に。
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct'

// 抽出ルール (画像 / テキスト共通)。 冒頭の素材説明だけ呼び出し側で差し替える。
function buildPrompt(intro: string): string {
  const year = new Date().getFullYear()
  return [
    intro,
    '記載されている日付とイベント名を全て抽出し、以下のJSON配列形式のみで返してください。',
    '[{"title":"イベント名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD|null"}]',
    '・プリント右上の発行日・配布日は予定ではないので除外。',
    '・単日のイベントは endDate を null にしてください。',
    '・「5月25日〜7月20日」のような期間イベントは startDate と endDate を両方埋めてください。',
    `・年が書かれていない場合は ${year} 年として補ってください。`,
    'JSONのみを返し、説明文は不要です。',
  ].join('\n')
}

export async function extractSchedules(
  ai: Ai,
  imageBytes: Uint8Array,
  mediaType: string
): Promise<ExtractedSchedule[]> {
  const prompt = buildPrompt('この画像は学校や習い事のプリント、または展示・イベントの告知です。')
  const dataUri = `data:${mediaType};base64,${toBase64(imageBytes)}`

  const result = await ai.run(VISION_MODEL, {
    messages: [
      { role: 'system', content: 'You only return JSON arrays. No prose.' },
      { role: 'user', content: prompt },
    ],
    image: dataUri,
    max_tokens: 1024,
    temperature: 0.3,
  })

  return parseSchedules((result as { response?: unknown }).response)
}

// PDF のテキストレイヤから抽出したプレーンテキストを渡してイベント抽出。
export async function extractSchedulesFromText(
  ai: Ai,
  text: string
): Promise<ExtractedSchedule[]> {
  const prompt = [
    buildPrompt('以下は学校や習い事のプリント、または展示・イベントの告知から抽出したテキストです。'),
    '',
    '--- テキスト ---',
    text,
  ].join('\n')

  const result = await ai.run(TEXT_MODEL, {
    messages: [
      { role: 'system', content: 'You only return JSON arrays. No prose.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  })

  return parseSchedules((result as { response?: unknown }).response)
}

// Workers AI の response は (a) オブジェクト配列そのまま、 (b) `[...]` 形式の文字列、
// (c) `[...]` で囲わず `{...}\n{...}` を並べただけの文字列、 の 3 パターンを観測。 全部拾う。
function parseSchedules(raw: unknown): ExtractedSchedule[] {
  const items: unknown[] = []
  if (Array.isArray(raw)) {
    items.push(...raw)
  } else if (typeof raw === 'string') {
    const arrMatch = raw.match(/\[[\s\S]*\]/)
    if (arrMatch) {
      try {
        const parsed = JSON.parse(arrMatch[0])
        if (Array.isArray(parsed)) items.push(...parsed)
      } catch { /* fall through to object scan */ }
    }
    if (items.length === 0) {
      for (const m of raw.matchAll(/\{[^{}]*\}/g)) {
        try { items.push(JSON.parse(m[0])) } catch { /* skip malformed */ }
      }
    }
  }

  const seen = new Set<string>()
  const out: ExtractedSchedule[] = []
  for (const s of items) {
    if (!s || typeof s !== 'object') continue
    const o = s as { title?: unknown; startDate?: unknown; endDate?: unknown }
    if (typeof o.title !== 'string' || !isIsoDate(o.startDate)) continue
    // endDate が壊れていたり開始日より前ならイベントごと捨てず単日扱いに落とす
    const endDate = isIsoDate(o.endDate) && o.endDate >= o.startDate ? o.endDate : undefined
    const key = `${o.title}|${o.startDate}|${endDate ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title: o.title, startDate: o.startDate, endDate })
  }
  return out
}

// モデル出力の日付が「5月25日」等の非 ISO 形式で来ると UI で Invalid Date になるため弾く
function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

// stack-safe base64 (String.fromCharCode 引数上限を避けるため 8KB ずつチャンク処理)
function toBase64(u8: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk) as unknown as number[])
  }
  return btoa(bin)
}
