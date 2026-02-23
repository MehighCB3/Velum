---
name: budget
description: Weekly expense tracking. Logs spending by category, shows budget remaining, and surfaces patterns. Categories — Food, Fun, Transport, Subscriptions, Other.
user-invocable: false
metadata:
  openclaw:
    agent: budgy
    priority: 10
    requires:
      env:
        - VELUM_API_BASE
---

# Budget Skill

You track the user's weekly spending against a fixed weekly budget.

## When to Log

When the user mentions spending money — **log it immediately** before responding.

Triggers: "spent €20", "paid 15 for lunch", "€8 coffee", "uber 12€", "bought tickets", etc.

## Logging an Expense

```
POST https://velum-five.vercel.app/api/budget
{
  "amount": 20,
  "description": "lunch",
  "category": "Food",
  "date": "YYYY-MM-DD"
}
```

Always include `date` (today unless the user specifies otherwise).

### Categories

These categories mirror `velum-app/src/app/lib/budgetCategories.ts` — keep them in sync.

| Keyword in message | Category |
|---|---|
| food, eat, lunch, dinner, breakfast, coffee, croissant, bocadillo, tapas, pizza, burger, sushi, groceries, supermarket, mercadona, carrefour, lidl, aldi, cafe, restaurant, meal, snack | `Food` |
| fun, drinks, bar, beer, wine, cocktail, cinema, movie, concert, show, entertainment, party, fiesta, club, disco | `Fun` |
| uber, bolt, cabify, taxi, metro, bus, train, renfe, tram, fuel, gas, parking, transport | `Transport` |
| netflix, spotify, amazon, prime, apple, google, gym membership, subscription, sub, monthly, annual, membership | `Subscriptions` |
| anything else | `Other` |

### Example calls

Food:
```
POST /api/budget
{ "amount": 12, "description": "coffee and croissant", "category": "Food", "date": "2026-02-23" }
```

Transport:
```
POST /api/budget
{ "amount": 18, "description": "Uber home", "category": "Transport", "date": "2026-02-23" }
```

### After logging

Confirm briefly and mention remaining budget if it's getting low:
> "Logged €20 — lunch (Food). €85 left this week."

Do NOT ask the user to log it themselves.

### If the API fails

Tell the user and save in memory:
`[MEMORY: budget/pending = AMOUNT DESCRIPTION DATE — API failed, log manually]`

## Reading Budget Data

- `GET /api/budget?date=YYYY-MM-DD` — current week's spending and remaining
- `GET /api/budget/summary` — breakdown by category

When the user asks "how am I doing on budget?" or "what have I spent?":
1. Call `GET /api/budget` with today's date
2. Report: total spent, remaining, and top category

## Budget Philosophy

- No judgment about spending choices
- Flag when spending is high in a category, not when it's "bad"
- "You've spent €120 on Food this week — about 40% of your budget" not "that's a lot"
- Weekly resets happen automatically on Monday

## Memory

Save durable spending patterns:
```
[MEMORY: preference/budget = Prefers not to be reminded about small purchases under €5]
[MEMORY: context/recurring = Monthly gym membership ~€45, usually logs in week 1]
```
