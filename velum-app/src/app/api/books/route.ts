import { NextRequest, NextResponse } from 'next/server'

// ==================== KNOWLEDGE DOMAINS & SEED DATA ====================

const KNOWLEDGE_DOMAINS = [
  'Deep Work',
  'Mastery',
  'Systems Thinking',
  'Leadership',
  'Psychology',
  'Mindfulness',
  'Business',
  'Communication',
  'Creativity',
  'Decision Making',
]

interface BookPrinciple {
  id: string
  domain: string
  title: string
  principle: string
  source: string
  actionPrompt: string
}

interface RawCapture {
  id: string
  domain: string
  text: string
  source: string
  type: 'quote' | 'passage' | 'note'
}

const SEED_PRINCIPLES: BookPrinciple[] = [
  // === Deep Work ===
  { id: 'bp-01', domain: 'Deep Work', title: 'The 4DX Framework', principle: 'Focus on the wildly important. Act on lead measures. Keep a compelling scoreboard. Create a cadence of accountability.', source: 'Deep Work — Cal Newport', actionPrompt: 'Identify your ONE wildly important task for today and block 90 minutes of uninterrupted time for it.' },
  { id: 'bp-02', domain: 'Deep Work', title: 'Attention Residue', principle: 'When you switch tasks, your attention doesn\'t follow — a residue of the previous task lingers and reduces cognitive performance on the next.', source: 'Deep Work — Cal Newport', actionPrompt: 'Batch similar tasks together today. Before switching context, write a completion note for where you left off.' },

  // === Mastery ===
  { id: 'bp-03', domain: 'Mastery', title: 'The Apprenticeship Phase', principle: 'In the initial phase of learning, focus on observation and practice, not creative expression. Submit to the process before trying to innovate.', source: 'Mastery — Robert Greene', actionPrompt: 'For your current skill-building goal, what foundational practice have you been skipping? Do that today.' },
  { id: 'bp-04', domain: 'Mastery', title: 'Deliberate Practice', principle: 'Growth comes from working at the edge of your abilities — in the zone of discomfort, not in the zone of comfort or overwhelm.', source: 'Peak — Anders Ericsson', actionPrompt: 'Identify one specific weakness in your craft. Spend 20 minutes practicing just that edge case.' },

  // === Systems Thinking ===
  { id: 'bp-05', domain: 'Systems Thinking', title: 'Leverage Points', principle: 'Small, well-focused actions can produce significant, enduring improvements if they\'re in the right place. The key is finding the leverage point.', source: 'Thinking in Systems — Donella Meadows', actionPrompt: 'Look at a recurring problem. Instead of fixing symptoms, trace it to the system structure causing it.' },
  { id: 'bp-06', domain: 'Systems Thinking', title: 'Second-Order Effects', principle: 'Every action has consequences beyond its immediate results. Effective thinkers consider what happens next, and what happens after that.', source: 'The Fifth Discipline — Peter Senge', actionPrompt: 'Before making today\'s biggest decision, write down 3 second-order effects it might cause.' },

  // === Leadership ===
  { id: 'bp-07', domain: 'Leadership', title: 'Extreme Ownership', principle: 'Leaders must own everything in their world. There is no one else to blame. When subordinates underperform, the leader bears full responsibility.', source: 'Extreme Ownership — Jocko Willink', actionPrompt: 'Think of a current challenge. Instead of identifying what others did wrong, ask: "What could I have done differently?"' },
  { id: 'bp-08', domain: 'Leadership', title: 'Servant Leadership', principle: 'The best leaders focus on serving their team — removing obstacles, providing resources, and creating conditions for others to succeed.', source: 'Leaders Eat Last — Simon Sinek', actionPrompt: 'Reach out to one team member today and ask: "What\'s blocking you? How can I help?"' },

  // === Psychology ===
  { id: 'bp-09', domain: 'Psychology', title: 'Loss Aversion', principle: 'People feel the pain of losing something roughly twice as strongly as the pleasure of gaining something equivalent. This asymmetry drives most irrational decisions.', source: 'Thinking, Fast and Slow — Daniel Kahneman', actionPrompt: 'Notice one decision today where you\'re holding onto something out of fear of loss rather than genuine value.' },
  { id: 'bp-10', domain: 'Psychology', title: 'The Growth Mindset', principle: 'Abilities are not fixed. The belief that you can develop your talents through effort and learning is the foundation of all achievement.', source: 'Mindset — Carol Dweck', actionPrompt: 'Reframe one "I can\'t" thought today into "I can\'t yet — what\'s the next step to learn this?"' },

  // === Mindfulness ===
  { id: 'bp-11', domain: 'Mindfulness', title: 'The Gap', principle: 'Between stimulus and response, there is a space. In that space lies our freedom and power to choose our response.', source: 'Man\'s Search for Meaning — Viktor Frankl', actionPrompt: 'When you feel reactive today, pause for 3 breaths before responding. Notice the gap.' },
  { id: 'bp-12', domain: 'Mindfulness', title: 'Beginner\'s Mind', principle: 'In the beginner\'s mind there are many possibilities, but in the expert\'s mind there are few. Approach familiar situations with fresh eyes.', source: 'Zen Mind, Beginner\'s Mind — Shunryu Suzuki', actionPrompt: 'Approach your most routine task today as if doing it for the first time. What do you notice?' },

  // === Business ===
  { id: 'bp-13', domain: 'Business', title: 'The Moat', principle: 'Sustainable competitive advantage comes from building something hard to replicate — a network effect, switching costs, brand loyalty, or cost advantages.', source: 'Zero to One — Peter Thiel', actionPrompt: 'What\'s one thing about your work that would be hard for someone else to replicate? Double down on that.' },
  { id: 'bp-14', domain: 'Business', title: 'Jobs to Be Done', principle: 'People don\'t buy products — they hire them to do a job. Understand the job the customer needs done, and you understand what to build.', source: 'Competing Against Luck — Clayton Christensen', actionPrompt: 'Pick one thing you built or shipped recently. What "job" is the user actually hiring it for?' },

  // === Communication ===
  { id: 'bp-15', domain: 'Communication', title: 'The Pyramid Principle', principle: 'Start with the answer, then provide supporting evidence. Lead with the conclusion, not the methodology.', source: 'The Pyramid Principle — Barbara Minto', actionPrompt: 'In your next email or message, start with the key takeaway in the first sentence.' },
  { id: 'bp-16', domain: 'Communication', title: 'Radical Candor', principle: 'Care personally while challenging directly. The worst approach is "ruinous empathy" — being so nice you fail to give honest feedback.', source: 'Radical Candor — Kim Scott', actionPrompt: 'Give one piece of direct, caring feedback to someone today that you\'ve been holding back.' },

  // === Creativity ===
  { id: 'bp-17', domain: 'Creativity', title: 'Combinatorial Creativity', principle: 'Creativity is not about generating something from nothing — it\'s about connecting existing ideas in novel ways across different domains.', source: 'Steal Like an Artist — Austin Kleon', actionPrompt: 'Take an idea from one field you\'re learning and apply it to a completely different project today.' },
  { id: 'bp-18', domain: 'Creativity', title: 'The Creative Habit', principle: 'Creativity is not a gift — it\'s a habit. The most creative people show up consistently and do the work, inspiration or not.', source: 'The Creative Habit — Twyla Tharp', actionPrompt: 'Create something small today — a sketch, a paragraph, a code snippet — regardless of inspiration.' },

  // === Decision Making ===
  { id: 'bp-19', domain: 'Decision Making', title: 'Reversible vs Irreversible', principle: 'Type 1 decisions (irreversible) deserve careful analysis. Type 2 decisions (reversible) should be made quickly. Most decisions are Type 2.', source: 'Invent and Wander — Jeff Bezos', actionPrompt: 'Identify one decision you\'ve been overthinking. Is it reversible? If yes, decide now.' },
  { id: 'bp-20', domain: 'Decision Making', title: 'Inversion', principle: 'Instead of thinking about how to succeed, think about how to avoid failure. Invert the problem. "What would guarantee disaster?" Then don\'t do that.', source: 'Poor Charlie\'s Almanack — Charlie Munger', actionPrompt: 'For your current project, list 3 things that would guarantee failure. Are you accidentally doing any of them?' },
]

const SEED_CAPTURES: RawCapture[] = [
  { id: 'rc-01', domain: 'Deep Work', text: '"Efforts to deepen your focus will struggle if you don\'t simultaneously wean your mind from a dependence on distraction."', source: 'Deep Work — Cal Newport', type: 'quote' },
  { id: 'rc-02', domain: 'Mastery', text: '"The pain is a kind of challenge your mind presents — will you learn how to focus and move past boredom, or will you succumb to the need for immediate pleasure?"', source: 'Mastery — Robert Greene', type: 'quote' },
  { id: 'rc-03', domain: 'Psychology', text: '"Nothing in life is as important as you think it is, while you are thinking about it."', source: 'Thinking, Fast and Slow — Daniel Kahneman', type: 'quote' },
  { id: 'rc-04', domain: 'Leadership', text: '"A leader\'s most powerful tool is the ability to ask the right question at the right time."', source: 'Turn the Ship Around! — L. David Marquet', type: 'quote' },
  { id: 'rc-05', domain: 'Mindfulness', text: '"You are the sky. Everything else — it\'s just the weather."', source: 'The Untethered Soul — Michael Singer', type: 'quote' },
  { id: 'rc-06', domain: 'Business', text: '"The most contrarian thing of all is not to oppose the crowd but to think for yourself."', source: 'Zero to One — Peter Thiel', type: 'quote' },
  { id: 'rc-07', domain: 'Communication', text: '"The single biggest problem in communication is the illusion that it has taken place."', source: 'Attributed to George Bernard Shaw', type: 'quote' },
  { id: 'rc-08', domain: 'Creativity', text: '"Creativity is just connecting things. When you ask creative people how they did something, they feel a little guilty because they didn\'t really do it, they just saw something."', source: 'Steve Jobs', type: 'quote' },
  { id: 'rc-09', domain: 'Decision Making', text: '"All I want to know is where I\'m going to die, so I\'ll never go there."', source: 'Poor Charlie\'s Almanack — Charlie Munger', type: 'quote' },
  { id: 'rc-10', domain: 'Systems Thinking', text: '"Today\'s problems come from yesterday\'s \'solutions.\'"', source: 'The Fifth Discipline — Peter Senge', type: 'quote' },
  // === Additional captures for daily variety ===
  { id: 'rc-11', domain: 'Deep Work', text: '"To produce at your peak level you need to work for extended periods with full concentration on a single task free from distraction."', source: 'Deep Work — Cal Newport', type: 'quote' },
  { id: 'rc-12', domain: 'Deep Work', text: '"Who you are, what you think, feel, and do, what you love — is the sum of what you focus on."', source: 'Rapt — Winifred Gallagher', type: 'quote' },
  { id: 'rc-13', domain: 'Mastery', text: '"The future belongs to those who learn more skills and combine them in creative ways."', source: 'Mastery — Robert Greene', type: 'quote' },
  { id: 'rc-14', domain: 'Mastery', text: '"An apprenticeship is not about learning a craft; it is about changing yourself."', source: 'Mastery — Robert Greene', type: 'quote' },
  { id: 'rc-15', domain: 'Psychology', text: '"A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth."', source: 'Thinking, Fast and Slow — Daniel Kahneman', type: 'quote' },
  { id: 'rc-16', domain: 'Psychology', text: '"Between stimulus and response there is a space. In that space is our power to choose our response."', source: 'Man\'s Search for Meaning — Viktor Frankl', type: 'quote' },
  { id: 'rc-17', domain: 'Leadership', text: '"Great leaders don\'t need to act tough. Their confidence and humility serve to underscore their toughness."', source: 'Leaders Eat Last — Simon Sinek', type: 'quote' },
  { id: 'rc-18', domain: 'Leadership', text: '"The task of leadership is not to put greatness into people, but to elicit it, for the greatness is there already."', source: 'John Buchan', type: 'quote' },
  { id: 'rc-19', domain: 'Mindfulness', text: '"The present moment is filled with joy and happiness. If you are attentive, you will see it."', source: 'Peace Is Every Step — Thich Nhat Hanh', type: 'quote' },
  { id: 'rc-20', domain: 'Mindfulness', text: '"Almost everything will work again if you unplug it for a few minutes, including you."', source: 'Anne Lamott', type: 'quote' },
  { id: 'rc-21', domain: 'Business', text: '"Your margin is my opportunity."', source: 'Jeff Bezos', type: 'quote' },
  { id: 'rc-22', domain: 'Business', text: '"The best time to plant a tree was 20 years ago. The second best time is now."', source: 'Chinese Proverb (often cited in The Lean Startup)', type: 'quote' },
  { id: 'rc-23', domain: 'Communication', text: '"Most people do not listen with the intent to understand; they listen with the intent to reply."', source: 'The 7 Habits of Highly Effective People — Stephen Covey', type: 'quote' },
  { id: 'rc-24', domain: 'Communication', text: '"The art of communication is the language of leadership."', source: 'James Humes', type: 'quote' },
  { id: 'rc-25', domain: 'Creativity', text: '"The chief enemy of creativity is good sense."', source: 'Pablo Picasso', type: 'quote' },
  { id: 'rc-26', domain: 'Creativity', text: '"You can\'t use up creativity. The more you use, the more you have."', source: 'Maya Angelou', type: 'quote' },
  { id: 'rc-27', domain: 'Decision Making', text: '"Whenever you see a successful business, someone once made a courageous decision."', source: 'Peter Drucker', type: 'quote' },
  { id: 'rc-28', domain: 'Decision Making', text: '"In any moment of decision, the best thing you can do is the right thing. The worst thing you can do is nothing."', source: 'Theodore Roosevelt', type: 'quote' },
  { id: 'rc-29', domain: 'Systems Thinking', text: '"You never change things by fighting the existing reality. To change something, build a new model that makes the existing model obsolete."', source: 'Buckminster Fuller', type: 'quote' },
  { id: 'rc-30', domain: 'Systems Thinking', text: '"The structure of a system determines its behavior. System structure is the source of system behavior."', source: 'Thinking in Systems — Donella Meadows', type: 'quote' },
]

// ==================== NOTION INTEGRATION ====================

const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY
const NOTION_BOOKS_DB = process.env.NOTION_BOOKS_DB_ID
const NOTION_REVIEWS_DB = process.env.NOTION_REVIEWS_DB_ID
const NOTION_ESSENTIAL_DB = process.env.NOTION_ESSENTIAL_DB_ID

async function fetchFromNotion(): Promise<{ principles: BookPrinciple[], captures: RawCapture[] } | null> {
  if (!NOTION_TOKEN || !NOTION_BOOKS_DB) return null

  try {
    // Fetch from Notion books database
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_BOOKS_DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 20 })
    })

    if (!response.ok) {
      console.error('Notion API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    // Parse Notion results into our format
    // This is a basic mapping — would need customization based on actual DB schema
    const principles: BookPrinciple[] = []
    const captures: RawCapture[] = []

    for (const page of data.results || []) {
      const props = page.properties || {}
      const title = props.Name?.title?.[0]?.plain_text || props.Title?.title?.[0]?.plain_text || ''
      const domain = props.Domain?.select?.name || props.Category?.select?.name || 'General'

      if (title) {
        captures.push({
          id: page.id,
          domain,
          text: title,
          source: 'Notion Library',
          type: 'note'
        })
      }
    }

    return { principles, captures }
  } catch (error) {
    console.error('Notion fetch error:', error)
    return null
  }
}

// ==================== HELPERS ====================

function getCurrentDomainIndex(): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return weekNumber % KNOWLEDGE_DOMAINS.length
}

function generateContextInsight(domain: string, principles: BookPrinciple[]): string {
  const domainPrinciples = principles.filter(p => p.domain === domain)
  if (domainPrinciples.length === 0) return `This week's focus is ${domain}. Explore how this domain connects to your current goals.`

  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()

  // Context-aware insight based on time
  if (dayOfWeek === 1) {
    return `Monday focus: As you plan your week with ${domain} in mind, consider how ${domainPrinciples[0].title} applies to your most important project this week.`
  }
  if (dayOfWeek === 5) {
    return `Friday reflection: How did ${domain} principles influence your decisions this week? Take 5 minutes to journal about it.`
  }
  if (hour < 10) {
    return `Morning intention: Apply "${domainPrinciples[0].title}" to your first deep work session today. ${domainPrinciples[0].actionPrompt}`
  }
  if (hour > 17) {
    return `Evening review: Did you practice any ${domain} principles today? Even small applications compound over time.`
  }

  return `Today's ${domain} focus: ${domainPrinciples[0].actionPrompt}`
}

// ==================== API HANDLERS ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'daily'

    if (action === 'daily') {
      // Try Notion first
      const notionData = await fetchFromNotion()

      const principles = notionData?.principles.length ? notionData.principles : SEED_PRINCIPLES
      const captures = notionData?.captures.length ? notionData.captures : SEED_CAPTURES

      const domainIndex = getCurrentDomainIndex()
      const currentDomain = KNOWLEDGE_DOMAINS[domainIndex]

      // Get principle for current domain
      const domainPrinciples = principles.filter(p => p.domain === currentDomain)
      const dailyPrinciple = domainPrinciples.length > 0
        ? domainPrinciples[new Date().getDate() % domainPrinciples.length]
        : principles[new Date().getDate() % principles.length]

      // Get context-aware insight
      const insight = generateContextInsight(currentDomain, principles)

      // Get raw capture
      const domainCaptures = captures.filter(c => c.domain === currentDomain)
      const dailyCapture = domainCaptures.length > 0
        ? domainCaptures[new Date().getDate() % domainCaptures.length]
        : captures[new Date().getDate() % captures.length]

      return NextResponse.json({
        currentDomain,
        domainIndex: domainIndex + 1,
        totalDomains: KNOWLEDGE_DOMAINS.length,
        weekPrinciple: dailyPrinciple,
        contextInsight: insight,
        rawCapture: dailyCapture,
        allDomains: KNOWLEDGE_DOMAINS,
        source: notionData ? 'notion' : 'seed',
        rotationNote: 'Quotes and principles rotate daily'
      })
    }

    if (action === 'domains') {
      return NextResponse.json({ domains: KNOWLEDGE_DOMAINS })
    }

    if (action === 'principles') {
      const domain = searchParams.get('domain')
      const filtered = domain
        ? SEED_PRINCIPLES.filter(p => p.domain === domain)
        : SEED_PRINCIPLES
      return NextResponse.json({ principles: filtered })
    }

    if (action === 'captures') {
      return NextResponse.json({ captures: SEED_CAPTURES })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Books GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
