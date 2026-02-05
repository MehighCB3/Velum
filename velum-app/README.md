# Velum - Personal AI Assistant

A Notion-style personal assistant UI with AI-powered chat. Currently focused on nutrition tracking.

## Features

- **Nutrition Dashboard** - Track calories, protein, carbs, and fat
- **Daily Goals** - Set and monitor your macro targets
- **AI Chat** - Get meal suggestions and log food via conversation
- **Notion-style Navigation** - Familiar folder structure

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

## Connecting to OpenClaw (Optional)

The chat uses the [OpenClaw](https://github.com/openclaw/openclaw) gateway for AI responses. To connect:

1. Install OpenClaw: `npm install -g openclaw@latest`
2. Run onboarding: `openclaw onboard --install-daemon`
3. Set `OPENCLAW_GATEWAY_TOKEN` and `GATEWAY_URL` in your environment

See [OpenClaw docs](https://docs.openclaw.ai/start/getting-started) for full setup instructions.

## Roadmap

- [x] Persistent storage (save food logs)
- [x] Connect to OpenClaw gateway
- [x] Coach dashboard
- [x] Assistant/tasks dashboard
- [x] Mobile responsive design
- [ ] User authentication

## Tech Stack

- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **OpenClaw** - AI gateway (Claude)

## License

MIT
