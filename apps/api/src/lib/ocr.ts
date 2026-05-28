import type { ExtractedSchedule } from '@famicale/shared'

// Workers AI vision モデル経由でプリント画像から日付/イベントを抽出。
// 認証は wrangler login の OAuth で済む (個別 API キー不要)、 無料枠 10,000 Neurons/日。
// モデルは llama-3.2-11b-vision-instruct を採用、 精度が出なければ
// @cf/mistralai/mistral-small-3.1-24b-instruct に切替検討。
const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct'

export async function extractSchedules(
  ai: Ai,
  imageBytes: Uint8Array,
  mediaType: string
): Promise<ExtractedSchedule[]> {
  const year = new Date().getFullYear()
  const prompt = [
    'この画像は学校や習い事のプリント、または展示・イベントの告知です。',
    '記載されている日付とイベント名を全て抽出し、以下のJSON配列形式のみで返してください。',
    '[{"title":"イベント名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD|null","category":"school|lessons|family|external|null"}]',
    '・単日のイベントは endDate を null にしてください。',
    '・「5月25日〜7月20日」のような期間イベントは startDate と endDate を両方埋めてください。',
    `・年が書かれていない場合は ${year} 年として補ってください。`,
    'JSONのみを返し、説明文は不要です。',
  ].join('\n')

  const dataUri = `data:${mediaType};base64,${toBase64(imageBytes)}`

  const result = await ai.run(MODEL, {
    messages: [
      { role: 'system', content: 'You only return JSON arrays. No prose.' },
      { role: 'user', content: prompt },
    ],
    image: dataUri,
    max_tokens: 1024,
  })

  // Workers AI vision は response にオブジェクト配列をそのまま入れて返すことがあり、
  // 文字列で返ることもあるので両対応。
  const raw = (result as { response?: unknown }).response
  let parsed: unknown
  if (Array.isArray(raw)) {
    parsed = raw
  } else if (typeof raw === 'string') {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    try { parsed = JSON.parse(match[0]) } catch { return [] }
  } else {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((s): s is { title: string; startDate: string; endDate?: unknown; category?: unknown } =>
      !!s && typeof s === 'object' && typeof (s as any).title === 'string' && typeof (s as any).startDate === 'string'
    )
    .map(s => ({
      title: s.title,
      startDate: s.startDate,
      endDate: typeof s.endDate === 'string' && s.endDate !== 'null' ? s.endDate : undefined,
      category: typeof s.category === 'string' && s.category !== 'null' ? s.category : undefined,
    }))
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
