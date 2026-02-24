# Velum v3 — Full Redesign Implementation Spec
> **Instructions for Claude Code:** Read this entire document before starting. It contains the complete redesign spec for the Velum wellness app, screen by screen, plus a working React JSX reference file (`velum-redesign.jsx`) you should use as your visual/structural guide. Work through each screen sequentially. After each screen, verify it renders correctly before moving to the next.
---
## Project Context
Velum is a personal wellness mobile app built for a single user. It tracks nutrition, fitness, budget, and life goals. The app currently has working screens but needs a full UI overhaul plus new features. Check the existing codebase for the tech stack (React Native, Next.js, or Expo) and adapt accordingly.
---
## Global Design Tokens
```
Colors:
  bg:        #faf8f5    (main background)
  dark:      #1e1c19    (dark card backgrounds)
  darkInner: #2a2825    (nested elements inside dark cards)
  card:      #ffffff    (white cards)
  border:    #f0ece6    (card borders)
  subtle:    #f5f3ef    (dividers)
  accent:    #c4956a    (brand — warm gold)
  text:      #2d2a26    (primary text)
  muted:     #b5b0a8    (secondary text)
  dimmed:    #a09b93    (text on dark bg)
  faint:     #706b63    (tertiary on dark bg)
  success:   #6ec87a
  error:     #e85c5c
  protein:   #6ba3d6
  carbs:     #6ec87a
  fat:       #e8a85c
  purple:    #9b8ed6
Typography: "DM Sans" (Google Fonts), weights 400/500/600/700
  Screen title: 18px/700, Section: 14px/600, Card title: 13-14px/600
  Body: 13px, Caption: 11px/500, Micro: 10px, Labels: uppercase 11px, 0.04-0.06em spacing
Spacing: Card radius 16px, card padding 16-20px, section gap 24px, card list gap 8px
```
