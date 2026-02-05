import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

const usePostgres = !!process.env.POSTGRES_URL

// ==================== SM-2 SPACED REPETITION ALGORITHM ====================

function calculateNextReview(
  easeFactor: number,
  interval: number,
  repetitions: number,
  result: 'again' | 'hard' | 'good' | 'easy'
): { nextInterval: number; easeFactor: number; repetitions: number; status: string } {
  const quality = { again: 0, hard: 2, good: 3, easy: 5 }[result]

  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  newEF = Math.max(1.3, newEF)

  let newInterval: number
  let newReps: number
  let status: string

  if (quality < 2) {
    // Failed — restart learning
    newInterval = 0
    newReps = 0
    status = 'relearning'
  } else {
    newReps = repetitions + 1
    if (newReps === 1) {
      newInterval = 1
    } else if (newReps === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * newEF)
    }
    status = 'review'
  }

  if (result === 'easy') {
    newInterval = Math.max(newInterval, Math.round(interval * 2.5) || 4)
  }

  return { nextInterval: newInterval, easeFactor: newEF, repetitions: newReps, status }
}

// ==================== SEED DATA — A2/B1 SPANISH VOCABULARY ====================

const SEED_CARDS: Array<{
  id: string
  spanish_word: string
  english_translation: string
  example_sentence_spanish: string
  example_sentence_english: string
  word_type: string
  tags: string[]
  source: string
}> = [
  // === Common Verbs (A2-B1) ===
  { id: 'es-001', spanish_word: 'conseguir', english_translation: 'to achieve / to get', example_sentence_spanish: 'Necesito conseguir un trabajo nuevo.', example_sentence_english: 'I need to get a new job.', word_type: 'verb', tags: ['high-frequency', 'irregular'], source: 'top5000' },
  { id: 'es-002', spanish_word: 'parecer', english_translation: 'to seem / to appear', example_sentence_spanish: 'Parece que va a llover.', example_sentence_english: 'It seems like it\'s going to rain.', word_type: 'verb', tags: ['high-frequency'], source: 'top5000' },
  { id: 'es-003', spanish_word: 'quedar', english_translation: 'to stay / to remain / to meet up', example_sentence_spanish: '¿Quedamos a las ocho?', example_sentence_english: 'Shall we meet at eight?', word_type: 'verb', tags: ['high-frequency', 'multiple-meanings'], source: 'top5000' },
  { id: 'es-004', spanish_word: 'dejar', english_translation: 'to leave / to let / to quit', example_sentence_spanish: 'Dejé las llaves en la mesa.', example_sentence_english: 'I left the keys on the table.', word_type: 'verb', tags: ['high-frequency', 'multiple-meanings'], source: 'top5000' },
  { id: 'es-005', spanish_word: 'convertirse', english_translation: 'to become', example_sentence_spanish: 'Se convirtió en un gran escritor.', example_sentence_english: 'He became a great writer.', word_type: 'verb', tags: ['reflexive', 'B1'], source: 'top5000' },
  { id: 'es-006', spanish_word: 'desarrollar', english_translation: 'to develop', example_sentence_spanish: 'Queremos desarrollar nuevas habilidades.', example_sentence_english: 'We want to develop new skills.', word_type: 'verb', tags: ['B1', 'professional'], source: 'top5000' },
  { id: 'es-007', spanish_word: 'dirigir', english_translation: 'to direct / to lead / to manage', example_sentence_spanish: 'Ella dirige un equipo de diez personas.', example_sentence_english: 'She manages a team of ten people.', word_type: 'verb', tags: ['B1', 'professional'], source: 'top5000' },
  { id: 'es-008', spanish_word: 'lograr', english_translation: 'to achieve / to manage to', example_sentence_spanish: 'Logré terminar el proyecto a tiempo.', example_sentence_english: 'I managed to finish the project on time.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-009', spanish_word: 'resultar', english_translation: 'to turn out / to result', example_sentence_spanish: 'La reunión resultó muy útil.', example_sentence_english: 'The meeting turned out to be very useful.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-010', spanish_word: 'aprovechar', english_translation: 'to take advantage of / to make the most of', example_sentence_spanish: 'Hay que aprovechar el buen tiempo.', example_sentence_english: 'We should make the most of the good weather.', word_type: 'verb', tags: ['B1', 'idiomatic'], source: 'top5000' },
  { id: 'es-011', spanish_word: 'pertenecer', english_translation: 'to belong', example_sentence_spanish: 'Este libro pertenece a mi hermano.', example_sentence_english: 'This book belongs to my brother.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-012', spanish_word: 'ofrecer', english_translation: 'to offer', example_sentence_spanish: 'Me ofrecieron un puesto mejor.', example_sentence_english: 'They offered me a better position.', word_type: 'verb', tags: ['B1', 'irregular'], source: 'top5000' },
  { id: 'es-013', spanish_word: 'suponer', english_translation: 'to suppose / to assume', example_sentence_spanish: 'Supongo que tienes razón.', example_sentence_english: 'I suppose you\'re right.', word_type: 'verb', tags: ['high-frequency', 'irregular'], source: 'top5000' },
  { id: 'es-014', spanish_word: 'atravesar', english_translation: 'to cross / to go through', example_sentence_spanish: 'Atravesamos el puente a pie.', example_sentence_english: 'We crossed the bridge on foot.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-015', spanish_word: 'proponer', english_translation: 'to propose / to suggest', example_sentence_spanish: 'Propongo que hagamos una pausa.', example_sentence_english: 'I suggest we take a break.', word_type: 'verb', tags: ['B1', 'subjunctive'], source: 'top5000' },
  // === Nouns (A2-B1) ===
  { id: 'es-016', spanish_word: 'conocimiento', english_translation: 'knowledge', example_sentence_spanish: 'El conocimiento es poder.', example_sentence_english: 'Knowledge is power.', word_type: 'noun', tags: ['B1', 'abstract'], source: 'top5000' },
  { id: 'es-017', spanish_word: 'desarrollo', english_translation: 'development', example_sentence_spanish: 'El desarrollo económico es importante.', example_sentence_english: 'Economic development is important.', word_type: 'noun', tags: ['B1', 'professional'], source: 'top5000' },
  { id: 'es-018', spanish_word: 'comportamiento', english_translation: 'behavior', example_sentence_spanish: 'Su comportamiento fue inaceptable.', example_sentence_english: 'His behavior was unacceptable.', word_type: 'noun', tags: ['B1'], source: 'top5000' },
  { id: 'es-019', spanish_word: 'herramienta', english_translation: 'tool', example_sentence_spanish: 'Necesito una herramienta para arreglar esto.', example_sentence_english: 'I need a tool to fix this.', word_type: 'noun', tags: ['A2'], source: 'top5000' },
  { id: 'es-020', spanish_word: 'habilidad', english_translation: 'skill / ability', example_sentence_spanish: 'Tiene muchas habilidades técnicas.', example_sentence_english: 'He has many technical skills.', word_type: 'noun', tags: ['B1', 'professional'], source: 'top5000' },
  { id: 'es-021', spanish_word: 'entorno', english_translation: 'environment / surroundings', example_sentence_spanish: 'Me gusta el entorno de esta oficina.', example_sentence_english: 'I like the environment of this office.', word_type: 'noun', tags: ['B1'], source: 'top5000' },
  { id: 'es-022', spanish_word: 'plazo', english_translation: 'deadline / term / period', example_sentence_spanish: 'El plazo es hasta el viernes.', example_sentence_english: 'The deadline is until Friday.', word_type: 'noun', tags: ['B1', 'professional'], source: 'top5000' },
  { id: 'es-023', spanish_word: 'esfuerzo', english_translation: 'effort', example_sentence_spanish: 'Con esfuerzo se puede lograr todo.', example_sentence_english: 'With effort you can achieve anything.', word_type: 'noun', tags: ['B1'], source: 'top5000' },
  { id: 'es-024', spanish_word: 'recuerdo', english_translation: 'memory / souvenir', example_sentence_spanish: 'Tengo un buen recuerdo de esas vacaciones.', example_sentence_english: 'I have a good memory of that vacation.', word_type: 'noun', tags: ['A2', 'multiple-meanings'], source: 'top5000' },
  { id: 'es-025', spanish_word: 'temporada', english_translation: 'season / period', example_sentence_spanish: 'La temporada de lluvia empieza en junio.', example_sentence_english: 'The rainy season starts in June.', word_type: 'noun', tags: ['B1'], source: 'top5000' },
  // === Adjectives (A2-B1) ===
  { id: 'es-026', spanish_word: 'propio', english_translation: 'own / proper', example_sentence_spanish: 'Tengo mi propia empresa.', example_sentence_english: 'I have my own company.', word_type: 'adjective', tags: ['high-frequency'], source: 'top5000' },
  { id: 'es-027', spanish_word: 'capaz', english_translation: 'capable', example_sentence_spanish: 'Es capaz de resolver cualquier problema.', example_sentence_english: 'He\'s capable of solving any problem.', word_type: 'adjective', tags: ['B1'], source: 'top5000' },
  { id: 'es-028', spanish_word: 'dispuesto', english_translation: 'willing / ready', example_sentence_spanish: 'Estoy dispuesto a ayudarte.', example_sentence_english: 'I\'m willing to help you.', word_type: 'adjective', tags: ['B1'], source: 'top5000' },
  { id: 'es-029', spanish_word: 'cotidiano', english_translation: 'daily / everyday', example_sentence_spanish: 'La vida cotidiana puede ser aburrida.', example_sentence_english: 'Everyday life can be boring.', word_type: 'adjective', tags: ['B1'], source: 'top5000' },
  { id: 'es-030', spanish_word: 'imprescindible', english_translation: 'essential / indispensable', example_sentence_spanish: 'El agua es imprescindible para la vida.', example_sentence_english: 'Water is essential for life.', word_type: 'adjective', tags: ['B1'], source: 'top5000' },
  // === Useful Expressions (A2-B1) ===
  { id: 'es-031', spanish_word: 'sin embargo', english_translation: 'however / nevertheless', example_sentence_spanish: 'Es difícil; sin embargo, no imposible.', example_sentence_english: 'It\'s difficult; however, not impossible.', word_type: 'conjunction', tags: ['connector', 'B1'], source: 'refold' },
  { id: 'es-032', spanish_word: 'en cuanto a', english_translation: 'as for / regarding', example_sentence_spanish: 'En cuanto a tu pregunta, la respuesta es sí.', example_sentence_english: 'As for your question, the answer is yes.', word_type: 'expression', tags: ['connector', 'B1'], source: 'refold' },
  { id: 'es-033', spanish_word: 'a pesar de', english_translation: 'despite / in spite of', example_sentence_spanish: 'A pesar del frío, salimos a caminar.', example_sentence_english: 'Despite the cold, we went out for a walk.', word_type: 'expression', tags: ['connector', 'B1'], source: 'refold' },
  { id: 'es-034', spanish_word: 'por lo tanto', english_translation: 'therefore', example_sentence_spanish: 'Estudié mucho, por lo tanto aprobé.', example_sentence_english: 'I studied a lot, therefore I passed.', word_type: 'expression', tags: ['connector', 'B1'], source: 'refold' },
  { id: 'es-035', spanish_word: 'darse cuenta', english_translation: 'to realize', example_sentence_spanish: 'Me di cuenta de mi error.', example_sentence_english: 'I realized my mistake.', word_type: 'expression', tags: ['reflexive', 'high-frequency'], source: 'refold' },
  { id: 'es-036', spanish_word: 'tener en cuenta', english_translation: 'to take into account / to bear in mind', example_sentence_spanish: 'Hay que tener en cuenta los costes.', example_sentence_english: 'You have to take the costs into account.', word_type: 'expression', tags: ['B1', 'professional'], source: 'refold' },
  { id: 'es-037', spanish_word: 'echar de menos', english_translation: 'to miss (someone/something)', example_sentence_spanish: 'Echo de menos a mi familia.', example_sentence_english: 'I miss my family.', word_type: 'expression', tags: ['A2', 'emotional'], source: 'refold' },
  { id: 'es-038', spanish_word: 'tener ganas de', english_translation: 'to feel like / to want to', example_sentence_spanish: 'Tengo ganas de ir al cine.', example_sentence_english: 'I feel like going to the cinema.', word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'refold' },
  { id: 'es-039', spanish_word: 'dar igual', english_translation: 'to not matter / to not care', example_sentence_spanish: 'Me da igual dónde comamos.', example_sentence_english: 'I don\'t care where we eat.', word_type: 'expression', tags: ['A2', 'colloquial'], source: 'refold' },
  { id: 'es-040', spanish_word: 'hacer falta', english_translation: 'to be necessary / to need', example_sentence_spanish: 'No hace falta que vengas.', example_sentence_english: 'There\'s no need for you to come.', word_type: 'expression', tags: ['B1', 'subjunctive'], source: 'refold' },
  // === More Verbs ===
  { id: 'es-041', spanish_word: 'comprobar', english_translation: 'to check / to verify', example_sentence_spanish: 'Voy a comprobar los datos.', example_sentence_english: 'I\'m going to check the data.', word_type: 'verb', tags: ['B1', 'professional'], source: 'top5000' },
  { id: 'es-042', spanish_word: 'exigir', english_translation: 'to demand / to require', example_sentence_spanish: 'El trabajo exige mucha dedicación.', example_sentence_english: 'The job requires a lot of dedication.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-043', spanish_word: 'caber', english_translation: 'to fit', example_sentence_spanish: 'No cabe en la maleta.', example_sentence_english: 'It doesn\'t fit in the suitcase.', word_type: 'verb', tags: ['irregular', 'A2'], source: 'conjugacion' },
  { id: 'es-044', spanish_word: 'soler', english_translation: 'to usually do / to tend to', example_sentence_spanish: 'Suelo despertarme a las siete.', example_sentence_english: 'I usually wake up at seven.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'conjugacion' },
  { id: 'es-045', spanish_word: 'elegir', english_translation: 'to choose / to select', example_sentence_spanish: 'Tienes que elegir un tema.', example_sentence_english: 'You have to choose a topic.', word_type: 'verb', tags: ['B1', 'irregular'], source: 'top5000' },
  { id: 'es-046', spanish_word: 'alcanzar', english_translation: 'to reach / to achieve', example_sentence_spanish: 'Alcanzamos nuestro objetivo.', example_sentence_english: 'We achieved our goal.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-047', spanish_word: 'surgir', english_translation: 'to arise / to emerge', example_sentence_spanish: 'Surgió un problema inesperado.', example_sentence_english: 'An unexpected problem arose.', word_type: 'verb', tags: ['B1'], source: 'top5000' },
  { id: 'es-048', spanish_word: 'agradecer', english_translation: 'to thank / to be grateful for', example_sentence_spanish: 'Le agradezco mucho su ayuda.', example_sentence_english: 'I\'m very grateful for your help.', word_type: 'verb', tags: ['B1', 'irregular'], source: 'top5000' },
  { id: 'es-049', spanish_word: 'disfrutar', english_translation: 'to enjoy', example_sentence_spanish: 'Disfruto mucho de la lectura.', example_sentence_english: 'I really enjoy reading.', word_type: 'verb', tags: ['A2'], source: 'top5000' },
  { id: 'es-050', spanish_word: 'mejorar', english_translation: 'to improve', example_sentence_spanish: 'Quiero mejorar mi español.', example_sentence_english: 'I want to improve my Spanish.', word_type: 'verb', tags: ['A2'], source: 'top5000' },
]

// ==================== IN-MEMORY FALLBACK STORAGE ====================

let fallbackCards = [...SEED_CARDS]
let fallbackProgress: Record<string, {
  ease_factor: number
  interval: number
  repetitions: number
  last_reviewed: string | null
  next_review: string | null
  status: string
}> = {}

function initFallbackProgress() {
  const today = new Date().toISOString().split('T')[0]
  for (const card of fallbackCards) {
    if (!fallbackProgress[card.id]) {
      fallbackProgress[card.id] = {
        ease_factor: 2.5,
        interval: 0,
        repetitions: 0,
        last_reviewed: null,
        next_review: today,
        status: 'new'
      }
    }
  }
}

// ==================== POSTGRES FUNCTIONS ====================

let tablesInitialized = false

async function initTables() {
  if (tablesInitialized) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS spanish_cards (
        id VARCHAR(50) PRIMARY KEY,
        spanish_word VARCHAR(255) NOT NULL,
        english_translation TEXT NOT NULL,
        example_sentence_spanish TEXT,
        example_sentence_english TEXT,
        word_type VARCHAR(50),
        tags TEXT[],
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS spanish_progress (
        card_id VARCHAR(50) PRIMARY KEY REFERENCES spanish_cards(id),
        ease_factor FLOAT DEFAULT 2.5,
        interval INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        last_reviewed TIMESTAMP,
        next_review TIMESTAMP,
        status VARCHAR(20) DEFAULT 'new'
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_sp_next_review ON spanish_progress(next_review)`
    tablesInitialized = true
  } catch (error) {
    console.error('Failed to init Spanish tables:', error)
    throw error
  }
}

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'due'
    const limit = parseInt(searchParams.get('limit') || '20')

    initFallbackProgress()

    if (action === 'due') {
      // Get cards due for review
      const today = new Date().toISOString().split('T')[0]

      if (usePostgres) {
        try {
          await initTables()
          const result = await sql`
            SELECT c.*, p.ease_factor, p.interval, p.repetitions, p.status, p.next_review, p.last_reviewed
            FROM spanish_cards c
            LEFT JOIN spanish_progress p ON c.id = p.card_id
            WHERE p.status != 'parked' AND (p.next_review IS NULL OR p.next_review::date <= ${today}::date)
            ORDER BY p.next_review ASC NULLS FIRST
            LIMIT ${limit}
          `
          return NextResponse.json({ cards: result.rows, total: result.rowCount })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      // Fallback
      const dueCards = fallbackCards
        .filter(card => {
          const progress = fallbackProgress[card.id]
          return progress && progress.status !== 'parked' && (
            !progress.next_review || progress.next_review <= today
          )
        })
        .slice(0, limit)
        .map(card => ({ ...card, ...fallbackProgress[card.id] }))

      return NextResponse.json({ cards: dueCards, total: dueCards.length })
    }

    if (action === 'progress') {
      // Get overall progress stats
      if (usePostgres) {
        try {
          await initTables()
          const stats = await sql`
            SELECT
              COUNT(*) FILTER (WHERE status = 'new') as new_count,
              COUNT(*) FILTER (WHERE status = 'learning' OR status = 'relearning') as learning_count,
              COUNT(*) FILTER (WHERE status = 'review') as review_count,
              COUNT(*) FILTER (WHERE status = 'parked') as parked_count,
              COUNT(*) as total
            FROM spanish_progress
          `
          const todayReviewed = await sql`
            SELECT COUNT(*) as count FROM spanish_progress
            WHERE last_reviewed::date = CURRENT_DATE
          `
          return NextResponse.json({
            stats: stats.rows[0],
            reviewedToday: todayReviewed.rows[0]?.count || 0
          })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      // Fallback stats
      const values = Object.values(fallbackProgress)
      const today = new Date().toISOString().split('T')[0]
      return NextResponse.json({
        stats: {
          new_count: values.filter(p => p.status === 'new').length,
          learning_count: values.filter(p => p.status === 'learning' || p.status === 'relearning').length,
          review_count: values.filter(p => p.status === 'review').length,
          parked_count: values.filter(p => p.status === 'parked').length,
          total: values.length
        },
        reviewedToday: values.filter(p => p.last_reviewed === today).length
      })
    }

    if (action === 'all') {
      // Get all cards with progress
      if (usePostgres) {
        try {
          await initTables()
          const result = await sql`
            SELECT c.*, p.ease_factor, p.interval, p.repetitions, p.status, p.next_review, p.last_reviewed
            FROM spanish_cards c
            LEFT JOIN spanish_progress p ON c.id = p.card_id
            ORDER BY c.spanish_word
          `
          return NextResponse.json({ cards: result.rows })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      return NextResponse.json({
        cards: fallbackCards.map(c => ({ ...c, ...fallbackProgress[c.id] }))
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Spanish GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    initFallbackProgress()

    if (action === 'review') {
      const { cardId, result } = body
      if (!cardId || !result) {
        return NextResponse.json({ error: 'cardId and result required' }, { status: 400 })
      }

      const progress = fallbackProgress[cardId] || { ease_factor: 2.5, interval: 0, repetitions: 0 }
      const sr = calculateNextReview(progress.ease_factor, progress.interval, progress.repetitions, result)
      const now = new Date()
      const nextReview = new Date(now.getTime() + sr.nextInterval * 86400000)

      if (usePostgres) {
        try {
          await initTables()
          await sql`
            INSERT INTO spanish_progress (card_id, ease_factor, interval, repetitions, last_reviewed, next_review, status)
            VALUES (${cardId}, ${sr.easeFactor}, ${sr.nextInterval}, ${sr.repetitions}, NOW(), ${nextReview.toISOString()}, ${sr.status})
            ON CONFLICT (card_id) DO UPDATE SET
              ease_factor = EXCLUDED.ease_factor,
              interval = EXCLUDED.interval,
              repetitions = EXCLUDED.repetitions,
              last_reviewed = EXCLUDED.last_reviewed,
              next_review = EXCLUDED.next_review,
              status = EXCLUDED.status
          `
          return NextResponse.json({ success: true, nextReview: nextReview.toISOString(), interval: sr.nextInterval })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      // Fallback
      fallbackProgress[cardId] = {
        ease_factor: sr.easeFactor,
        interval: sr.nextInterval,
        repetitions: sr.repetitions,
        last_reviewed: now.toISOString().split('T')[0],
        next_review: nextReview.toISOString().split('T')[0],
        status: sr.status
      }
      return NextResponse.json({ success: true, nextReview: nextReview.toISOString(), interval: sr.nextInterval })
    }

    if (action === 'park') {
      const { cardId } = body
      if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 })

      if (usePostgres) {
        try {
          await initTables()
          await sql`
            INSERT INTO spanish_progress (card_id, status) VALUES (${cardId}, 'parked')
            ON CONFLICT (card_id) DO UPDATE SET status = 'parked'
          `
          return NextResponse.json({ success: true, status: 'parked' })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      if (fallbackProgress[cardId]) {
        fallbackProgress[cardId].status = 'parked'
      }
      return NextResponse.json({ success: true, status: 'parked' })
    }

    if (action === 'unpark') {
      const { cardId } = body
      if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 })

      const today = new Date().toISOString().split('T')[0]
      if (usePostgres) {
        try {
          await initTables()
          await sql`
            UPDATE spanish_progress SET status = 'review', next_review = ${today} WHERE card_id = ${cardId}
          `
          return NextResponse.json({ success: true, status: 'review' })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      if (fallbackProgress[cardId]) {
        fallbackProgress[cardId].status = 'review'
        fallbackProgress[cardId].next_review = today
      }
      return NextResponse.json({ success: true, status: 'review' })
    }

    if (action === 'add') {
      const { spanish_word, english_translation, example_sentence_spanish, example_sentence_english, word_type, tags } = body
      if (!spanish_word || !english_translation) {
        return NextResponse.json({ error: 'spanish_word and english_translation required' }, { status: 400 })
      }

      const id = `es-custom-${Date.now()}`
      const card = {
        id,
        spanish_word,
        english_translation,
        example_sentence_spanish: example_sentence_spanish || '',
        example_sentence_english: example_sentence_english || '',
        word_type: word_type || 'unknown',
        tags: tags || [],
        source: 'manual'
      }

      if (usePostgres) {
        try {
          await initTables()
          await sql`
            INSERT INTO spanish_cards (id, spanish_word, english_translation, example_sentence_spanish, example_sentence_english, word_type, tags, source)
            VALUES (${id}, ${spanish_word}, ${english_translation}, ${card.example_sentence_spanish}, ${card.example_sentence_english}, ${card.word_type}, ${card.tags as any}, ${card.source})
          `
          await sql`INSERT INTO spanish_progress (card_id) VALUES (${id})`
          return NextResponse.json({ success: true, card })
        } catch (error) {
          console.error('Postgres error:', error)
        }
      }

      fallbackCards.push(card)
      fallbackProgress[id] = {
        ease_factor: 2.5, interval: 0, repetitions: 0,
        last_reviewed: null, next_review: new Date().toISOString().split('T')[0],
        status: 'new'
      }
      return NextResponse.json({ success: true, card })
    }

    // Seed cards into postgres if needed
    if (action === 'seed') {
      if (usePostgres) {
        try {
          await initTables()
          for (const card of SEED_CARDS) {
            await sql`
              INSERT INTO spanish_cards (id, spanish_word, english_translation, example_sentence_spanish, example_sentence_english, word_type, tags, source)
              VALUES (${card.id}, ${card.spanish_word}, ${card.english_translation}, ${card.example_sentence_spanish}, ${card.example_sentence_english}, ${card.word_type}, ${card.tags as any}, ${card.source})
              ON CONFLICT (id) DO NOTHING
            `
            await sql`INSERT INTO spanish_progress (card_id) VALUES (${card.id}) ON CONFLICT (card_id) DO NOTHING`
          }
          return NextResponse.json({ success: true, seeded: SEED_CARDS.length })
        } catch (error) {
          console.error('Seed error:', error)
        }
      }
      return NextResponse.json({ success: true, message: 'Using in-memory seed data' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Spanish POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
