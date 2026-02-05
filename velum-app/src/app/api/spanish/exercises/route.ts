import { NextRequest, NextResponse } from 'next/server'

// ==================== EXERCISE SEED DATA ====================

interface Exercise {
  id: string
  type: 'verb_conjugation' | 'cloze' | 'translation' | 'grammar' | 'writing'
  difficulty: string
  content: any
  answer_key: any
  tags: string[]
}

const SEED_EXERCISES: Exercise[] = [
  // === Verb Conjugation ===
  {
    id: 'ex-v01', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'tener', tense: 'present', pronoun: 'yo', hint: 'to have' },
    answer_key: { answer: 'tengo' }, tags: ['present', 'irregular']
  },
  {
    id: 'ex-v02', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'poder', tense: 'present', pronoun: 'nosotros', hint: 'to be able to' },
    answer_key: { answer: 'podemos' }, tags: ['present', 'stem-change']
  },
  {
    id: 'ex-v03', type: 'verb_conjugation', difficulty: 'B1',
    content: { verb: 'hacer', tense: 'preterite', pronoun: 'él/ella', hint: 'to do/make' },
    answer_key: { answer: 'hizo' }, tags: ['preterite', 'irregular']
  },
  {
    id: 'ex-v04', type: 'verb_conjugation', difficulty: 'B1',
    content: { verb: 'ir', tense: 'imperfect', pronoun: 'yo', hint: 'to go' },
    answer_key: { answer: 'iba' }, tags: ['imperfect', 'irregular']
  },
  {
    id: 'ex-v05', type: 'verb_conjugation', difficulty: 'B1',
    content: { verb: 'saber', tense: 'preterite', pronoun: 'yo', hint: 'to know' },
    answer_key: { answer: 'supe' }, tags: ['preterite', 'irregular']
  },
  {
    id: 'ex-v06', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'querer', tense: 'present', pronoun: 'tú', hint: 'to want' },
    answer_key: { answer: 'quieres' }, tags: ['present', 'stem-change']
  },
  {
    id: 'ex-v07', type: 'verb_conjugation', difficulty: 'B1',
    content: { verb: 'decir', tense: 'preterite', pronoun: 'ellos', hint: 'to say/tell' },
    answer_key: { answer: 'dijeron' }, tags: ['preterite', 'irregular']
  },
  {
    id: 'ex-v08', type: 'verb_conjugation', difficulty: 'B1',
    content: { verb: 'poner', tense: 'present', pronoun: 'yo', hint: 'to put' },
    answer_key: { answer: 'pongo' }, tags: ['present', 'irregular']
  },

  // === Cloze Exercises ===
  {
    id: 'ex-c01', type: 'cloze', difficulty: 'A2',
    content: { text: 'María ____ (ir) al mercado ayer.', hint: 'preterite tense' },
    answer_key: { answer: 'fue' }, tags: ['preterite', 'irregular']
  },
  {
    id: 'ex-c02', type: 'cloze', difficulty: 'A2',
    content: { text: 'Nosotros ____ (tener) mucho trabajo la semana pasada.', hint: 'preterite tense' },
    answer_key: { answer: 'tuvimos' }, tags: ['preterite', 'irregular']
  },
  {
    id: 'ex-c03', type: 'cloze', difficulty: 'B1',
    content: { text: 'Espero que tú ____ (venir) a la fiesta.', hint: 'subjunctive present' },
    answer_key: { answer: 'vengas' }, tags: ['subjunctive', 'irregular']
  },
  {
    id: 'ex-c04', type: 'cloze', difficulty: 'B1',
    content: { text: 'Si yo ____ (ser) tú, no lo haría.', hint: 'imperfect subjunctive' },
    answer_key: { answer: 'fuera' }, tags: ['subjunctive', 'conditional']
  },
  {
    id: 'ex-c05', type: 'cloze', difficulty: 'A2',
    content: { text: 'El libro ____ (estar) encima de la mesa.', hint: 'present tense, location' },
    answer_key: { answer: 'está' }, tags: ['ser-estar', 'present']
  },
  {
    id: 'ex-c06', type: 'cloze', difficulty: 'B1',
    content: { text: 'Cuando era niño, ____ (jugar) en el parque todos los días.', hint: 'imperfect tense - habitual action' },
    answer_key: { answer: 'jugaba' }, tags: ['imperfect', 'habitual']
  },

  // === Translation Exercises ===
  {
    id: 'ex-t01', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'I need to go to the store.', hint: 'necesitar + ir' },
    answer_key: { answers: ['Necesito ir a la tienda.', 'Tengo que ir a la tienda.'] }, tags: ['basic']
  },
  {
    id: 'ex-t02', type: 'translation', difficulty: 'B1',
    content: { direction: 'en-to-es', sourceText: 'If I had more time, I would travel more.', hint: 'si + imperfect subjunctive + conditional' },
    answer_key: { answers: ['Si tuviera más tiempo, viajaría más.', 'Si tuviese más tiempo, viajaría más.'] }, tags: ['conditional', 'subjunctive']
  },
  {
    id: 'ex-t03', type: 'translation', difficulty: 'A2',
    content: { direction: 'es-to-en', sourceText: '¿Podrías ayudarme con esto?', hint: 'polite request' },
    answer_key: { answers: ['Could you help me with this?', 'Would you be able to help me with this?'] }, tags: ['polite', 'conditional']
  },
  {
    id: 'ex-t04', type: 'translation', difficulty: 'B1',
    content: { direction: 'en-to-es', sourceText: 'Despite being tired, she kept working.', hint: 'a pesar de + infinitive/gerund' },
    answer_key: { answers: ['A pesar de estar cansada, siguió trabajando.', 'A pesar de estar cansada, continuó trabajando.'] }, tags: ['connector', 'gerund']
  },

  // === Grammar Quiz ===
  {
    id: 'ex-g01', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'ser-vs-estar',
      question: 'La sopa ____ caliente.',
      options: ['es', 'está', 'ser', 'estar'],
      explanation: 'Use "estar" for temporary states and conditions (the soup is hot right now).'
    },
    answer_key: { correct: 1 }, tags: ['ser-estar']
  },
  {
    id: 'ex-g02', type: 'grammar', difficulty: 'B1',
    content: {
      topic: 'por-vs-para',
      question: 'Este regalo es ____ ti.',
      options: ['por', 'para', 'de', 'a'],
      explanation: '"Para" is used to indicate the recipient of something.'
    },
    answer_key: { correct: 1 }, tags: ['por-para']
  },
  {
    id: 'ex-g03', type: 'grammar', difficulty: 'B1',
    content: {
      topic: 'subjunctive',
      question: 'No creo que él ____ la verdad.',
      options: ['sabe', 'sepa', 'saber', 'sabía'],
      explanation: 'After "no creo que" (doubt), use the subjunctive: sepa.'
    },
    answer_key: { correct: 1 }, tags: ['subjunctive']
  },
  {
    id: 'ex-g04', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'ser-vs-estar',
      question: 'Mi hermano ____ médico.',
      options: ['es', 'está', 'ser', 'estar'],
      explanation: 'Use "ser" for professions and inherent characteristics.'
    },
    answer_key: { correct: 0 }, tags: ['ser-estar']
  },
  {
    id: 'ex-g05', type: 'grammar', difficulty: 'B1',
    content: {
      topic: 'por-vs-para',
      question: 'Viajamos ____ toda España.',
      options: ['para', 'por', 'en', 'a'],
      explanation: '"Por" is used for movement through or around a place.'
    },
    answer_key: { correct: 1 }, tags: ['por-para']
  },

  // === Writing Prompts ===
  {
    id: 'ex-w01', type: 'writing', difficulty: 'A2',
    content: {
      prompt: 'Describe tu rutina matutina en 3-4 frases.',
      minWords: 20,
      suggestedVocabulary: ['despertarse', 'ducharse', 'desayunar', 'vestirse', 'salir'],
      exampleAnswer: 'Me despierto a las siete. Después me ducho y me visto. Desayuno café con tostadas. Salgo de casa a las ocho.'
    },
    answer_key: { type: 'open' }, tags: ['routine', 'reflexive-verbs']
  },
  {
    id: 'ex-w02', type: 'writing', difficulty: 'B1',
    content: {
      prompt: 'Escribe sobre un viaje que hiciste. Usa el pretérito y el imperfecto.',
      minWords: 40,
      suggestedVocabulary: ['viajar', 'visitar', 'disfrutar', 'conocer', 'recomendar', 'mientras', 'cuando'],
      exampleAnswer: 'El verano pasado viajé a Barcelona. Hacía mucho calor pero disfruté mucho. Visité la Sagrada Familia y comí paella cerca de la playa.'
    },
    answer_key: { type: 'open' }, tags: ['past-tenses', 'travel']
  },
]

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily'
    const difficulty = searchParams.get('difficulty') || 'A2'

    if (type === 'daily') {
      // Generate a balanced daily exercise mix
      const verbDrills = SEED_EXERCISES.filter(e => e.type === 'verb_conjugation').sort(() => Math.random() - 0.5).slice(0, 3)
      const cloze = SEED_EXERCISES.filter(e => e.type === 'cloze').sort(() => Math.random() - 0.5).slice(0, 2)
      const translations = SEED_EXERCISES.filter(e => e.type === 'translation').sort(() => Math.random() - 0.5).slice(0, 2)
      const grammar = SEED_EXERCISES.filter(e => e.type === 'grammar').sort(() => Math.random() - 0.5).slice(0, 2)
      const writing = SEED_EXERCISES.filter(e => e.type === 'writing').sort(() => Math.random() - 0.5).slice(0, 1)

      return NextResponse.json({
        exercises: [...verbDrills, ...cloze, ...translations, ...grammar, ...writing],
        counts: {
          verb_conjugation: verbDrills.length,
          cloze: cloze.length,
          translation: translations.length,
          grammar: grammar.length,
          writing: writing.length
        }
      })
    }

    if (type === 'by_type') {
      const exerciseType = searchParams.get('exerciseType')
      const filtered = exerciseType
        ? SEED_EXERCISES.filter(e => e.type === exerciseType)
        : SEED_EXERCISES
      return NextResponse.json({ exercises: filtered })
    }

    return NextResponse.json({ exercises: SEED_EXERCISES })
  } catch (error) {
    console.error('Exercises GET error:', error)
    return NextResponse.json({ error: 'Failed to load exercises' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { exerciseId, answer } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    const exercise = SEED_EXERCISES.find(e => e.id === exerciseId)
    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Check answer
    let correct = false
    let feedback = ''

    switch (exercise.type) {
      case 'verb_conjugation':
      case 'cloze':
        correct = answer?.toLowerCase().trim() === exercise.answer_key.answer.toLowerCase()
        feedback = correct ? 'Correct!' : `The answer is: ${exercise.answer_key.answer}`
        break

      case 'grammar':
        correct = parseInt(answer) === exercise.answer_key.correct
        feedback = correct ? 'Correct!' : exercise.content.explanation
        break

      case 'translation':
        correct = exercise.answer_key.answers.some(
          (a: string) => a.toLowerCase().trim() === answer?.toLowerCase().trim()
        )
        feedback = correct ? 'Correct!' : `Acceptable answers: ${exercise.answer_key.answers.join(' / ')}`
        break

      case 'writing':
        // Writing exercises are open-ended
        const wordCount = (answer || '').split(/\s+/).filter(Boolean).length
        correct = wordCount >= (exercise.content.minWords || 10)
        feedback = correct
          ? `Good work! (${wordCount} words). Example: ${exercise.content.exampleAnswer}`
          : `Try writing at least ${exercise.content.minWords} words. You wrote ${wordCount}.`
        break
    }

    return NextResponse.json({ correct, feedback, exerciseId })
  } catch (error) {
    console.error('Exercise submit error:', error)
    return NextResponse.json({ error: 'Failed to check answer' }, { status: 500 })
  }
}
