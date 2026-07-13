import type { ExtractedSchedule } from '@famicale/shared'

function isoOffset(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SCENARIOS: ExtractedSchedule[][] = [
  [
    { title: '授業参観', startDate: isoOffset(7) },
    { title: 'PTA 総会', startDate: isoOffset(7) },
    { title: '中間テスト', startDate: isoOffset(21), endDate: isoOffset(23) },
  ],
  [
    { title: '運動会', startDate: isoOffset(12) },
    { title: '運動会 予備日', startDate: isoOffset(13) },
    { title: '振替休業日', startDate: isoOffset(15) },
  ],
  [
    { title: '校外学習 (科学博物館)', startDate: isoOffset(20) },
    { title: '個人面談 (希望者)', startDate: isoOffset(34), endDate: isoOffset(38) },
  ],
  [
    { title: '夏休み開始', startDate: isoOffset(45) },
    { title: '夏期講習', startDate: isoOffset(50), endDate: isoOffset(60) },
    { title: '夏祭り', startDate: isoOffset(55) },
  ],
]

export async function mockExtractSchedules(file: File): Promise<ExtractedSchedule[]> {
  await new Promise(r => setTimeout(r, 1500 + Math.random() * 800))
  const seed = Math.floor(((file.size + file.name.length) % SCENARIOS.length))
  return SCENARIOS[seed].map(s => ({ ...s }))
}
