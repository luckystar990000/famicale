import { Hono } from 'hono'
import { cors } from 'hono/cors'
import documents from './routes/documents'
import schedules from './routes/schedules'
import timetables from './routes/timetables'
import lunch from './routes/lunch'
import push from './routes/push'

export type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  AI: Ai
  EDIT_KEY: string
  VAPID_PRIVATE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'X-Edit-Key'] }))

app.route('/api/documents', documents)
app.route('/api/schedules', schedules)
app.route('/api/timetables', timetables)
app.route('/api/lunch', lunch)
app.route('/api/push', push)

app.get('/', (c) => c.json({ status: 'ok', service: 'famicale-api' }))

// Cron (毎日 20:00 JST = 11:00 UTC): 明日が対象日の予定を購読者へ前日通知。
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const { sendTomorrowReminder } = await import('./lib/notify')
    ctx.waitUntil(
      sendTomorrowReminder(env).then(r =>
        console.log(`reminder: ${r.count} schedules, sent to ${r.sent} subscribers`)
      )
    )
  },
}
