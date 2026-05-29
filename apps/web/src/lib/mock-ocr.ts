import type { ExtractedSchedule, ExtractedTimetable, TimetableCell } from '@famicale/shared'

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

const TIMETABLE_SAMPLES: ExtractedTimetable[] = [
  {
    owner: '長男',
    cells: gridCells([
      ['国語', '算数', '理科', '体育', '図工'],
      ['算数', '国語', '社会', '音楽', '家庭'],
      ['理科', '体育', '算数', '国語', '総合'],
      ['社会', '算数', '国語', '英語', '道徳'],
      ['国語', '理科', '体育', '算数', '学活'],
    ]),
  },
  {
    owner: '長女',
    cells: gridCells([
      ['英語', '数学', '国語', '理科', '社会', '体育'],
      ['数学', '英語', '理科', '保体', '美術', '美術'],
      ['国語', '社会', '数学', '英語', '技術', '技術'],
      ['理科', '国語', '英語', '音楽', '数学', '学活'],
      ['社会', '理科', '数学', '国語', '英語', '道徳'],
    ]),
  },
  {
    owner: '次男',
    cells: gridCells([
      ['国語', '算数', '生活', '体育'],
      ['算数', '国語', '音楽', '図工'],
      ['国語', '算数', '生活', '体育'],
      ['算数', '国語', '図工', '音楽'],
      ['国語', '算数', '生活', '道徳'],
    ]),
  },
]

function gridCells(rows: string[][]): TimetableCell[] {
  const out: TimetableCell[] = []
  rows.forEach((row, dayIndex) => {
    row.forEach((subject, periodIndex) => {
      if (!subject) return
      out.push({
        dayOfWeek: (dayIndex + 1) as TimetableCell['dayOfWeek'],
        period: periodIndex + 1,
        subject,
      })
    })
  })
  return out
}

export async function mockExtractTimetable(file: File): Promise<ExtractedTimetable> {
  await new Promise(r => setTimeout(r, 1500 + Math.random() * 800))
  const seed = Math.floor(((file.size + file.name.length) % TIMETABLE_SAMPLES.length))
  const sample = TIMETABLE_SAMPLES[seed]
  return { owner: sample.owner, cells: sample.cells.map(c => ({ ...c })) }
}
