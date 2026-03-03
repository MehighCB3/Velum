/**
 * Notion Content Extraction for Spanish Vocabulary
 * 
 * Extracts Spanish words, phrases, and expressions from Notion book notes
 */

import { ExtractedCardCandidate, CardCategory } from './types';

// Patterns for detecting Spanish content in text
const EXTRACTION_PATTERNS = {
  // Vocabulary pairs: "Spanish: English" or "Spanish - English"
  vocabularyPair: /^([a-záéíóúñüÁÉÍÓÚÑÜ\s]+?)\s*[:\-\–]\s*(.+?)$/i,
  
  // Spanish word with parenthetical translation
  parenthetical: /\b([a-záéíóúñü]+)\s*\(([^)]+)\)/gi,
  
  // Highlighted Spanish terms (markdown bold or italic)
  highlightedTerm: /\*\*([a-záéíóúñü\s]+?)\*\*|_([a-záéíóúñü\s]+?)_/gi,
  
  // Spanish in quotes
  spanishQuote: /"([^"]*[áéíóúñ][^"]*)"/gi,
  
  // Common Spanish words that indicate Spanish context
  spanishIndicators: [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'es', 'son', 'está', 'están', 'hay', 'tiene', 'tienen',
    'pero', 'porque', 'cuando', 'donde', 'qué', 'cómo',
    'muy', 'más', 'todo', 'toda', 'bien', 'mal'
  ],
  
  // Phrase patterns (common sentence starters)
  phrasePatterns: [
    /^(me gusta|no me gusta|quiero|no quiero|puedo|no puedo|voy a|tengo que)\s/i,
    /^(es importante|es necesario|es difícil|es fácil)\s/i,
  ]
};

/**
 * Check if text is likely Spanish using simple heuristics
 */
export function isLikelySpanish(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for Spanish-specific characters
  if (/[áéíóúñ¿¡]/.test(text)) return true;
  
  // Count Spanish indicator words
  const indicatorCount = EXTRACTION_PATTERNS.spanishIndicators.filter(
    word => lowerText.includes(` ${word} `) || lowerText.startsWith(`${word} `)
  ).length;
  
  return indicatorCount >= 2;
}

/**
 * Extract vocabulary pairs from text
 */
export function extractVocabularyPairs(text: string, sourceLocation: string): ExtractedCardCandidate[] {
  const candidates: ExtractedCardCandidate[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Match "Spanish: English" pattern
    const match = trimmed.match(EXTRACTION_PATTERNS.vocabularyPair);
    if (match) {
      const spanish = match[1].trim();
      const english = match[2].trim();
      
      // Validate Spanish side has Spanish characteristics
      if (isLikelySpanish(spanish)) {
        candidates.push({
          spanish,
          english,
          type: spanish.includes(' ') ? 'phrase' : 'vocabulary',
          confidence: 0.9,
          sourceLocation
        });
      }
    }
  }
  
  return candidates;
}

/**
 * Extract parenthetical definitions
 */
export function extractParentheticalDefinitions(text: string, sourceLocation: string): ExtractedCardCandidate[] {
  const candidates: ExtractedCardCandidate[] = [];
  let match;
  
  while ((match = EXTRACTION_PATTERNS.parenthetical.exec(text)) !== null) {
    const spanish = match[1].trim();
    const english = match[2].trim();
    
    if (isLikelySpanish(spanish) && !isLikelySpanish(english)) {
      candidates.push({
        spanish,
        english,
        type: 'vocabulary',
        confidence: 0.7,
        sourceLocation
      });
    }
  }
  
  // Reset regex
  EXTRACTION_PATTERNS.parenthetical.lastIndex = 0;
  return candidates;
}

/**
 * Extract highlighted terms and try to find their context
 */
export function extractHighlightedTerms(text: string, sourceLocation: string): ExtractedCardCandidate[] {
  const candidates: ExtractedCardCandidate[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    while ((match = EXTRACTION_PATTERNS.highlightedTerm.exec(line)) !== null) {
      const spanish = (match[1] || match[2]).trim();
      
      // Look for English definition in surrounding lines
      let english = '';
      let context = '';
      
      // Check same line after the highlighted term
      const afterTerm = line.slice(line.indexOf(match[0]) + match[0].length);
      const definitionMatch = afterTerm.match(/^[:\-\s]+(.+?)(?:\.|,|$)/);
      if (definitionMatch) {
        english = definitionMatch[1].trim();
      }
      
      // Check next line for definition
      if (!english && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!isLikelySpanish(nextLine) && nextLine.length < 100) {
          english = nextLine;
        }
      }
      
      // Get context from surrounding text
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      context = lines.slice(start, end).join(' ').trim();
      
      if (isLikelySpanish(spanish) && english) {
        candidates.push({
          spanish,
          english,
          context,
          type: spanish.includes(' ') ? 'phrase' : 'vocabulary',
          confidence: 0.6,
          sourceLocation
        });
      }
    }
    
    // Reset regex for this line
    EXTRACTION_PATTERNS.highlightedTerm.lastIndex = 0;
  }
  
  return candidates;
}

/**
 * Extract Spanish phrases and expressions
 */
export function extractPhrases(text: string, sourceLocation: string): ExtractedCardCandidate[] {
  const candidates: ExtractedCardCandidate[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line matches phrase patterns
    for (const pattern of EXTRACTION_PATTERNS.phrasePatterns) {
      if (pattern.test(trimmed)) {
        // Extract the Spanish phrase (first 5-10 words)
        const words = trimmed.split(/\s+/);
        const spanish = words.slice(0, Math.min(10, words.length)).join(' ');
        
        // Try to find translation in the same line or next
        const rest = trimmed.slice(spanish.length).trim();
        let english = '';
        
        // Look for "= translation" or "- translation" or "(translation)"
        const transMatch = rest.match(/^[\s=\-\(]+(.+?)[\)\.]?$/);
        if (transMatch) {
          english = transMatch[1].trim();
        }
        
        if (english) {
          candidates.push({
            spanish,
            english,
            type: 'phrase',
            confidence: 0.75,
            sourceLocation
          });
        }
      }
    }
  }
  
  return candidates;
}

/**
 * Full extraction pipeline
 */
export function extractAllCandidates(text: string, sourceLocation: string): ExtractedCardCandidate[] {
  const allCandidates: ExtractedCardCandidate[] = [
    ...extractVocabularyPairs(text, sourceLocation),
    ...extractParentheticalDefinitions(text, sourceLocation),
    ...extractHighlightedTerms(text, sourceLocation),
    ...extractPhrases(text, sourceLocation),
  ];
  
  // Deduplicate by Spanish text (keeping highest confidence)
  const seen = new Map<string, ExtractedCardCandidate>();
  for (const candidate of allCandidates) {
    const normalized = candidate.spanish.toLowerCase().trim();
    const existing = seen.get(normalized);
    
    if (!existing || candidate.confidence > existing.confidence) {
      seen.set(normalized, candidate);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Format extracted candidates into flashcard format
 */
export function formatAsFlashcards(
  candidates: ExtractedCardCandidate[],
  cefrLevel: string = 'A2'
): Array<{
  id: string;
  front: string;
  back: string;
  source: 'notion_book';
  cefrLevel: string;
  category: CardCategory;
  tags: string[];
}> {
  return candidates.map((candidate, index) => ({
    id: `notion-${Date.now()}-${index}`,
    front: candidate.spanish,
    back: candidate.english,
    source: 'notion_book' as const,
    cefrLevel,
    category: candidate.type,
    tags: ['from-books', 'auto-extracted'],
  }));
}
