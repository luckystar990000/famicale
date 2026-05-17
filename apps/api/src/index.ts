import { Hono } from 'hono'
import { cors } from 'hono/cors'
import documents from './routes/documents'
import schedules from './routes/schedules'

export type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  AI: Ai
  ANTHROPIC_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({ origin: '*' }))

app.route('/api/documents', documents)
app.route('/api/schedules', schedules)

app.get('/', (c) => c.json({ status: 'ok', service: 'famicale-api' }))

export default app
