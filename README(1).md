# Personal Assistant Kit

A ready-to-use personal AI assistant built on [Moltbot](https://github.com/moltbot/moltbot). Covers coaching, nutrition, and everyday tasks.

## What's Included

```
personal-assistant-kit/
├── setup.sh                    # One-command installer
├── config/
│   └── moltbot.json           # Base configuration
├── workspace/
│   ├── SOUL.md                # Assistant personality
│   ├── AGENTS.md              # Behavioral rules
│   └── USER.md.template       # Your personal context
└── skills/
    ├── nutrition/SKILL.md     # Food & meal help
    ├── coach/SKILL.md         # Goals & accountability
    └── assistant/SKILL.md     # Tasks & life admin
```

## Quick Start

### Prerequisites
- Node.js 22+ ([download](https://nodejs.org))
- A messaging app (WhatsApp or Telegram recommended)
- Anthropic API key or Claude Pro/Max subscription

### Install

```bash
# Clone this kit
git clone https://github.com/YOUR_USERNAME/personal-assistant-kit.git
cd personal-assistant-kit

# Run setup
chmod +x setup.sh
./setup.sh
```

### Configure

1. **Edit your profile:**
   ```bash
   nano ~/clawd/USER.md
   ```
   Fill in your goals, preferences, and context.

2. **Run onboarding:**
   ```bash
   moltbot onboard --install-daemon
   ```
   This walks you through connecting your messaging channel.

3. **Start chatting!**

## Usage Examples

**Nutrition:**
> "I had a burrito for lunch"
> "What should I make for dinner? I'm tired and have chicken"
> "Is intermittent fasting worth trying?"

**Coaching:**
> "I want to start running"
> "I've been procrastinating on my project"
> "Check in on my reading habit"

**Assistant:**
> "Remind me to call the dentist Monday"
> "Help me draft an email declining a meeting"
> "What's the best way to remove coffee stains?"

## Customization

### Adjust the personality
Edit `~/clawd/SOUL.md` to change how the assistant communicates.

### Modify skills
Edit files in `~/clawd/skills/` to change domain-specific behaviors.

### Add new skills
Create a new folder in `~/clawd/skills/` with a `SKILL.md` file:
```
~/clawd/skills/fitness/SKILL.md
```

### Change the model
Edit `~/.clawdbot/moltbot.json`:
```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  }
}
```

## Channels

The assistant works through messaging apps you already use:

- **WhatsApp** — Most seamless, feels like texting a friend
- **Telegram** — Good alternative, supports bots natively
- **Signal** — Privacy-focused option
- **Discord/Slack** — If you live in these apps

Run `moltbot channels login` to set up your preferred channel.

## FAQ

**Do I need coding skills?**
No. Setup is copy-paste commands. Customization is editing text files.

**Is my data private?**
Yes. Everything runs locally on your machine. Messages go directly to your AI provider (Anthropic/OpenAI), not through any third party.

**How much does it cost?**
Moltbot is free. You pay for AI usage — either via API (~$0.01-0.10 per conversation) or a Claude Pro subscription ($20/month unlimited).

**Can I run this on a server?**
Yes. Works great on a Raspberry Pi or small VPS. See [Moltbot remote setup](https://docs.molt.bot/gateway/remote).

## Troubleshooting

```bash
# Check system health
moltbot doctor

# View logs
moltbot gateway --verbose

# Reset a channel connection
moltbot channels logout whatsapp
moltbot channels login
```

## Contributing

Found a bug or want to improve a skill? PRs welcome.

## License

MIT — do whatever you want with it.
