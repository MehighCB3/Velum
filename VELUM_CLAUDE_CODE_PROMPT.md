# Velum + Moltbot Integration — Claude Code Instructions

## Project Overview

**Velum** is a web UI chat interface deployed on Vercel that connects to a **Moltbot gateway** running on a Raspberry Pi 5. The Pi is the single source of truth for all data — conversations, memory, and nutrition tracking.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                            │
├─────────────────────┬───────────────────────────────────────────┤
│   Telegram App      │              Velum Web UI                 │
│   @Teky_mihai_bot   │         velum-five.vercel.app             │
└─────────┬───────────┴─────────────────┬─────────────────────────┘
          │                             │
          │ Telegram Bot API            │ HTTPS (Tailscale Funnel)
          │                             │
          ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              RASPBERRY PI 5 (rasppi5.tail5b3227.ts.net)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              MOLTBOT GATEWAY (port 18789)               │   │
│   │                                                         │   │
│   │  • Auth: password mode (Bearer token)                   │   │
│   │  • Bind: loopback (127.0.0.1)                          │   │
│   │  • Exposed via: Tailscale Funnel                       │   │
│   │                                                         │   │
│   │  HTTP APIs:                                             │   │
│   │  • POST /v1/chat/completions  (OpenAI-compatible)      │   │
│   │  • POST /tools/invoke         (direct tool calls)      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    LLM PROVIDER                         │   │
│   │           Moonshot Kimi K2 (kimi-k2-0905-preview)      │   │
│   │                  256k context window                    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   DATA STORAGE (on Pi)                  │   │
│   │                                                         │   │
│   │  Sessions:     ~/.clawdbot/agents/main/sessions/*.jsonl │   │
│   │  Memory:       ~/clawd/MEMORY.md                        │   │
│   │  Daily notes:  ~/clawd/memory/YYYY-MM-DD.md            │   │
│   │  Memory index: ~/.clawdbot/memory/main.sqlite          │   │
│   │  Config:       ~/.clawdbot/clawdbot.json               │   │
│   │                                                         │   │
│   │  Skills:       ~/clawd/skills/                          │   │
│   │  Nutrition:    ~/clawd/nutrition/food-log.json         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Principle: Pi is Single Source of Truth

**DO NOT** create a separate database in Velum (Vercel). All data flows through the Moltbot gateway on the Pi:

- ✅ Conversations persist via Moltbot sessions
- ✅ Memory persists in Markdown files on Pi
- ✅ Nutrition data persists in JSON on Pi
- ✅ Telegram and Velum share the same session/memory

---

## Moltbot Gateway Details

### Connection Info
- **Public URL:** `https://rasppi5.tail5b3227.ts.net`
- **Local URL:** `http://127.0.0.1:18789` (on Pi only)
- **Auth mode:** Password (Bearer token)
- **Gateway password:** Set in environment variable `GATEWAY_PASSWORD`

### API Endpoints

#### 1. OpenAI-Compatible Chat API (RECOMMENDED)
```
POST /v1/chat/completions
```

This is the preferred endpoint for Velum. It:
- Supports streaming
- Maintains session persistence via the `user` field
- Returns responses in OpenAI format

**Request:**
```json
{
  "model": "moltbot",
  "user": "velum:user-123",
  "stream": true,
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

**Headers:**
```
Authorization: Bearer <GATEWAY_PASSWORD>
Content-Type: application/json
x-moltbot-agent-id: main
```

**Session persistence:** The `user` field creates a stable session key. Use a consistent format like `velum:<unique-user-id>` so the same user always gets the same session.

#### 2. Tools Invoke API (for direct tool calls)
```
POST /tools/invoke
```

Use this for specific tool invocations without going through the full agent loop.

**Request:**
```json
{
  "tool": "agent_send",
  "args": {
    "message": "What did I eat today?"
  },
  "agentId": "main",
  "sessionKey": "main"
}
```

---

## Velum Implementation Requirements

### Environment Variables (Vercel)
```
GATEWAY_URL=https://rasppi5.tail5b3227.ts.net
GATEWAY_PASSWORD=<the-gateway-password>
```

### API Route: `/api/chat`

Create a Next.js API route that proxies requests to the Moltbot gateway:

```typescript
// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages, userId } = await req.json();
  
  const GATEWAY_URL = process.env.GATEWAY_URL;
  const GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD;
  
  // Create stable session key for this user
  const sessionUser = userId ? `velum:${userId}` : 'velum:anonymous';
  
  const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_PASSWORD}`,
      'Content-Type': 'application/json',
      'x-moltbot-agent-id': 'main'
    },
    body: JSON.stringify({
      model: 'moltbot',
      user: sessionUser,
      stream: true,
      messages: messages
    })
  });
  
  // Stream the response back to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### Frontend Chat Component

The frontend should:
1. Send messages to `/api/chat`
2. Handle Server-Sent Events (SSE) streaming
3. Display responses as they arrive
4. Persist a `userId` in localStorage for session continuity

```typescript
// Example streaming handler
async function sendMessage(message: string) {
  const userId = localStorage.getItem('velum-user-id') || crypto.randomUUID();
  localStorage.setItem('velum-user-id', userId);
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    })
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    // Parse SSE format: data: {...}\n\n
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const json = JSON.parse(line.slice(6));
        const content = json.choices?.[0]?.delta?.content;
        if (content) {
          // Append to current response
          appendToResponse(content);
        }
      }
    }
  }
}
```

---

## Nutrition Skill Integration

A nutrition tracking skill is installed on the Pi at:
```
~/clawd/skills/nutrition/SKILL.md
```

### Capabilities
- Analyze food photos (via Kimi K2 vision)
- Log meals with calories/macros
- Query daily/weekly nutrition summaries
- Store data in `~/clawd/nutrition/food-log.json`

### Using from Velum

Just send natural language requests through the chat API:

```javascript
// Log food
messages: [{ role: 'user', content: 'Log 2 eggs and toast for breakfast' }]

// Query
messages: [{ role: 'user', content: 'What did I eat today?' }]

// With image (base64)
messages: [{
  role: 'user',
  content: [
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } },
    { type: 'text', text: 'Log this meal for lunch' }
  ]
}]
```

---

## File Structure on Pi

```
/home/pablissimopie/
├── clawd/                          # Moltbot workspace
│   ├── MEMORY.md                   # Long-term memory
│   ├── SOUL.md                     # Personality/behavior
│   ├── USER.md                     # User context
│   ├── memory/                     # Daily notes
│   │   └── YYYY-MM-DD.md
│   ├── skills/                     # Custom skills
│   │   └── nutrition/
│   │       └── SKILL.md
│   └── nutrition/                  # Nutrition data
│       └── food-log.json
│
└── .clawdbot/                      # Moltbot state
    ├── clawdbot.json               # Main config
    └── agents/
        └── main/
            ├── sessions/           # Conversation history
            │   └── *.jsonl
            └── agent/
                └── auth-profiles.json
```

---

## Testing the Integration

### 1. Test Gateway Connectivity
```bash
curl -X POST https://rasppi5.tail5b3227.ts.net/v1/chat/completions \
  -H "Authorization: Bearer <PASSWORD>" \
  -H "Content-Type: application/json" \
  -H "x-moltbot-agent-id: main" \
  -d '{"model":"moltbot","messages":[{"role":"user","content":"Hello!"}]}'
```

### 2. Test Session Persistence
Send two messages with the same `user` field — the second should remember context from the first.

### 3. Test Streaming
Add `"stream": true` and verify SSE chunks arrive progressively.

---

## Common Issues & Solutions

### CORS Errors
- Never call the gateway directly from browser JavaScript
- Always proxy through your `/api/chat` route

### Gateway Unreachable
- Check Tailscale Funnel is running: `tailscale serve status`
- Verify gateway is running: `systemctl --user status clawdbot-gateway`
- Test locally on Pi: `curl http://127.0.0.1:18789/health`

### Session Not Persisting
- Ensure you're passing the same `user` field consistently
- Check the `x-moltbot-agent-id` header is set to `main`

### Nutrition Skill Not Working
- Verify skill is loaded: `/usr/bin/clawdbot skills list`
- Check FatSecret API credentials are configured
- Restart gateway after config changes: `/usr/bin/clawdbot gateway restart`

---

## Summary

| Component | Location | Technology |
|-----------|----------|------------|
| Web UI | Vercel | Next.js |
| API Proxy | Vercel `/api/chat` | Next.js API Route |
| AI Gateway | Raspberry Pi 5 | Moltbot |
| LLM | Moonshot API | Kimi K2 |
| Data Storage | Pi filesystem | JSONL, Markdown, JSON |
| Public Access | Tailscale Funnel | HTTPS |

**Key URLs:**
- Velum: `https://velum-five.vercel.app`
- Gateway: `https://rasppi5.tail5b3227.ts.net`
- Telegram Bot: `@Teky_mihai_bot`
