import type { ExtractedTimetable, TimetableCell } from '@famicale/shared'

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
