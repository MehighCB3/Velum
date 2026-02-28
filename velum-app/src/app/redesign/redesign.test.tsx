// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { C, FONT, FONT_SANS, ArcRing, Sparkline, MacroWheel, DarkCard, LightCard, Tag, FAB, SectionLabel, PageHeader, StatusBar, Divider, loadFonts } from './components'

afterEach(cleanup)

// ─────────────────────────────────────────────
//  DESIGN SYSTEM CONSTANTS
// ─────────────────────────────────────────────
describe('Design tokens', () => {
  it('exports all required color constants', () => {
    expect(C.bg).toBe('#f7f4f0')
    expect(C.accent).toBe('#b86a3a')
    expect(C.accentWarm).toBe('#d4854d')
    expect(C.carbsGreen).toBe('#8aab6e')
    expect(C.fatBlue).toBe('#6ab3c8')
    expect(C.success).toBe('#6fcf97')
    expect(C.danger).toBe('#eb5757')
    expect(C.purple).toBe('#7c6ae0')
    expect(C.blue).toBe('#4a9eed')
  })

  it('C has all semantic color keys', () => {
    const required = ['carbsGreen', 'fatBlue', 'success', 'danger', 'purple', 'blue'] as const
    required.forEach(key => {
      expect(C).toHaveProperty(key)
      expect(typeof C[key]).toBe('string')
    })
  })

  it('exports font constants', () => {
    expect(FONT).toContain('DM Serif Display')
    expect(FONT_SANS).toContain('DM Sans')
  })
})

// ─────────────────────────────────────────────
//  loadFonts
// ─────────────────────────────────────────────
describe('loadFonts', () => {
  afterEach(() => {
    document.getElementById('velum-redesign-fonts')?.remove()
  })

  it('appends a stylesheet link to <head>', () => {
    loadFonts()
    const link = document.getElementById('velum-redesign-fonts') as HTMLLinkElement
    expect(link).toBeTruthy()
    expect(link.rel).toBe('stylesheet')
    expect(link.href).toContain('fonts.googleapis.com')
  })

  it('does not duplicate the link on second call', () => {
    loadFonts()
    loadFonts()
    const links = document.querySelectorAll('#velum-redesign-fonts')
    expect(links.length).toBe(1)
  })
})

// ─────────────────────────────────────────────
//  ArcRing
// ─────────────────────────────────────────────
describe('ArcRing', () => {
  it('renders children in the center', () => {
    render(<ArcRing pct={50}><span data-testid="inner">50%</span></ArcRing>)
    expect(screen.getByTestId('inner')).toHaveTextContent('50%')
  })

  it('clamps pct below 0 to 0', () => {
    const { container } = render(<ArcRing pct={-20} />)
    const circles = container.querySelectorAll('circle')
    // The foreground circle should have dashoffset equal to circumference (i.e. 0% drawn)
    const fg = circles[1]
    const dasharray = parseFloat(fg.getAttribute('stroke-dasharray') || '0')
    const offset = parseFloat(fg.getAttribute('stroke-dashoffset') || '0')
    expect(offset).toBeCloseTo(dasharray, 0)
  })

  it('clamps pct above 100 to 100', () => {
    const { container } = render(<ArcRing pct={150} />)
    const fg = container.querySelectorAll('circle')[1]
    const offset = parseFloat(fg.getAttribute('stroke-dashoffset') || '0')
    expect(offset).toBeCloseTo(0, 0)
  })
})

// ─────────────────────────────────────────────
//  Sparkline
// ─────────────────────────────────────────────
describe('Sparkline', () => {
  it('renders an SVG with path elements', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelectorAll('path').length).toBe(2) // line + area
  })

  it('returns null for fewer than 2 data points', () => {
    const { container } = render(<Sparkline data={[42]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('returns null for empty data', () => {
    const { container } = render(<Sparkline data={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('handles constant data (min === max)', () => {
    const { container } = render(<Sparkline data={[5, 5, 5, 5]} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  MacroWheel
// ─────────────────────────────────────────────
describe('MacroWheel', () => {
  it('renders calorie count and goal', () => {
    render(<MacroWheel kcal={770} kcalGoal={2000} protein={47} carbs={73} fat={28} />)
    expect(screen.getByText('770')).toBeTruthy()
    expect(screen.getByText('of 2000 kcal')).toBeTruthy()
  })

  it('handles zero macros gracefully', () => {
    const { container } = render(<MacroWheel kcal={0} kcalGoal={2000} protein={0} carbs={0} fat={0} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  Card shells
// ─────────────────────────────────────────────
describe('DarkCard', () => {
  it('renders children', () => {
    render(<DarkCard><span data-testid="dc">hello</span></DarkCard>)
    expect(screen.getByTestId('dc')).toHaveTextContent('hello')
  })

  it('applies custom styles', () => {
    const { container } = render(<DarkCard style={{ padding: 0 }}>x</DarkCard>)
    expect(container.firstElementChild).toHaveStyle({ padding: '0px' })
  })
})

describe('LightCard', () => {
  it('renders children', () => {
    render(<LightCard><span>content</span></LightCard>)
    expect(screen.getByText('content')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  Tag
// ─────────────────────────────────────────────
describe('Tag', () => {
  it('renders with accent variant', () => {
    render(<Tag variant="accent">life</Tag>)
    const tag = screen.getByText('life')
    expect(tag).toHaveStyle({ background: C.accentLight })
  })

  it('renders with muted variant by default', () => {
    render(<Tag>work</Tag>)
    const tag = screen.getByText('work')
    expect(tag).toHaveStyle({ background: C.borderLight })
  })

  it('renders with green variant', () => {
    render(<Tag variant="green">done</Tag>)
    const tag = screen.getByText('done')
    expect(tag).toHaveStyle({ background: C.greenLight })
  })
})

// ─────────────────────────────────────────────
//  FAB
// ─────────────────────────────────────────────
describe('FAB', () => {
  it('renders with aria-label', () => {
    render(<FAB />)
    expect(screen.getByRole('button', { name: 'Add new item' })).toBeTruthy()
  })

  it('uses custom aria-label', () => {
    render(<FAB label="Log expense" />)
    expect(screen.getByRole('button', { name: 'Log expense' })).toBeTruthy()
  })

  it('calls onClick when clicked', async () => {
    const fn = vi.fn()
    const { container } = render(<FAB onClick={fn} />)
    const btn = within(container).getByRole('button', { name: 'Add new item' })
    await userEvent.click(btn)
    expect(fn).toHaveBeenCalledOnce()
  })
})

// ─────────────────────────────────────────────
//  SectionLabel
// ─────────────────────────────────────────────
describe('SectionLabel', () => {
  it('renders uppercase text', () => {
    render(<SectionLabel>Active Streaks</SectionLabel>)
    const el = screen.getByText('Active Streaks')
    expect(el).toHaveStyle({ textTransform: 'uppercase' })
  })
})

// ─────────────────────────────────────────────
//  PageHeader
// ─────────────────────────────────────────────
describe('PageHeader', () => {
  it('renders title as h1', () => {
    render(<PageHeader title="Fitness" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fitness')
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Budget" sub="Week 9" />)
    expect(screen.getByText('Week 9')).toBeTruthy()
  })

  it('renders right slot', () => {
    render(<PageHeader title="Nutrition" right={<span data-testid="pill">Today</span>} />)
    expect(screen.getByTestId('pill')).toHaveTextContent('Today')
  })
})

// ─────────────────────────────────────────────
//  StatusBar
// ─────────────────────────────────────────────
describe('StatusBar', () => {
  it('displays the time', () => {
    render(<StatusBar />)
    expect(screen.getByText('9:41')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
//  Divider
// ─────────────────────────────────────────────
describe('Divider', () => {
  it('renders a 1px divider', () => {
    const { container } = render(<Divider />)
    expect(container.firstElementChild).toHaveStyle({ height: '1px' })
  })
})
