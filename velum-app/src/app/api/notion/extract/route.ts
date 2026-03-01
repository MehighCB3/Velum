import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { extractAllCandidates, formatAsFlashcards } from '@/lib/flashcards/notion-extractor';

// This would use the actual Notion SDK in production
// import { Client } from '@notionhq/client';

const EXTRACTED_CACHE_PATH = join(process.cwd(), 'data', 'notion', 'extracted-cache.json');
const CARDS_PATH = join(process.cwd(), 'data', 'spanish', 'cards.json');

interface NotionConfig {
  integrationToken: string;
  databaseId?: string;
  pageIds?: string[];
}

/**
 * Fetch pages from Notion API
 * This is a mock implementation - would use actual Notion SDK
 */
async function fetchNotionPages(config: NotionConfig): Promise<Array<{ id: string; title: string; content: string }>> {
  // Mock data for development
  // In production, this would use the Notion Client
  /*
  const notion = new Client({ auth: config.integrationToken });
  
  if (config.databaseId) {
    const response = await notion.databases.query({ database_id: config.databaseId });
    // Process pages...
  }
  
  if (config.pageIds) {
    for (const pageId of config.pageIds) {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const blocks = await notion.blocks.children.list({ block_id: pageId });
      // Process blocks...
    }
  }
  */

  // Return mock data for now
  return [
    {
      id: 'mock-page-1',
      title: 'Cien años de soledad - Notes',
      content: `
        acogedor: cozy, welcoming
        Macondo era un lugar acogedor pero misterioso.
        
        **la soledad** - loneliness, solitude
        El tema principal es la soledad de la familia Buendía.
        
        "Muchos años después" - Many years later (famous opening)
        
        genealogía (genealogy)
        La genealogía de la familia es complicada.
      `,
    },
    {
      id: 'mock-page-2',
      title: 'El amor en los tiempos del cólera - Notes',
      content: `
        **esperar** - to wait, to hope
        Florentino Ariza espera décadas por Fermina.
        
        el vapor: steamboat, steamship
        Los viajes en vapor son importantes en la novela.
        
        carta de amor (love letter)
        Florentino escribe muchas cartas de amor.
        
        "El corazón tiene más cuartos que un hotel de putas" - The heart has more rooms than a whorehouse hotel
      `,
    },
  ];
}

// POST /api/notion/extract - Extract Spanish vocabulary from Notion
export async function POST(request: NextRequest) {
  try {
    // Get config from environment or request
    const config: NotionConfig = {
      integrationToken: process.env.NOTION_API_KEY || '',
      databaseId: process.env.NOTION_DATABASE_ID,
      pageIds: process.env.NOTION_PAGE_IDS?.split(','),
    };

    if (!config.integrationToken) {
      return NextResponse.json(
        { error: 'Notion API key not configured' },
        { status: 400 }
      );
    }

    // Fetch pages from Notion
    const pages = await fetchNotionPages(config);

    // Extract candidates from all pages
    const allCandidates = [];
    for (const page of pages) {
      const candidates = extractAllCandidates(page.content, page.id);
      allCandidates.push(...candidates);
    }

    // Filter for high confidence candidates
    const highConfidence = allCandidates.filter(c => c.confidence >= 0.6);

    // Format as flashcards
    const newCards = formatAsFlashcards(highConfidence, 'A2');

    // Load existing cards to check for duplicates
    let existingCards: any[] = [];
    try {
      const data = await readFile(CARDS_PATH, 'utf-8');
      existingCards = JSON.parse(data).cards || [];
    } catch {
      // File doesn't exist yet
    }

    // Deduplicate
    const existingFronts = new Set(existingCards.map(c => c.front.toLowerCase()));
    const uniqueNewCards = newCards.filter(c => !existingFronts.has(c.front.toLowerCase()));

    // Initialize SM-2 fields
    const cardsToAdd = uniqueNewCards.map(card => ({
      ...card,
      interval: 0,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: null,
      createdAt: new Date().toISOString(),
      reviewHistory: [],
    }));

    // Save to cache
    await writeFile(EXTRACTED_CACHE_PATH, JSON.stringify({
      extractedAt: new Date().toISOString(),
      pagesProcessed: pages.length,
      candidatesFound: allCandidates.length,
      highConfidenceCount: highConfidence.length,
      newCardsAdded: cardsToAdd.length,
      candidates: highConfidence,
    }, null, 2));

    // Append to cards.json
    if (cardsToAdd.length > 0) {
      const updatedCards = [...existingCards, ...cardsToAdd];
      await writeFile(CARDS_PATH, JSON.stringify({
        cards: updatedCards,
        totalCards: updatedCards.length,
        lastUpdated: new Date().toISOString(),
      }, null, 2));
    }

    return NextResponse.json({
      success: true,
      pagesProcessed: pages.length,
      candidatesFound: allCandidates.length,
      newCardsAdded: cardsToAdd.length,
      sampleCards: cardsToAdd.slice(0, 3),
    });
  } catch (error) {
    console.error('Notion extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract from Notion' },
      { status: 500 }
    );
  }
}

// GET /api/notion/extract - Get last extraction results
export async function GET() {
  try {
    const data = await readFile(EXTRACTED_CACHE_PATH, 'utf-8');
    const cache = JSON.parse(data);
    return NextResponse.json(cache);
  } catch {
    return NextResponse.json({
      extractedAt: null,
      pagesProcessed: 0,
      candidatesFound: 0,
      newCardsAdded: 0,
    });
  }
}
