# Velum Chat Speed Optimization

## Current Bottlenecks

1. **Gateway Round-trip (8-25s)**
   - `sessions_send` via OpenClaw: 25s timeout
   - Context building (memory + history): ~2s
   - Agent response generation: ~5-15s

## Quick Wins

### 1. Reduce Context Size (2-5s saved)
**File:** `velum-app/src/app/api/coach/chat/route.ts`

Change:
```typescript
const recentHistory = await getRecentContext(sessionKey, 8)  // 8 messages
```
To:
```typescript
const recentHistory = await getRecentContext(sessionKey, 3)  // 3 messages
```

### 2. Shorter Timeouts (5-10s saved)
Change:
```typescript
signal: AbortSignal.timeout(30000),  // 30s
timeoutSeconds: 25,                   // 25s
```
To:
```typescript
signal: AbortSignal.timeout(15000),   // 15s
timeoutSeconds: 12,                   // 12s
```

### 3. Streaming Response (instant feedback)
Implement streaming to show "typing..." immediately:

```typescript
// Add to route.ts
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send immediate ACK
      controller.enqueue(encoder.encode(JSON.stringify({ status: 'typing' })))
      
      // Then process...
    }
  })
  
  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### 4. Local Response Cache
Cache common responses ("Logged!", "Got it!") for instant replies:

```typescript
const quickResponses = {
  'swim': '✅ Logged swim! Great work 💪',
  'run': '✅ Run logged! Keep it up 🏃',
  'steps': '✅ Steps updated!',
  'spent': '✅ Expense tracked! 💰',
}
```

### 5. Optimistic UI (instant feedback)
**File:** `velum-mobile/src/components/Chat.tsx`

Show message immediately + "sending..." state:
```typescript
// Add message to UI instantly
setMessages(prev => [...prev, { role: 'user', content: message }])
setIsTyping(true)  // Show typing indicator

// Then send to API
const response = await coachApi.sendMessage(message)
```

## Fastest Implementation Priority

1. **Optimistic UI** (30 min) - Instant visual feedback
2. **Reduce context** (5 min) - Cut history from 8 → 3 messages  
3. **Quick response cache** (20 min) - Pre-built responses
4. **Streaming** (2 hours) - Full real-time feel

Expected result: **< 2s perceived response time**
