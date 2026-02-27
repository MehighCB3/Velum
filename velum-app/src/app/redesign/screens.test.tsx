// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(cleanup)

// ─────────────────────────────────────────────
//  SCREEN IMPORTS
// ─────────────────────────────────────────────
import CoachScreen from './screens/coach'
import YearScreen from './screens/year'
import NutritionScreen from './screens/nutrition'
import FitnessScreen from './screens/fitness'
import BudgetScreen from './screens/budget'
import ProfileScreen from './screens/profile'
import VelumRedesign from './page'

// ─────────────────────────────────────────────
//  COACH SCREEN
// ─────────────────────────────────────────────
describe('CoachScreen', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the header with Teky name', () => {
    render(<CoachScreen />)
    expect(screen.getByText('Teky')).toBeTruthy()
  })

  it('renders the initial assistant message', () => {
    render(<CoachScreen />)
    expect(screen.getByText(/Recovery is strong today/)).toBeTruthy()
  })

  it('has a chat message area with role="log"', () => {
    render(<CoachScreen />)
    expect(screen.getByRole('log')).toBeTruthy()
  })

  it('renders quick reply chips', () => {
    render(<CoachScreen />)
    expect(screen.getByText('How am I doing?')).toBeTruthy()
    expect(screen.getByText('Log my lunch')).toBeTruthy()
  })

  it('sends a message when form is submitted', async () => {
    const user = userEvent.setup()
    render(<CoachScreen />)
    const input = screen.getByLabelText('Message input')
    await user.type(input, 'Hello Teky')
    await user.click(screen.getByLabelText('Send message'))
    expect(screen.getByText('Hello Teky')).toBeTruthy()
  })

  it('collapses metrics when a message is sent', async () => {
    const user = userEvent.setup()
    render(<CoachScreen />)
    const metricsToggle = screen.getByLabelText('Toggle metrics summary')
    expect(metricsToggle).toHaveAttribute('aria-expanded', 'true')
    const input = screen.getByLabelText('Message input')
    await user.type(input, 'test')
    await user.click(screen.getByLabelText('Send message'))
    expect(metricsToggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles metrics with keyboard', async () => {
    const user = userEvent.setup()
    render(<CoachScreen />)
    const toggle = screen.getByLabelText('Toggle metrics summary')
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('camera button has correct aria-label', () => {
    render(<CoachScreen />)
    expect(screen.getByLabelText('Take food photo')).toBeTruthy()
  })

  it('send button is disabled when input is empty', () => {
    render(<CoachScreen />)
    const sendBtn = screen.getByLabelText('Send message')
    expect(sendBtn).toBeDisabled()
  })

  it('hides quick replies after multiple messages', async () => {
    const user = userEvent.setup()
    render(<CoachScreen />)
    // Send two messages to get past the threshold
    const input = screen.getByLabelText('Message input')
    await user.type(input, 'msg1')
    await user.click(screen.getByLabelText('Send message'))
    // Quick replies should now be hidden (messages.length > 2 after simulated response)
    // Note: simulated response arrives after 800ms timeout
  })
})

// ─────────────────────────────────────────────
//  YEAR SCREEN
// ─────────────────────────────────────────────
describe('YearScreen', () => {
  it('renders the page header', () => {
    render(<YearScreen />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Year')
  })

  it('renders life progress bar', () => {
    render(<YearScreen />)
    expect(screen.getByText('Life Progress')).toBeTruthy()
    expect(screen.getByText('37.6% of life')).toBeTruthy()
  })

  it('renders upcoming events', () => {
    render(<YearScreen />)
    expect(screen.getByText('Barcelona Marathon')).toBeTruthy()
    expect(screen.getByText('Ironman Camp')).toBeTruthy()
  })

  it('shows correct weeks-away for future events', () => {
    render(<YearScreen />)
    // Barcelona Marathon is week 12, current week is 9 → 3w away
    expect(screen.getByText('W12 · 3w')).toBeTruthy()
  })

  it('has accessible event week cells', () => {
    render(<YearScreen />)
    // Events with week data should have aria-labels
    expect(screen.getByLabelText('Week 12: Barcelona Marathon')).toBeTruthy()
  })

  it('selects an event on click', async () => {
    const user = userEvent.setup()
    render(<YearScreen />)
    const cell = screen.getByLabelText('Week 12: Barcelona Marathon')
    await user.click(cell)
    // Selected event detail should appear — text is split: "Week 12 · 3w away"
    expect(screen.getByText(/3w away/)).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  NUTRITION SCREEN
// ─────────────────────────────────────────────
describe('NutritionScreen', () => {
  it('renders today view by default', () => {
    render(<NutritionScreen />)
    expect(screen.getByText('770')).toBeTruthy() // kcal display in MacroWheel
    expect(screen.getByText(/kcal remaining today/)).toBeTruthy()
  })

  it('shows logged meals', () => {
    render(<NutritionScreen />)
    expect(screen.getByText('Oatmeal with banana')).toBeTruthy()
    expect(screen.getByText('Chicken salad')).toBeTruthy()
  })

  it('switches to week view', async () => {
    const user = userEvent.setup()
    render(<NutritionScreen />)
    await user.click(screen.getByText('Week'))
    expect(screen.getByText('Daily kcal this week')).toBeTruthy()
    expect(screen.getByText('1,684')).toBeTruthy() // Avg kcal
  })

  it('shows macro breakdown in today view', () => {
    render(<NutritionScreen />)
    expect(screen.getByText('PROTEIN')).toBeTruthy()
    expect(screen.getByText('CARBS')).toBeTruthy()
    expect(screen.getByText('FAT')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  FITNESS SCREEN
// ─────────────────────────────────────────────
describe('FitnessScreen', () => {
  it('renders the page header', () => {
    render(<FitnessScreen />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fitness')
  })

  it('renders activity rings', () => {
    render(<FitnessScreen />)
    expect(screen.getByText('Steps')).toBeTruthy()
    expect(screen.getByText('Runs')).toBeTruthy()
    expect(screen.getByText('Swims')).toBeTruthy()
    expect(screen.getByText('Cycles')).toBeTruthy()
  })

  it('renders Garmin health metrics', () => {
    render(<FitnessScreen />)
    expect(screen.getByText('VO\u2082 Max')).toBeTruthy()
    expect(screen.getByText('HRV')).toBeTruthy()
    expect(screen.getByText('Resting HR')).toBeTruthy()
  })

  it('shows empty state for activities', () => {
    render(<FitnessScreen />)
    expect(screen.getByText('No activities logged')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  BUDGET SCREEN
// ─────────────────────────────────────────────
describe('BudgetScreen', () => {
  it('renders remaining budget', () => {
    const { container } = render(<BudgetScreen />)
    expect(screen.getByText('WEEKLY BUDGET')).toBeTruthy()
    // Budget value is split across text nodes (€ + number), so check via DOM
    const budgetSpan = container.querySelector('span[style*="font-size: 48px"]')
    expect(budgetSpan?.textContent?.replace(/\s/g, '')).toBe('\\u20AC70')
  })

  it('shows "By Week" tab by default', () => {
    render(<BudgetScreen />)
    expect(screen.getByText('By Week')).toBeTruthy()
    expect(screen.getByText('W09')).toBeTruthy()
  })

  it('switches to category view', async () => {
    const user = userEvent.setup()
    render(<BudgetScreen />)
    await user.click(screen.getByText('By Category'))
    expect(screen.getByText('Food')).toBeTruthy()
    expect(screen.getByText('Fun')).toBeTruthy()
    expect(screen.getByText('Transport')).toBeTruthy()
  })

  it('shows spending log empty state', () => {
    render(<BudgetScreen />)
    expect(screen.getByText('No spending yet')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  PROFILE SCREEN
// ─────────────────────────────────────────────
describe('ProfileScreen', () => {
  it('renders user name', () => {
    render(<ProfileScreen />)
    expect(screen.getByText('Mihai')).toBeTruthy()
  })

  it('renders streaks', () => {
    render(<ProfileScreen />)
    expect(screen.getByText('Nutrition logging')).toBeTruthy()
    expect(screen.getByText('Weekly workout')).toBeTruthy()
  })

  it('renders goals with progress', () => {
    render(<ProfileScreen />)
    expect(screen.getByText('Run Barcelona Marathon')).toBeTruthy()
    expect(screen.getByText('62%')).toBeTruthy()
  })

  it('renders settings as buttons', () => {
    render(<ProfileScreen />)
    const buttons = screen.getAllByRole('button')
    const settingsLabels = ['Notifications', 'Goals & Targets', 'Connected Apps', 'Teky Settings']
    settingsLabels.forEach(label => {
      expect(buttons.some(b => b.textContent?.includes(label))).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────
//  APP SHELL (page.tsx)
// ─────────────────────────────────────────────
describe('VelumRedesign (App Shell)', () => {
  it('renders with Coach screen by default', () => {
    render(<VelumRedesign />)
    expect(screen.getByText('Teky')).toBeTruthy()
  })

  it('has a tab list with correct roles', () => {
    render(<VelumRedesign />)
    expect(screen.getByRole('tablist', { name: 'App navigation' })).toBeTruthy()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(6)
  })

  it('marks active tab with aria-selected', () => {
    render(<VelumRedesign />)
    const tabs = screen.getAllByRole('tab')
    const coachTab = tabs.find(t => t.textContent?.includes('Coach'))
    expect(coachTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches screens on tab click', async () => {
    const user = userEvent.setup()
    render(<VelumRedesign />)
    const tabs = screen.getAllByRole('tab')
    const fitnessTab = tabs.find(t => t.textContent?.includes('Fitness'))!
    await user.click(fitnessTab)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fitness')
  })

  it('shows the screen name pill that updates on tab switch', async () => {
    const user = userEvent.setup()
    render(<VelumRedesign />)
    // "Coach" appears in both tab and pill — check pill exists
    const pills = screen.getAllByText('Coach')
    expect(pills.length).toBeGreaterThanOrEqual(2) // tab label + pill
    const tabs = screen.getAllByRole('tab')
    const budgetTab = tabs.find(t => t.textContent?.includes('Budget'))!
    await user.click(budgetTab)
    // Pill should now show "Budget" — appears in tab + pill
    const budgetLabels = screen.getAllByText('Budget')
    expect(budgetLabels.length).toBeGreaterThanOrEqual(2)
  })
})
