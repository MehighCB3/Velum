# Velum - Personal AI Assistant

A Notion-style personal assistant UI with AI-powered chat. Currently focused on nutrition tracking.

## Features

- 📊 **Nutrition Dashboard** - Track calories, protein, carbs, and fat
- 🎯 **Daily Goals** - Set and monitor your macro targets  
- 💬 **AI Chat** - Get meal suggestions and log food via conversation
- 📁 **Notion-style Navigation** - Familiar folder structure

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option 1: One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/velum)

### Option 2: Manual deploy

1. Push this code to a GitHub repo
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Import your repo
4. Click "Deploy"

That's it! Vercel auto-detects Next.js.

## Project Structure

```
velum-app/
├── src/
│   └── app/
│       ├── globals.css      # Tailwind + custom styles
│       ├── layout.tsx       # Root layout
│       └── page.tsx         # Main app (sidebar + dashboard + chat)
├── package.json
├── tailwind.config.js
└── next.config.js
```

## Connecting to Moltbot (Optional)

The chat currently uses the Anthropic API directly. To connect to your Moltbot gateway instead:

1. Update the API endpoint in `page.tsx` to point to your gateway
2. Use your gateway's WebSocket connection for real-time chat

## Roadmap

- [ ] Persistent storage (save food logs)
- [ ] Connect to Moltbot gateway
- [ ] Coach dashboard
- [ ] Assistant/tasks dashboard
- [ ] Mobile responsive design
- [ ] User authentication

## Tech Stack

- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Anthropic API** - AI chat (Claude)

## License

MIT
