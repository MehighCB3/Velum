import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

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
  // === Essential Verbs (A2) ===
  { id: 'es-051', spanish_word: 'comprar', english_translation: 'to buy', example_sentence_spanish: 'Quiero comprar un regalo para mi madre.', example_sentence_english: 'I want to buy a gift for my mother.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-052', spanish_word: 'vender', english_translation: 'to sell', example_sentence_spanish: 'Mi vecino quiere vender su coche.', example_sentence_english: 'My neighbor wants to sell his car.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-053', spanish_word: 'buscar', english_translation: 'to look for / to search', example_sentence_spanish: 'Estoy buscando mis llaves, no sé dónde están.', example_sentence_english: "I'm looking for my keys, I don't know where they are.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-054', spanish_word: 'encontrar', english_translation: 'to find', example_sentence_spanish: 'Por fin encontré un apartamento cerca del centro.', example_sentence_english: 'I finally found an apartment near the center.', word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-055', spanish_word: 'esperar', english_translation: 'to wait / to hope', example_sentence_spanish: 'Espero que llegues pronto, te estamos esperando.', example_sentence_english: 'I hope you arrive soon, we are waiting for you.', word_type: 'verb', tags: ['A2', 'high-frequency', 'multiple-meanings'], source: 'a2-frequency' },
  { id: 'es-056', spanish_word: 'creer', english_translation: 'to believe / to think', example_sentence_spanish: 'No creo que sea una buena idea.', example_sentence_english: "I don't think it's a good idea.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-057', spanish_word: 'sentir', english_translation: 'to feel', example_sentence_spanish: 'Me siento mucho mejor después de descansar.', example_sentence_english: 'I feel much better after resting.', word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-058', spanish_word: 'pedir', english_translation: 'to ask for / to order', example_sentence_spanish: 'Voy a pedir una ensalada y un agua.', example_sentence_english: 'I am going to order a salad and a water.', word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-059', spanish_word: 'llevar', english_translation: 'to carry / to wear / to take', example_sentence_spanish: '¿Puedes llevar estas bolsas al coche?', example_sentence_english: 'Can you carry these bags to the car?', word_type: 'verb', tags: ['A2', 'high-frequency', 'multiple-meanings'], source: 'a2-frequency' },
  { id: 'es-060', spanish_word: 'traer', english_translation: 'to bring', example_sentence_spanish: '¿Puedes traer pan cuando vuelvas a casa?', example_sentence_english: 'Can you bring bread when you come back home?', word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-061', spanish_word: 'empezar', english_translation: 'to begin / to start', example_sentence_spanish: 'La clase empieza a las nueve de la mañana.', example_sentence_english: 'The class starts at nine in the morning.', word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-062', spanish_word: 'comenzar', english_translation: 'to begin / to start', example_sentence_spanish: 'Vamos a comenzar la reunión sin él.', example_sentence_english: "Let's start the meeting without him.", word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-063', spanish_word: 'terminar', english_translation: 'to finish / to end', example_sentence_spanish: 'Todavía no he terminado de leer este libro.', example_sentence_english: "I still haven't finished reading this book.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-064', spanish_word: 'abrir', english_translation: 'to open', example_sentence_spanish: '¿Puedes abrir la ventana? Hace mucho calor.', example_sentence_english: "Can you open the window? It's very hot.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-065', spanish_word: 'cerrar', english_translation: 'to close', example_sentence_spanish: 'No olvides cerrar la puerta con llave.', example_sentence_english: "Don't forget to lock the door.", word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-066', spanish_word: 'cambiar', english_translation: 'to change', example_sentence_spanish: 'Quiero cambiar la hora de la cita.', example_sentence_english: 'I want to change the time of the appointment.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-067', spanish_word: 'preguntar', english_translation: 'to ask (a question)', example_sentence_spanish: 'Voy a preguntar al profesor si hay examen mañana.', example_sentence_english: "I'm going to ask the teacher if there's an exam tomorrow.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-068', spanish_word: 'responder', english_translation: 'to answer / to reply', example_sentence_spanish: 'Todavía no ha respondido a mi mensaje.', example_sentence_english: 'He still has not replied to my message.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-069', spanish_word: 'enviar', english_translation: 'to send', example_sentence_spanish: 'Te envío el documento por correo electrónico.', example_sentence_english: "I'll send you the document by email.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-070', spanish_word: 'recibir', english_translation: 'to receive', example_sentence_spanish: '¿Has recibido mi mensaje de ayer?', example_sentence_english: 'Did you receive my message from yesterday?', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-071', spanish_word: 'recordar', english_translation: 'to remember', example_sentence_spanish: 'No recuerdo dónde dejé el paraguas.', example_sentence_english: "I don't remember where I left the umbrella.", word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-072', spanish_word: 'olvidar', english_translation: 'to forget', example_sentence_spanish: 'Olvidé comprar leche en el supermercado.', example_sentence_english: 'I forgot to buy milk at the supermarket.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-073', spanish_word: 'entender', english_translation: 'to understand', example_sentence_spanish: 'No entiendo esta palabra, ¿qué significa?', example_sentence_english: "I don't understand this word, what does it mean?", word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-074', spanish_word: 'explicar', english_translation: 'to explain', example_sentence_spanish: '¿Me puedes explicar cómo llegar al museo?', example_sentence_english: 'Can you explain to me how to get to the museum?', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-075', spanish_word: 'intentar', english_translation: 'to try / to attempt', example_sentence_spanish: 'Voy a intentar cocinar algo nuevo esta noche.', example_sentence_english: "I'm going to try to cook something new tonight.", word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-076', spanish_word: 'ganar', english_translation: 'to win / to earn', example_sentence_spanish: 'Mi equipo ganó el partido ayer.', example_sentence_english: 'My team won the match yesterday.', word_type: 'verb', tags: ['A2', 'high-frequency', 'multiple-meanings'], source: 'a2-frequency' },
  { id: 'es-077', spanish_word: 'perder', english_translation: 'to lose', example_sentence_spanish: 'He perdido mi cartera, no la encuentro.', example_sentence_english: "I've lost my wallet, I can't find it.", word_type: 'verb', tags: ['A2', 'high-frequency', 'irregular'], source: 'a2-frequency' },
  { id: 'es-078', spanish_word: 'cocinar', english_translation: 'to cook', example_sentence_spanish: 'Mi madre cocina muy bien la paella.', example_sentence_english: 'My mother cooks paella very well.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-079', spanish_word: 'limpiar', english_translation: 'to clean', example_sentence_spanish: 'Tengo que limpiar la casa antes de que lleguen los invitados.', example_sentence_english: 'I have to clean the house before the guests arrive.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-080', spanish_word: 'necesitar', english_translation: 'to need', example_sentence_spanish: 'Necesito hablar contigo sobre algo importante.', example_sentence_english: 'I need to talk to you about something important.', word_type: 'verb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  // === Everyday Nouns (A2) ===
  { id: 'es-081', spanish_word: 'cocina', english_translation: 'kitchen', example_sentence_spanish: 'Estoy preparando la cena en la cocina.', example_sentence_english: "I'm preparing dinner in the kitchen.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-082', spanish_word: 'habitación', english_translation: 'room / bedroom', example_sentence_spanish: 'Mi habitación tiene una ventana grande.', example_sentence_english: 'My room has a big window.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-083', spanish_word: 'calle', english_translation: 'street', example_sentence_spanish: 'Vivo en una calle muy tranquila.', example_sentence_english: 'I live on a very quiet street.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-084', spanish_word: 'barrio', english_translation: 'neighborhood', example_sentence_spanish: 'Me gusta mucho mi barrio, es muy seguro.', example_sentence_english: "I really like my neighborhood, it's very safe.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-085', spanish_word: 'estación', english_translation: 'station / season', example_sentence_spanish: 'La estación de tren está a cinco minutos andando.', example_sentence_english: 'The train station is a five-minute walk away.', word_type: 'noun', tags: ['A2', 'high-frequency', 'multiple-meanings'], source: 'a2-frequency' },
  { id: 'es-086', spanish_word: 'aeropuerto', english_translation: 'airport', example_sentence_spanish: 'Tenemos que llegar al aeropuerto dos horas antes.', example_sentence_english: 'We have to arrive at the airport two hours early.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-087', spanish_word: 'hospital', english_translation: 'hospital', example_sentence_spanish: 'Mi tía trabaja como enfermera en el hospital.', example_sentence_english: 'My aunt works as a nurse at the hospital.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-088', spanish_word: 'restaurante', english_translation: 'restaurant', example_sentence_spanish: 'Conocemos un restaurante italiano muy bueno.', example_sentence_english: 'We know a very good Italian restaurant.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-089', spanish_word: 'supermercado', english_translation: 'supermarket', example_sentence_spanish: 'Voy al supermercado a comprar fruta y verdura.', example_sentence_english: "I'm going to the supermarket to buy fruit and vegetables.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-090', spanish_word: 'oficina', english_translation: 'office', example_sentence_spanish: 'Trabajo en una oficina en el centro de la ciudad.', example_sentence_english: 'I work in an office in the city center.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-091', spanish_word: 'reunión', english_translation: 'meeting', example_sentence_spanish: 'Tengo una reunión con mi jefe a las tres.', example_sentence_english: 'I have a meeting with my boss at three.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-092', spanish_word: 'problema', english_translation: 'problem', example_sentence_spanish: 'No te preocupes, no es un problema grave.', example_sentence_english: "Don't worry, it's not a serious problem.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-093', spanish_word: 'solución', english_translation: 'solution', example_sentence_spanish: 'Tenemos que encontrar una solución rápida.', example_sentence_english: 'We have to find a quick solution.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-094', spanish_word: 'consejo', english_translation: 'advice', example_sentence_spanish: '¿Me puedes dar un consejo sobre este tema?', example_sentence_english: 'Can you give me some advice about this topic?', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-095', spanish_word: 'pregunta', english_translation: 'question', example_sentence_spanish: 'Tengo una pregunta sobre la tarea de mañana.', example_sentence_english: "I have a question about tomorrow's homework.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-096', spanish_word: 'respuesta', english_translation: 'answer / reply', example_sentence_spanish: 'Todavía estoy esperando tu respuesta.', example_sentence_english: "I'm still waiting for your reply.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-097', spanish_word: 'viaje', english_translation: 'trip / journey', example_sentence_spanish: 'Estamos planeando un viaje a México en verano.', example_sentence_english: "We're planning a trip to Mexico in summer.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-098', spanish_word: 'vacaciones', english_translation: 'vacation / holidays', example_sentence_spanish: '¿Adónde vas de vacaciones este año?', example_sentence_english: 'Where are you going on vacation this year?', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-099', spanish_word: 'fiesta', english_translation: 'party / celebration', example_sentence_spanish: 'Vamos a organizar una fiesta de cumpleaños.', example_sentence_english: "We're going to organize a birthday party.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-100', spanish_word: 'película', english_translation: 'movie / film', example_sentence_spanish: '¿Quieres ver una película esta noche?', example_sentence_english: 'Do you want to watch a movie tonight?', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-101', spanish_word: 'canción', english_translation: 'song', example_sentence_spanish: 'Esta canción me recuerda a mi infancia.', example_sentence_english: 'This song reminds me of my childhood.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-102', spanish_word: 'idea', english_translation: 'idea', example_sentence_spanish: 'Tengo una idea para el proyecto del grupo.', example_sentence_english: 'I have an idea for the group project.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-103', spanish_word: 'opinión', english_translation: 'opinion', example_sentence_spanish: 'En mi opinión, deberíamos esperar un poco más.', example_sentence_english: 'In my opinion, we should wait a little longer.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-104', spanish_word: 'salud', english_translation: 'health', example_sentence_spanish: 'La salud es más importante que el dinero.', example_sentence_english: 'Health is more important than money.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-105', spanish_word: 'costumbre', english_translation: 'custom / habit', example_sentence_spanish: 'En España es costumbre cenar tarde.', example_sentence_english: 'In Spain it is customary to eat dinner late.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  // === People & Relationships (A2) ===
  { id: 'es-106', spanish_word: 'vecino', english_translation: 'neighbor', example_sentence_spanish: 'Mi vecino es muy amable, siempre me saluda.', example_sentence_english: 'My neighbor is very kind, he always greets me.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-107', spanish_word: 'jefe', english_translation: 'boss', example_sentence_spanish: 'Mi jefe me dijo que puedo salir antes hoy.', example_sentence_english: 'My boss told me I can leave early today.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-108', spanish_word: 'compañero', english_translation: 'colleague / companion / classmate', example_sentence_spanish: 'Mi compañero de trabajo me ayudó con el informe.', example_sentence_english: 'My colleague helped me with the report.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-109', spanish_word: 'amigo', english_translation: 'friend', example_sentence_spanish: 'Voy a salir con unos amigos esta noche.', example_sentence_english: "I'm going out with some friends tonight.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-110', spanish_word: 'pareja', english_translation: 'partner / couple', example_sentence_spanish: 'Mi pareja y yo llevamos juntos cinco años.', example_sentence_english: 'My partner and I have been together for five years.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-111', spanish_word: 'cliente', english_translation: 'client / customer', example_sentence_spanish: 'El cliente quiere hablar con el encargado.', example_sentence_english: 'The customer wants to speak with the manager.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-112', spanish_word: 'empleado', english_translation: 'employee', example_sentence_spanish: 'La empresa tiene más de cien empleados.', example_sentence_english: 'The company has more than a hundred employees.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-113', spanish_word: 'invitado', english_translation: 'guest', example_sentence_spanish: 'Esperamos veinte invitados para la cena.', example_sentence_english: 'We are expecting twenty guests for dinner.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-114', spanish_word: 'profesor', english_translation: 'teacher / professor', example_sentence_spanish: 'La profesora de español explica muy bien.', example_sentence_english: 'The Spanish teacher explains very well.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-115', spanish_word: 'estudiante', english_translation: 'student', example_sentence_spanish: 'Soy estudiante de medicina en la universidad.', example_sentence_english: "I'm a medical student at the university.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-116', spanish_word: 'hijo', english_translation: 'son / child', example_sentence_spanish: 'Mi hijo tiene ocho años y le encanta el fútbol.', example_sentence_english: 'My son is eight years old and loves soccer.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-117', spanish_word: 'abuelo', english_translation: 'grandfather / grandparent', example_sentence_spanish: 'Mis abuelos viven en un pueblo pequeño.', example_sentence_english: 'My grandparents live in a small town.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-118', spanish_word: 'primo', english_translation: 'cousin', example_sentence_spanish: 'Mi prima viene a visitarnos este fin de semana.', example_sentence_english: 'My cousin is coming to visit us this weekend.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-119', spanish_word: 'sobrino', english_translation: 'nephew / niece', example_sentence_spanish: 'Mi sobrina acaba de empezar el colegio.', example_sentence_english: 'My niece just started school.', word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-120', spanish_word: 'cuñado', english_translation: 'brother-in-law / sister-in-law', example_sentence_spanish: 'Mi cuñada es la hermana de mi marido.', example_sentence_english: "My sister-in-law is my husband's sister.", word_type: 'noun', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  // === Adjectives (A2) ===
  { id: 'es-121', spanish_word: 'barato', english_translation: 'cheap / inexpensive', example_sentence_spanish: 'Este restaurante es bueno y bastante barato.', example_sentence_english: 'This restaurant is good and quite cheap.', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-122', spanish_word: 'caro', english_translation: 'expensive', example_sentence_spanish: 'El alquiler en esta ciudad es muy caro.', example_sentence_english: 'The rent in this city is very expensive.', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-123', spanish_word: 'ocupado', english_translation: 'busy / occupied', example_sentence_spanish: 'Lo siento, estoy muy ocupado esta semana.', example_sentence_english: "I'm sorry, I'm very busy this week.", word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-124', spanish_word: 'libre', english_translation: 'free / available', example_sentence_spanish: '¿Estás libre el sábado por la tarde?', example_sentence_english: 'Are you free on Saturday afternoon?', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-125', spanish_word: 'sencillo', english_translation: 'simple / easy', example_sentence_spanish: 'La receta es muy sencilla, solo necesitas tres ingredientes.', example_sentence_english: 'The recipe is very simple, you only need three ingredients.', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-126', spanish_word: 'complicado', english_translation: 'complicated / difficult', example_sentence_spanish: 'La situación es más complicada de lo que parece.', example_sentence_english: 'The situation is more complicated than it seems.', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-127', spanish_word: 'seguro', english_translation: 'safe / sure / certain', example_sentence_spanish: 'Estoy seguro de que todo va a salir bien.', example_sentence_english: "I'm sure everything is going to turn out fine.", word_type: 'adjective', tags: ['A2', 'high-frequency', 'multiple-meanings'], source: 'a2-frequency' },
  { id: 'es-128', spanish_word: 'peligroso', english_translation: 'dangerous', example_sentence_spanish: 'Es peligroso conducir con tanta lluvia.', example_sentence_english: "It's dangerous to drive in so much rain.", word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-129', spanish_word: 'tranquilo', english_translation: 'calm / quiet / peaceful', example_sentence_spanish: 'Me gusta vivir en un lugar tranquilo.', example_sentence_english: 'I like living in a quiet place.', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-130', spanish_word: 'ruidoso', english_translation: 'noisy / loud', example_sentence_spanish: 'La calle es muy ruidosa por la noche.', example_sentence_english: 'The street is very noisy at night.', word_type: 'adjective', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  // === Adverbs & Time Words (A2) ===
  { id: 'es-131', spanish_word: 'todavía', english_translation: 'still / yet', example_sentence_spanish: 'Todavía no he desayunado, tengo mucha hambre.', example_sentence_english: "I haven't had breakfast yet, I'm very hungry.", word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-132', spanish_word: 'ya', english_translation: 'already / now', example_sentence_spanish: 'Ya he terminado la tarea, puedo salir.', example_sentence_english: "I've already finished the homework, I can go out.", word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-133', spanish_word: 'casi', english_translation: 'almost / nearly', example_sentence_spanish: 'Casi pierdo el autobús esta mañana.', example_sentence_english: 'I almost missed the bus this morning.', word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-134', spanish_word: 'bastante', english_translation: 'quite / enough / fairly', example_sentence_spanish: 'La película fue bastante interesante.', example_sentence_english: 'The movie was quite interesting.', word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-135', spanish_word: 'demasiado', english_translation: 'too much / too many', example_sentence_spanish: 'Has puesto demasiada sal en la sopa.', example_sentence_english: "You've put too much salt in the soup.", word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-136', spanish_word: 'apenas', english_translation: 'barely / hardly / just', example_sentence_spanish: 'Apenas tengo tiempo para descansar últimamente.', example_sentence_english: 'I barely have time to rest lately.', word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-137', spanish_word: 'enseguida', english_translation: 'right away / immediately', example_sentence_spanish: 'Espera un momento, vuelvo enseguida.', example_sentence_english: "Wait a moment, I'll be right back.", word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-138', spanish_word: 'mientras', english_translation: 'while / meanwhile', example_sentence_spanish: 'Puedes ver la tele mientras yo cocino.', example_sentence_english: 'You can watch TV while I cook.', word_type: 'adverb', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-139', spanish_word: 'desde', english_translation: 'since / from', example_sentence_spanish: 'Vivo en esta ciudad desde hace tres años.', example_sentence_english: "I've been living in this city for three years.", word_type: 'preposition', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-140', spanish_word: 'hasta', english_translation: 'until / up to', example_sentence_spanish: 'La tienda está abierta hasta las nueve.', example_sentence_english: 'The store is open until nine.', word_type: 'preposition', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  // === A2 Expressions & Phrases ===
  { id: 'es-141', spanish_word: 'estar de acuerdo', english_translation: 'to agree', example_sentence_spanish: 'Estoy de acuerdo contigo, es la mejor opción.', example_sentence_english: 'I agree with you, it is the best option.', word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-142', spanish_word: 'tener razón', english_translation: 'to be right', example_sentence_spanish: 'Tienes razón, deberíamos salir más temprano.', example_sentence_english: 'You are right, we should leave earlier.', word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-143', spanish_word: 'valer la pena', english_translation: 'to be worth it', example_sentence_spanish: 'Este museo vale la pena, las obras son increíbles.', example_sentence_english: 'This museum is worth it, the works are incredible.', word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-144', spanish_word: 'pasarlo bien', english_translation: 'to have a good time', example_sentence_spanish: 'Lo pasamos muy bien en la fiesta de anoche.', example_sentence_english: 'We had a great time at last night\'s party.', word_type: 'expression', tags: ['A2', 'high-frequency', 'colloquial'], source: 'a2-frequency' },
  { id: 'es-145', spanish_word: 'llevarse bien', english_translation: 'to get along well', example_sentence_spanish: 'Me llevo muy bien con mis compañeros de clase.', example_sentence_english: 'I get along very well with my classmates.', word_type: 'expression', tags: ['A2', 'high-frequency', 'reflexive'], source: 'a2-frequency' },
  { id: 'es-146', spanish_word: 'ponerse de acuerdo', english_translation: 'to come to an agreement', example_sentence_spanish: 'No nos podemos poner de acuerdo sobre el restaurante.', example_sentence_english: 'We cannot agree on the restaurant.', word_type: 'expression', tags: ['A2', 'high-frequency', 'reflexive'], source: 'a2-frequency' },
  { id: 'es-147', spanish_word: 'tener prisa', english_translation: 'to be in a hurry', example_sentence_spanish: 'Tengo prisa, mi vuelo sale en dos horas.', example_sentence_english: "I'm in a hurry, my flight leaves in two hours.", word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-148', spanish_word: 'dar un paseo', english_translation: 'to take a walk', example_sentence_spanish: '¿Quieres dar un paseo por el parque después de cenar?', example_sentence_english: 'Do you want to take a walk in the park after dinner?', word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },
  { id: 'es-149', spanish_word: 'estar harto de', english_translation: 'to be fed up with', example_sentence_spanish: 'Estoy harto de esperar el autobús todos los días.', example_sentence_english: "I'm fed up with waiting for the bus every day.", word_type: 'expression', tags: ['A2', 'high-frequency', 'colloquial'], source: 'a2-frequency' },
  { id: 'es-150', spanish_word: 'hacer cola', english_translation: 'to stand in line / to queue', example_sentence_spanish: 'Tuvimos que hacer cola durante media hora para entrar.', example_sentence_english: 'We had to stand in line for half an hour to get in.', word_type: 'expression', tags: ['A2', 'high-frequency'], source: 'a2-frequency' },

  // ==================== A2.1 → A2.2 BRIDGE CARDS ====================

  // === Reflexive Verbs — Daily Routine (A2.2 core) ===
  { id: 'es-151', spanish_word: 'despertarse', english_translation: 'to wake up', example_sentence_spanish: 'Me despierto a las siete todos los días.', example_sentence_english: 'I wake up at seven every day.', word_type: 'verb', tags: ['A2', 'reflexive', 'stem-change-e-ie', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-152', spanish_word: 'levantarse', english_translation: 'to get up', example_sentence_spanish: 'Los fines de semana me levanto más tarde.', example_sentence_english: 'On weekends I get up later.', word_type: 'verb', tags: ['A2', 'reflexive', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-153', spanish_word: 'ducharse', english_translation: 'to take a shower', example_sentence_spanish: 'Prefiero ducharme por la mañana antes de salir.', example_sentence_english: 'I prefer to shower in the morning before going out.', word_type: 'verb', tags: ['A2', 'reflexive', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-154', spanish_word: 'vestirse', english_translation: 'to get dressed', example_sentence_spanish: 'Me visto rápido porque llego tarde al trabajo.', example_sentence_english: 'I get dressed quickly because I\'m late for work.', word_type: 'verb', tags: ['A2', 'reflexive', 'stem-change-e-i', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-155', spanish_word: 'acostarse', english_translation: 'to go to bed', example_sentence_spanish: 'Normalmente me acuesto a las once de la noche.', example_sentence_english: 'I normally go to bed at eleven at night.', word_type: 'verb', tags: ['A2', 'reflexive', 'stem-change-o-ue', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-156', spanish_word: 'cepillarse los dientes', english_translation: 'to brush one\'s teeth', example_sentence_spanish: 'Hay que cepillarse los dientes después de cada comida.', example_sentence_english: 'You have to brush your teeth after every meal.', word_type: 'verb', tags: ['A2', 'reflexive', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-157', spanish_word: 'peinarse', english_translation: 'to comb one\'s hair', example_sentence_spanish: 'Mi hija ya se peina sola por la mañana.', example_sentence_english: 'My daughter already combs her hair by herself in the morning.', word_type: 'verb', tags: ['A2', 'reflexive', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-158', spanish_word: 'quitarse', english_translation: 'to take off (clothing)', example_sentence_spanish: 'Quítate los zapatos antes de entrar en casa.', example_sentence_english: 'Take off your shoes before coming into the house.', word_type: 'verb', tags: ['A2', 'reflexive', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-159', spanish_word: 'afeitarse', english_translation: 'to shave', example_sentence_spanish: 'Mi padre se afeita todas las mañanas.', example_sentence_english: 'My father shaves every morning.', word_type: 'verb', tags: ['A2', 'reflexive', 'daily-routine'], source: 'a2-bridge' },
  { id: 'es-160', spanish_word: 'dormirse', english_translation: 'to fall asleep', example_sentence_spanish: 'Me dormí en el sofá viendo la tele.', example_sentence_english: 'I fell asleep on the sofa watching TV.', word_type: 'verb', tags: ['A2', 'reflexive', 'stem-change-o-ue', 'daily-routine'], source: 'a2-bridge' },

  // === Preterite vs Imperfect — Key Phrases & Time Markers (A2.2 core) ===
  { id: 'es-161', spanish_word: 'de repente', english_translation: 'suddenly', example_sentence_spanish: 'Caminaba por la calle y de repente empezó a llover.', example_sentence_english: 'I was walking down the street and suddenly it started to rain.', word_type: 'expression', tags: ['A2', 'preterite-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-162', spanish_word: 'mientras', english_translation: 'while / meanwhile', example_sentence_spanish: 'Mientras yo cocinaba, mi hermano hacía la tarea.', example_sentence_english: 'While I was cooking, my brother was doing homework.', word_type: 'conjunction', tags: ['A2', 'imperfect-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-163', spanish_word: 'cuando era niño/a', english_translation: 'when I was a child', example_sentence_spanish: 'Cuando era niño, jugaba en el parque todos los días.', example_sentence_english: 'When I was a child, I used to play in the park every day.', word_type: 'expression', tags: ['A2', 'imperfect-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-164', spanish_word: 'todos los días', english_translation: 'every day', example_sentence_spanish: 'De pequeño, iba al colegio todos los días en bicicleta.', example_sentence_english: 'When I was little, I used to go to school every day by bike.', word_type: 'expression', tags: ['A2', 'imperfect-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-165', spanish_word: 'la semana pasada', english_translation: 'last week', example_sentence_spanish: 'La semana pasada fui al médico porque me dolía la espalda.', example_sentence_english: 'Last week I went to the doctor because my back was hurting.', word_type: 'expression', tags: ['A2', 'preterite-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-166', spanish_word: 'en aquel momento', english_translation: 'at that moment', example_sentence_spanish: 'En aquel momento no sabía qué decir.', example_sentence_english: 'At that moment I didn\'t know what to say.', word_type: 'expression', tags: ['A2', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-167', spanish_word: 'de pequeño/a', english_translation: 'as a child / when I was little', example_sentence_spanish: 'De pequeña, mi madre me leía cuentos antes de dormir.', example_sentence_english: 'When I was little, my mother used to read me stories before bed.', word_type: 'expression', tags: ['A2', 'imperfect-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-168', spanish_word: 'una vez', english_translation: 'once / one time', example_sentence_spanish: 'Una vez perdí el pasaporte en el aeropuerto.', example_sentence_english: 'Once I lost my passport at the airport.', word_type: 'expression', tags: ['A2', 'preterite-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-169', spanish_word: 'antes', english_translation: 'before / previously', example_sentence_spanish: 'Antes vivía en Madrid, pero ahora vivo en Barcelona.', example_sentence_english: 'Before I used to live in Madrid, but now I live in Barcelona.', word_type: 'adverb', tags: ['A2', 'imperfect-trigger', 'past-tense'], source: 'a2-bridge' },
  { id: 'es-170', spanish_word: 'el año pasado', english_translation: 'last year', example_sentence_spanish: 'El año pasado viajé a Portugal con mis amigos.', example_sentence_english: 'Last year I traveled to Portugal with my friends.', word_type: 'expression', tags: ['A2', 'preterite-trigger', 'past-tense'], source: 'a2-bridge' },

  // === Health & Body — Doctor Visits (A2.2 topic) ===
  { id: 'es-171', spanish_word: 'la cabeza', english_translation: 'head', example_sentence_spanish: 'Me duele mucho la cabeza, creo que tengo migraña.', example_sentence_english: 'My head hurts a lot, I think I have a migraine.', word_type: 'noun', tags: ['A2', 'health', 'body'], source: 'a2-bridge' },
  { id: 'es-172', spanish_word: 'la garganta', english_translation: 'throat', example_sentence_spanish: 'Tengo la garganta irritada y no puedo hablar bien.', example_sentence_english: 'My throat is irritated and I can\'t speak well.', word_type: 'noun', tags: ['A2', 'health', 'body'], source: 'a2-bridge' },
  { id: 'es-173', spanish_word: 'el estómago', english_translation: 'stomach', example_sentence_spanish: 'Me duele el estómago porque comí demasiado.', example_sentence_english: 'My stomach hurts because I ate too much.', word_type: 'noun', tags: ['A2', 'health', 'body'], source: 'a2-bridge' },
  { id: 'es-174', spanish_word: 'la espalda', english_translation: 'back', example_sentence_spanish: 'Me duele la espalda de estar sentado todo el día.', example_sentence_english: 'My back hurts from sitting all day.', word_type: 'noun', tags: ['A2', 'health', 'body'], source: 'a2-bridge' },
  { id: 'es-175', spanish_word: 'la rodilla', english_translation: 'knee', example_sentence_spanish: 'Me caí y me hice daño en la rodilla.', example_sentence_english: 'I fell and hurt my knee.', word_type: 'noun', tags: ['A2', 'health', 'body'], source: 'a2-bridge' },
  { id: 'es-176', spanish_word: 'el pecho', english_translation: 'chest', example_sentence_spanish: 'Siento una presión en el pecho cuando corro mucho.', example_sentence_english: 'I feel pressure in my chest when I run a lot.', word_type: 'noun', tags: ['A2', 'health', 'body'], source: 'a2-bridge' },
  { id: 'es-177', spanish_word: 'la fiebre', english_translation: 'fever', example_sentence_spanish: 'El niño tiene fiebre, vamos a llamar al médico.', example_sentence_english: 'The child has a fever, let\'s call the doctor.', word_type: 'noun', tags: ['A2', 'health'], source: 'a2-bridge' },
  { id: 'es-178', spanish_word: 'la tos', english_translation: 'cough', example_sentence_spanish: 'Tengo mucha tos desde hace una semana.', example_sentence_english: 'I\'ve had a bad cough for a week.', word_type: 'noun', tags: ['A2', 'health'], source: 'a2-bridge' },
  { id: 'es-179', spanish_word: 'el dolor', english_translation: 'pain / ache', example_sentence_spanish: 'El dolor de muelas es insoportable.', example_sentence_english: 'The toothache is unbearable.', word_type: 'noun', tags: ['A2', 'health'], source: 'a2-bridge' },
  { id: 'es-180', spanish_word: 'la cita (médica)', english_translation: 'appointment (medical)', example_sentence_spanish: 'Tengo una cita con el dentista el martes.', example_sentence_english: 'I have an appointment with the dentist on Tuesday.', word_type: 'noun', tags: ['A2', 'health'], source: 'a2-bridge' },
  { id: 'es-181', spanish_word: 'la receta', english_translation: 'prescription / recipe', example_sentence_spanish: 'El médico me dio una receta para las pastillas.', example_sentence_english: 'The doctor gave me a prescription for the pills.', word_type: 'noun', tags: ['A2', 'health', 'multiple-meanings'], source: 'a2-bridge' },
  { id: 'es-182', spanish_word: 'me duele...', english_translation: 'my ... hurts / I have a ... ache', example_sentence_spanish: 'Doctor, me duele mucho aquí, en el lado derecho.', example_sentence_english: 'Doctor, it hurts a lot here, on the right side.', word_type: 'expression', tags: ['A2', 'health', 'high-frequency'], source: 'a2-bridge' },
  { id: 'es-183', spanish_word: 'estar resfriado/a', english_translation: 'to have a cold', example_sentence_spanish: 'No puedo ir a clase, estoy resfriado.', example_sentence_english: 'I can\'t go to class, I have a cold.', word_type: 'expression', tags: ['A2', 'health'], source: 'a2-bridge' },
  { id: 'es-184', spanish_word: 'tomar una pastilla', english_translation: 'to take a pill', example_sentence_spanish: 'Tienes que tomar una pastilla cada ocho horas.', example_sentence_english: 'You have to take a pill every eight hours.', word_type: 'expression', tags: ['A2', 'health'], source: 'a2-bridge' },

  // === Imperative — Irregular Tú Commands (A2.2 grammar) ===
  { id: 'es-185', spanish_word: 'pon (poner)', english_translation: 'put! (command)', example_sentence_spanish: 'Pon la mesa, que la cena está lista.', example_sentence_english: 'Set the table, dinner is ready.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-186', spanish_word: 'ven (venir)', english_translation: 'come! (command)', example_sentence_spanish: 'Ven aquí un momento, por favor.', example_sentence_english: 'Come here a moment, please.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-187', spanish_word: 'di (decir)', english_translation: 'say! / tell! (command)', example_sentence_spanish: 'Dime la verdad, ¿qué pasó anoche?', example_sentence_english: 'Tell me the truth, what happened last night?', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-188', spanish_word: 'sal (salir)', english_translation: 'go out! / leave! (command)', example_sentence_spanish: 'Sal de casa y disfruta del buen tiempo.', example_sentence_english: 'Go outside and enjoy the good weather.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-189', spanish_word: 'haz (hacer)', english_translation: 'do! / make! (command)', example_sentence_spanish: 'Haz la tarea antes de jugar a los videojuegos.', example_sentence_english: 'Do your homework before playing video games.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-190', spanish_word: 'ten (tener)', english_translation: 'have! / hold! (command)', example_sentence_spanish: 'Ten cuidado con el escalón, puedes caerte.', example_sentence_english: 'Be careful with the step, you could fall.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-191', spanish_word: 've (ir)', english_translation: 'go! (command)', example_sentence_spanish: 'Ve al supermercado y compra leche y pan.', example_sentence_english: 'Go to the supermarket and buy milk and bread.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },
  { id: 'es-192', spanish_word: 'sé (ser)', english_translation: 'be! (command)', example_sentence_spanish: 'Sé amable con los nuevos compañeros de clase.', example_sentence_english: 'Be kind to the new classmates.', word_type: 'verb', tags: ['A2', 'imperative', 'irregular'], source: 'a2-bridge' },

  // === Verbal Periphrases (A2.2 grammar) ===
  { id: 'es-193', spanish_word: 'estar + gerundio', english_translation: 'to be doing (progressive)', example_sentence_spanish: 'Estoy estudiando para el examen de mañana.', example_sentence_english: 'I\'m studying for tomorrow\'s exam.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar'], source: 'a2-bridge' },
  { id: 'es-194', spanish_word: 'acabar de + infinitivo', english_translation: 'to have just (done something)', example_sentence_spanish: 'Acabo de llegar a casa, estoy muy cansado.', example_sentence_english: 'I\'ve just arrived home, I\'m very tired.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar'], source: 'a2-bridge' },
  { id: 'es-195', spanish_word: 'volver a + infinitivo', english_translation: 'to do again', example_sentence_spanish: 'No quiero volver a cometer el mismo error.', example_sentence_english: 'I don\'t want to make the same mistake again.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar'], source: 'a2-bridge' },
  { id: 'es-196', spanish_word: 'dejar de + infinitivo', english_translation: 'to stop doing', example_sentence_spanish: 'Mi padre dejó de fumar hace cinco años.', example_sentence_english: 'My father stopped smoking five years ago.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar'], source: 'a2-bridge' },
  { id: 'es-197', spanish_word: 'seguir + gerundio', english_translation: 'to keep on doing / to still be doing', example_sentence_spanish: 'Sigue lloviendo, no podemos salir todavía.', example_sentence_english: 'It\'s still raining, we can\'t go out yet.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar'], source: 'a2-bridge' },
  { id: 'es-198', spanish_word: 'empezar a + infinitivo', english_translation: 'to begin to / to start doing', example_sentence_spanish: 'Empecé a estudiar español el año pasado.', example_sentence_english: 'I started studying Spanish last year.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar'], source: 'a2-bridge' },
  { id: 'es-199', spanish_word: 'ir a + infinitivo', english_translation: 'to be going to (future)', example_sentence_spanish: 'Voy a viajar a México este verano.', example_sentence_english: 'I\'m going to travel to Mexico this summer.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar', 'future'], source: 'a2-bridge' },
  { id: 'es-200', spanish_word: 'tener que + infinitivo', english_translation: 'to have to / must', example_sentence_spanish: 'Tengo que estudiar más si quiero aprobar el examen.', example_sentence_english: 'I have to study more if I want to pass the exam.', word_type: 'expression', tags: ['A2', 'periphrasis', 'grammar', 'obligation'], source: 'a2-bridge' },

  // === Comparatives & Superlatives (A2.2 grammar) ===
  { id: 'es-201', spanish_word: 'más ... que', english_translation: 'more ... than', example_sentence_spanish: 'El español es más fácil que el alemán.', example_sentence_english: 'Spanish is easier than German.', word_type: 'expression', tags: ['A2', 'comparison', 'grammar'], source: 'a2-bridge' },
  { id: 'es-202', spanish_word: 'menos ... que', english_translation: 'less ... than', example_sentence_spanish: 'Esta película es menos interesante que la otra.', example_sentence_english: 'This movie is less interesting than the other one.', word_type: 'expression', tags: ['A2', 'comparison', 'grammar'], source: 'a2-bridge' },
  { id: 'es-203', spanish_word: 'tan ... como', english_translation: 'as ... as', example_sentence_spanish: 'Mi hermano es tan alto como mi padre.', example_sentence_english: 'My brother is as tall as my father.', word_type: 'expression', tags: ['A2', 'comparison', 'grammar'], source: 'a2-bridge' },
  { id: 'es-204', spanish_word: 'mejor', english_translation: 'better / best', example_sentence_spanish: 'Este restaurante es mejor que el de la esquina.', example_sentence_english: 'This restaurant is better than the one on the corner.', word_type: 'adjective', tags: ['A2', 'comparison', 'irregular'], source: 'a2-bridge' },
  { id: 'es-205', spanish_word: 'peor', english_translation: 'worse / worst', example_sentence_spanish: 'El tráfico hoy está peor que ayer.', example_sentence_english: 'The traffic today is worse than yesterday.', word_type: 'adjective', tags: ['A2', 'comparison', 'irregular'], source: 'a2-bridge' },

  // === Directions & Getting Around (A2.2 practical) ===
  { id: 'es-206', spanish_word: 'girar', english_translation: 'to turn', example_sentence_spanish: 'Gira a la derecha en el semáforo.', example_sentence_english: 'Turn right at the traffic light.', word_type: 'verb', tags: ['A2', 'directions', 'travel'], source: 'a2-bridge' },
  { id: 'es-207', spanish_word: 'seguir recto', english_translation: 'to go straight ahead', example_sentence_spanish: 'Sigue recto dos calles y luego gira a la izquierda.', example_sentence_english: 'Go straight for two blocks and then turn left.', word_type: 'expression', tags: ['A2', 'directions', 'travel'], source: 'a2-bridge' },
  { id: 'es-208', spanish_word: 'la esquina', english_translation: 'the corner', example_sentence_spanish: 'La farmacia está en la esquina, al lado del banco.', example_sentence_english: 'The pharmacy is on the corner, next to the bank.', word_type: 'noun', tags: ['A2', 'directions', 'travel'], source: 'a2-bridge' },
  { id: 'es-209', spanish_word: 'la manzana', english_translation: 'the block (city) / apple', example_sentence_spanish: 'El museo está a dos manzanas de aquí.', example_sentence_english: 'The museum is two blocks from here.', word_type: 'noun', tags: ['A2', 'directions', 'multiple-meanings'], source: 'a2-bridge' },
  { id: 'es-210', spanish_word: 'cruzar', english_translation: 'to cross', example_sentence_spanish: 'Cruza la plaza y el cine está enfrente.', example_sentence_english: 'Cross the square and the cinema is in front.', word_type: 'verb', tags: ['A2', 'directions', 'travel'], source: 'a2-bridge' },

  // === Object Pronouns — Key Patterns (A2.2 grammar) ===
  { id: 'es-211', spanish_word: 'me lo / me la', english_translation: 'it to me (indirect + direct)', example_sentence_spanish: '¿El libro? Sí, me lo dio ayer.', example_sentence_english: 'The book? Yes, he gave it to me yesterday.', word_type: 'expression', tags: ['A2', 'pronouns', 'grammar'], source: 'a2-bridge' },
  { id: 'es-212', spanish_word: 'se lo / se la', english_translation: 'it to him/her/them', example_sentence_spanish: 'El regalo es para María, se lo voy a dar mañana.', example_sentence_english: 'The gift is for María, I\'m going to give it to her tomorrow.', word_type: 'expression', tags: ['A2', 'pronouns', 'grammar'], source: 'a2-bridge' },

  // === Shopping & Transactions (A2.2 practical) ===
  { id: 'es-213', spanish_word: 'la talla', english_translation: 'the size (clothing)', example_sentence_spanish: '¿Tiene esta camiseta en una talla más grande?', example_sentence_english: 'Do you have this T-shirt in a bigger size?', word_type: 'noun', tags: ['A2', 'shopping'], source: 'a2-bridge' },
  { id: 'es-214', spanish_word: 'probarse', english_translation: 'to try on', example_sentence_spanish: '¿Puedo probarme estos pantalones?', example_sentence_english: 'Can I try on these pants?', word_type: 'verb', tags: ['A2', 'shopping', 'reflexive'], source: 'a2-bridge' },
  { id: 'es-215', spanish_word: 'la cuenta', english_translation: 'the bill / check', example_sentence_spanish: '¿Nos puede traer la cuenta, por favor?', example_sentence_english: 'Can you bring us the bill, please?', word_type: 'noun', tags: ['A2', 'shopping', 'restaurant'], source: 'a2-bridge' },
  { id: 'es-216', spanish_word: 'las rebajas', english_translation: 'the sales / discounts', example_sentence_spanish: 'Compré este abrigo en las rebajas de enero.', example_sentence_english: 'I bought this coat in the January sales.', word_type: 'noun', tags: ['A2', 'shopping'], source: 'a2-bridge' },
  { id: 'es-217', spanish_word: 'devolver', english_translation: 'to return (an item) / to give back', example_sentence_spanish: 'Quiero devolver esta camisa, me queda pequeña.', example_sentence_english: 'I want to return this shirt, it\'s too small for me.', word_type: 'verb', tags: ['A2', 'shopping', 'irregular'], source: 'a2-bridge' },
  { id: 'es-218', spanish_word: 'en efectivo', english_translation: 'in cash', example_sentence_spanish: '¿Puedo pagar en efectivo o solo con tarjeta?', example_sentence_english: 'Can I pay in cash or only by card?', word_type: 'expression', tags: ['A2', 'shopping'], source: 'a2-bridge' },

  // === Weather & Seasons (A2 consolidation) ===
  { id: 'es-219', spanish_word: 'hace sol', english_translation: 'it\'s sunny', example_sentence_spanish: 'Hoy hace sol, vamos a la playa.', example_sentence_english: 'It\'s sunny today, let\'s go to the beach.', word_type: 'expression', tags: ['A2', 'weather'], source: 'a2-bridge' },
  { id: 'es-220', spanish_word: 'está nublado', english_translation: 'it\'s cloudy', example_sentence_spanish: 'Está nublado pero no creo que llueva.', example_sentence_english: 'It\'s cloudy but I don\'t think it will rain.', word_type: 'expression', tags: ['A2', 'weather'], source: 'a2-bridge' },
  { id: 'es-221', spanish_word: 'hace frío / calor', english_translation: 'it\'s cold / hot', example_sentence_spanish: 'En invierno hace mucho frío y en verano mucho calor.', example_sentence_english: 'In winter it\'s very cold and in summer very hot.', word_type: 'expression', tags: ['A2', 'weather'], source: 'a2-bridge' },
  { id: 'es-222', spanish_word: 'llover', english_translation: 'to rain', example_sentence_spanish: 'Parece que va a llover, lleva un paraguas.', example_sentence_english: 'It looks like it\'s going to rain, take an umbrella.', word_type: 'verb', tags: ['A2', 'weather', 'impersonal'], source: 'a2-bridge' },

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
            VALUES (${id}, ${spanish_word}, ${english_translation}, ${card.example_sentence_spanish}, ${card.example_sentence_english}, ${card.word_type}, ${JSON.stringify(card.tags)}, ${card.source})
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
              VALUES (${card.id}, ${card.spanish_word}, ${card.english_translation}, ${card.example_sentence_spanish}, ${card.example_sentence_english}, ${card.word_type}, ${JSON.stringify(card.tags)}, ${card.source})
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
