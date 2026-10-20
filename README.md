# Laurel

**Open-source testimonials. Collect, approve and show off what customers say — on your own infrastructure.**

Laurel is a self-hostable alternative to Senja and Testimonial.to. Send customers a link, they leave
a text or video testimonial, you approve the good ones, and they appear on your site through an
embeddable widget or a public Wall of Love.

> Status: pre-alpha. Not ready for production use yet.

## Why

Testimonial tools charge a monthly fee to collect a few dozen quotes and remove a "powered by" badge.
The real cost of the work is a database row, a few megabytes of video storage and an occasional
transcription call. Laurel gives you the product without the subscription:

- **Self-host for free** on Vercel or Docker. Every feature unlocked, unlimited testimonials.
- **Your data stays yours**: your database, your storage bucket, export anytime.
- **Or use the hosted version** if you'd rather not run anything.

## Features

- Shareable collection forms (text, star rating, video, photo, consent)
- In-browser video recording with automatic transcripts and captions (optional, bring your own AI key)
- Moderation inbox: approve, reject, tag, feature, edit display fields
- Embeddable widgets: carousel, grid, single quote, rating badge — one `<script>` tag
- Public Wall of Love page per workspace
- CSV import/export and a REST API
- Workspaces with team members
- Accessible by default: keyboard-navigable widgets, captions on every video

## Quick start (local)

```bash
git clone <repo-url> laurel && cd laurel
cp .env.example .env.local      # fill the required values (see comments)
pnpm install
pnpm db:up                      # postgres + rustfs + mailpit in docker
pnpm db:migrate && pnpm db:seed
pnpm dev                        # http://localhost:3000
```

Magic-link emails land in Mailpit at http://localhost:8025.

## Deploy

- **Vercel**: one-click button + managed Postgres + R2.
- **Docker Compose**: app + Postgres + RustFS on any VPS.

Step-by-step deployment guides will ship with the first release.

## Embed a widget

```html
<script src="https://your-domain.com/embed.js" defer></script>
<div data-laurel-widget="wgt_abc123"></div>
```

## License

MIT. See `LICENSE`.
