import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

  // === A2.1 Verb Conjugation (Regular -ar/-er/-ir: present, preterite, imperfect) ===
  {
    id: 'ex-v09', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'comprar', tense: 'preterite', pronoun: 'yo', hint: 'to buy' },
    answer_key: { answer: 'compré' }, tags: ['preterite', 'regular']
  },
  {
    id: 'ex-v10', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'comer', tense: 'present', pronoun: 'tú', hint: 'to eat' },
    answer_key: { answer: 'comes' }, tags: ['present', 'regular']
  },
  {
    id: 'ex-v11', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'vivir', tense: 'present', pronoun: 'él/ella', hint: 'to live' },
    answer_key: { answer: 'vive' }, tags: ['present', 'regular']
  },
  {
    id: 'ex-v12', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'hablar', tense: 'imperfect', pronoun: 'nosotros', hint: 'to speak' },
    answer_key: { answer: 'hablábamos' }, tags: ['imperfect', 'regular']
  },
  {
    id: 'ex-v13', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'escribir', tense: 'preterite', pronoun: 'yo', hint: 'to write' },
    answer_key: { answer: 'escribí' }, tags: ['preterite', 'regular']
  },
  {
    id: 'ex-v14', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'beber', tense: 'present', pronoun: 'ellos', hint: 'to drink' },
    answer_key: { answer: 'beben' }, tags: ['present', 'regular']
  },
  {
    id: 'ex-v15', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'estudiar', tense: 'preterite', pronoun: 'tú', hint: 'to study' },
    answer_key: { answer: 'estudiaste' }, tags: ['preterite', 'regular']
  },
  {
    id: 'ex-v16', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'cocinar', tense: 'imperfect', pronoun: 'yo', hint: 'to cook' },
    answer_key: { answer: 'cocinaba' }, tags: ['imperfect', 'regular']
  },
  {
    id: 'ex-v17', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'abrir', tense: 'preterite', pronoun: 'él/ella', hint: 'to open' },
    answer_key: { answer: 'abrió' }, tags: ['preterite', 'regular']
  },
  {
    id: 'ex-v18', type: 'verb_conjugation', difficulty: 'A2',
    content: { verb: 'cerrar', tense: 'present', pronoun: 'nosotros', hint: 'to close' },
    answer_key: { answer: 'cerramos' }, tags: ['present', 'stem-change']
  },

  // === A2.1 Cloze (reflexives, gustar, present progressive) ===
  {
    id: 'ex-c07', type: 'cloze', difficulty: 'A2',
    content: { text: 'Yo ____ (levantarse) a las siete de la mañana.', hint: 'reflexive verb, present tense' },
    answer_key: { answer: 'me levanto' }, tags: ['reflexive', 'present']
  },
  {
    id: 'ex-c08', type: 'cloze', difficulty: 'A2',
    content: { text: 'Ella ____ (ducharse) después de correr.', hint: 'reflexive verb, present tense' },
    answer_key: { answer: 'se ducha' }, tags: ['reflexive', 'present']
  },
  {
    id: 'ex-c09', type: 'cloze', difficulty: 'A2',
    content: { text: 'Los niños ____ (acostarse) a las nueve.', hint: 'reflexive verb, present tense (o→ue stem change)' },
    answer_key: { answer: 'se acuestan' }, tags: ['reflexive', 'stem-change']
  },
  {
    id: 'ex-c10', type: 'cloze', difficulty: 'A2',
    content: { text: 'A mí ____ (gustar) mucho la música.', hint: 'gustar construction, singular' },
    answer_key: { answer: 'me gusta' }, tags: ['gustar', 'present']
  },
  {
    id: 'ex-c11', type: 'cloze', difficulty: 'A2',
    content: { text: 'A ellos ____ (gustar) los deportes.', hint: 'gustar construction, plural noun' },
    answer_key: { answer: 'les gustan' }, tags: ['gustar', 'present']
  },
  {
    id: 'ex-c12', type: 'cloze', difficulty: 'A2',
    content: { text: 'Ella ____ (estar + leer) un libro ahora mismo.', hint: 'present progressive (estar + gerund)' },
    answer_key: { answer: 'está leyendo' }, tags: ['progressive', 'gerund']
  },

  // === A2.1 Translation (daily life, directions, shopping, descriptions) ===
  {
    id: 'ex-t05', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'I bought a new car yesterday.', hint: 'pretérito indefinido' },
    answer_key: { answers: ['Compré un coche nuevo ayer.', 'Ayer compré un coche nuevo.'] }, tags: ['preterite']
  },
  {
    id: 'ex-t06', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'Where is the nearest pharmacy?', hint: 'question with estar' },
    answer_key: { answers: ['¿Dónde está la farmacia más cercana?', '¿Dónde queda la farmacia más cercana?'] }, tags: ['directions', 'questions']
  },
  {
    id: 'ex-t07', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'How much does this shirt cost?', hint: 'costar, present tense' },
    answer_key: { answers: ['¿Cuánto cuesta esta camisa?', '¿Cuánto vale esta camisa?'] }, tags: ['shopping', 'questions']
  },
  {
    id: 'ex-t08', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'My sister is tall and has brown hair.', hint: 'ser for descriptions, tener for hair' },
    answer_key: { answers: ['Mi hermana es alta y tiene el pelo castaño.', 'Mi hermana es alta y tiene pelo marrón.'] }, tags: ['descriptions', 'ser-estar']
  },
  {
    id: 'ex-t09', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'I usually eat lunch at two o\'clock.', hint: 'soler or normalmente + almorzar' },
    answer_key: { answers: ['Normalmente almuerzo a las dos.', 'Suelo almorzar a las dos.'] }, tags: ['daily-life', 'habits']
  },
  {
    id: 'ex-t10', type: 'translation', difficulty: 'A2',
    content: { direction: 'en-to-es', sourceText: 'Can you tell me how to get to the train station?', hint: 'poder + decir + cómo llegar' },
    answer_key: { answers: ['¿Puedes decirme cómo llegar a la estación de tren?', '¿Puede decirme cómo llegar a la estación de tren?'] }, tags: ['directions', 'polite']
  },

  // === A2.1 Grammar Quiz (ser/estar, object pronouns, por/para, preterite vs imperfect) ===
  {
    id: 'ex-g06', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'ser-vs-estar',
      question: 'Ella ____ contenta hoy.',
      options: ['es', 'está', 'son', 'están'],
      explanation: '"Estar" is used for temporary emotions and states. She is happy today (a temporary feeling).'
    },
    answer_key: { correct: 1 }, tags: ['ser-estar']
  },
  {
    id: 'ex-g07', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'ser-vs-estar',
      question: 'La fiesta ____ en mi casa.',
      options: ['es', 'está', 'son', 'están'],
      explanation: '"Ser" is used for the location of events. "Estar" is for physical location of objects/people, but events use "ser".'
    },
    answer_key: { correct: 0 }, tags: ['ser-estar']
  },
  {
    id: 'ex-g08', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'object-pronouns',
      question: 'Yo ____ doy el regalo a María.',
      options: ['la', 'lo', 'le', 'les'],
      explanation: '"Le" is the indirect object pronoun for "a María" (to her). Indirect object pronouns indicate to whom something is given.'
    },
    answer_key: { correct: 2 }, tags: ['object-pronouns']
  },
  {
    id: 'ex-g09', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'por-vs-para',
      question: 'Estudio español ____ mi trabajo.',
      options: ['por', 'para', 'de', 'en'],
      explanation: '"Para" is used to express purpose or goal. Studying Spanish for (the purpose of) my job.'
    },
    answer_key: { correct: 1 }, tags: ['por-para']
  },
  {
    id: 'ex-g10', type: 'grammar', difficulty: 'A2',
    content: {
      topic: 'preterite-vs-imperfect',
      question: 'Cuando era niño, ____ al parque todos los días.',
      options: ['fui', 'iba', 'voy', 'iré'],
      explanation: 'The imperfect tense "iba" is used for habitual or repeated actions in the past (used to go every day).'
    },
    answer_key: { correct: 1 }, tags: ['preterite-imperfect']
  },

  // === A2.1 Writing Prompts ===
  {
    id: 'ex-w03', type: 'writing', difficulty: 'A2',
    content: {
      prompt: 'Describe tu casa o apartamento. ¿Cuántas habitaciones tiene? ¿Cómo es tu habitación favorita?',
      minWords: 20,
      suggestedVocabulary: ['habitación', 'cocina', 'baño', 'salón', 'grande', 'pequeño', 'ventana', 'muebles'],
      exampleAnswer: 'Vivo en un apartamento pequeño. Tiene dos habitaciones, una cocina y un baño. Mi habitación favorita es el salón porque tiene una ventana grande y mucha luz.'
    },
    answer_key: { type: 'open' }, tags: ['descriptions', 'house']
  },
  {
    id: 'ex-w04', type: 'writing', difficulty: 'A2',
    content: {
      prompt: 'Describe a tu mejor amigo o amiga. ¿Cómo es físicamente? ¿Cómo es su personalidad?',
      minWords: 20,
      suggestedVocabulary: ['alto', 'bajo', 'pelo', 'ojos', 'simpático', 'divertido', 'amable', 'inteligente'],
      exampleAnswer: 'Mi mejor amiga se llama Laura. Es alta y tiene el pelo largo y castaño. Tiene los ojos verdes. Es muy simpática y divertida. Siempre me hace reír.'
    },
    answer_key: { type: 'open' }, tags: ['descriptions', 'people']
  },
  {
    id: 'ex-w05', type: 'writing', difficulty: 'A2',
    content: {
      prompt: '¿Qué hiciste el fin de semana pasado? Escribe sobre tus actividades usando el pretérito.',
      minWords: 20,
      suggestedVocabulary: ['sábado', 'domingo', 'salir', 'comer', 'ver', 'jugar', 'descansar', 'pasear'],
      exampleAnswer: 'El sábado salí con mis amigos. Comimos en un restaurante italiano y después vimos una película. El domingo descansé en casa y paseé por el parque.'
    },
    answer_key: { type: 'open' }, tags: ['preterite', 'weekend']
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
