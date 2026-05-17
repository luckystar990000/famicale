import type { ExtractedSchedule } from '@famicale/shared'

export async function extractSchedules(
  apiKey: string,
  imageBase64: string,
  mediaType: string
): Promise<ExtractedSchedule[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 }
            },
            {
              type: 'text',
              text: [
                'この画像は学校や習い事のプリント、または展示・イベントの告知です。',
                '記載されている日付とイベント名を全て抽出し、以下のJSON配列形式のみで返してください。',
                '[{"title":"イベント名","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD|null","category":"school|lessons|family|external|null"}]',
                '・単日のイベントは endDate を null にしてください。',
                '・「5月25日〜7月20日」のような期間イベントは startDate と endDate を両方埋めてください。',
                '・年が書かれていない場合は現在の年を補ってください。',
                'JSONのみを返し、説明文は不要です。'
              ].join('\n')
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json<{ content: Array<{ type: string; text: string }> }>()
  const text = data.content[0]?.text ?? '[]'

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    return JSON.parse(match[0]) as ExtractedSchedule[]
  } catch {
    return []
  }
}
