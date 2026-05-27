# Gecko Roadmap

A short, honest roadmap. Two tracks:

1. **Growth** — content/posts to attract users
2. **Product** — features to make Gecko better for those users

Updated: 2026-05-27.

---

## 1. Growth — posts & channels

Goal: get ~50 GitHub stars + ~10 weekly active downloads in the first 30 days.
Strategy: **show, don't sell**. The product is free + open. Posts demonstrate
it; they don't pitch it.

### Where to post (ranked by ROI for this niche)

| Channel | Why it works | Effort | Expected reach |
|---|---|---|---|
| **r/selfhosted** (Reddit) | The exact audience. They love new *arr-stack tools. | Low | 5-30k views per good post |
| **r/jellyfin** | Jellyfin-adjacent. Tighter community, friendlier. | Low | 1-5k |
| **r/HomeServer** + **r/HomeLab** | Less *arr-focused but mini-PC owners | Low | 2-10k |
| **Hacker News** (Show HN) | One-shot launch post. Either dies or explodes. | Low | 0-50k |
| **Mastodon** (`#selfhosted` `#homelab` tags) | Loyal niche audience, FOSS-friendly | Low | 100-500 |
| **YouTube short demos** | "Mini PC → Netflix in 5 min" demo. Massively underexploited niche. | High | 1k-100k |
| **LinkedIn / X** | Skip unless you already have a following. Wrong audience. | — | — |

### Content calendar — weeks 1-8

The cadence is **one substantive post per week**. Don't burn through
content faster than you can answer comments.

#### Week 1 — "Show HN: Gecko, a 5-min media server for non-technical users"
- **Where**: Hacker News (Tuesday or Wednesday, 8-10am PT)
- **Hook**: "I built a bootable OS that turns any mini PC into a Jellyfin
  server in 5 minutes. No Linux skills needed."
- **Includes**: 30-sec screen capture of the wizard, link to the OS image,
  one paragraph on why (existing tools assume Docker/Linux knowledge)
- **Prep**: have answers ready for the top 5 questions you'll get
  (security model, why not Plex, what about external access, hardware
  cost, legal)
- **Risk**: the "buy me a coffee" link reads as commercial. Lead with the
  free download; donations should be a footnote.

#### Week 2 — r/selfhosted demo post
- **Where**: r/selfhosted
- **Hook**: "Replaced my docker-compose homemade stack with Gecko"
- **Content**: side-by-side: 3 hours of docker-compose YAML editing vs.
  5-minute wizard. Show the actual wizard screens. Acknowledge: "Yes, I
  built it. AMA."
- **CTA**: "GitHub link in comments" (Reddit hates external links in posts)

#### Week 3 — Mini PC hardware deep dive (cross-post r/HomeServer + r/selfhosted)
- **Hook**: "I tested 6 mini PCs as Jellyfin servers — here's what
  actually works under €150"
- **Content**: condense `gecko-os/docs/HARDWARE.md` into a Reddit post
  with photos. Beelink, GMKtec, Intel NUC, etc. Honest pros/cons.
  Mention Gecko at the bottom, not in the title.
- **Why**: the hardware question is the #1 barrier for non-technical
  users. Solving it builds trust.

#### Week 4 — YouTube short: the actual wizard
- **Where**: YouTube + cross-post the link to r/selfhosted + Mastodon
- **Content**: 60-second screen capture, no narration, captioned: "From
  zero to Netflix at home in 5 minutes". Music: copyright-free.
- **Why**: most users are visual. A 60-second clip converts better than
  any docs page.

#### Week 5 — Comparison post: Gecko vs Yams vs Saltbox vs raw docker-compose
- **Where**: blog post on your site + Mastodon
- **Hook**: "I tried every easy-setup media server tool. Here's what
  works and what doesn't."
- **Content**: honest table. Where the competitors win, where Gecko
  wins. Don't pretend Gecko is best at everything — it's not.
- **Risk**: comparison posts attract hostile fans of the other tools.
  Have facts, not opinions.

#### Week 6 — AI Helper Prompt post (the actual differentiator)
- **Where**: r/selfhosted, HN as Tell HN
- **Hook**: "I ship a ChatGPT/Claude prompt with my self-hosted tool —
  zero support cost for me, infinite help for the user"
- **Content**: the prompt itself, plus screenshots of it solving real
  user problems. This is genuinely novel and worth a post on its own.
- **Why**: it's the most-original thing about Gecko. People will share
  it just for the idea.

#### Week 7 — User story / testimonial (if you have one)
- **Where**: Mastodon + Reddit
- **Hook**: "A friend's parent set up Gecko. They had never used Docker.
  They watched a movie 12 minutes after pressing power."
- **Content**: real story (with consent), real photos, real outcome.
  Highest-converting content if true. Skip if you don't have it yet.

#### Week 8 — Looking back / retrospective
- **Where**: blog + Mastodon
- **Content**: "Gecko 2 months later — what worked, what broke, what's
  next". Open about failures.

### What NOT to post

- Bombastic "Netflix killer" claims — instant credibility loss
- Affiliate links in the body — keep them in docs only
- Anything that reads as a paid placement — you're a homebrew project,
  lean into that
- Don't post on more than 2 subreddits per week (looks like spam)

### Response playbook

When the post does well, you'll get 50+ comments fast. Pre-write
responses to:
- "Why not just X?" (Plex, Yams, OMV, Casa OS, etc.)
- "Is this secure?"
- "What about external access?"
- "Why MIT and not GPL?"
- "How is it funded?" → point at the funding section on the landing

If a thread gets nasty, walk away. Replying makes it worse.

---

## 2. Product — feature roadmap

### v1.4.1 — quality-of-life fixes (next 2-4 weeks)

**Bazarr language profiles — expand beyond 3 hardcoded combos** ⭐
- *Problem*: The pre-seeded SQLite has only `cat+eng`, `spa+eng`, `eng`.
  If the user picks French/German/Italian/Portuguese/Japanese in the
  wizard, `init.py` reports SKIP and they have to configure Bazarr by
  hand.
- *Fix*: regenerate `stack/seeds/bazarr/bazarr.db` with profiles for all
  8 languages the wizard offers (ca/es/en/fr/de/pt/it/ja) × {alone, +en}.
  Update `init.py` `ensure_bazarr_language_profile()` to map every
  wizard choice to a seeded profile.
- *Effort*: ~2 hours. Reproducible via a build script
  (`stack/seeds/build-bazarr-seed.mjs`) so future language additions
  don't require manual SQLite editing.

**Wizard: optional auto-launch a movie after install**
- Once Jellyfin is up + indexers added, queue a Creative Commons movie
  download so the new user sees something working immediately.
- *Effort*: ~1 day. Risk: a CC movie isn't what users came for.

**Update binaries to embed the right version string**
- Currently `package.json` says 1.4.0 but the NSIS/.pkg artifacts ship
  as `Gecko-Setup-1.3.0-x64.exe`. Bug in the version interpolation in
  `gecko.nsi` / `pkgbuild` invocation.
- *Effort*: ~1 hour.

### v1.5.0 — first feedback-driven release (4-8 weeks)

Wait for week 1-2 user feedback before locking these in. Likely candidates:

- **External access wizard step**: detect if user wants remote access,
  walk them through Tailscale (free) install + setup. Currently in
  docs but should be in the wizard.
- **Backup / restore**: one-click export of all config (encrypted),
  one-click restore on a new machine. Currently not supported.
- **Multi-user Jellyfin profiles**: wizard asks "how many people in
  your house?" and seeds N Jellyfin accounts.
- **Optional Pi-hole add-on**: simple toggle to add network-wide ad
  blocking. Strong "wow factor" for non-technical users.

### v2.0 — only if there's demand (6+ months)

- **Hosted Gecko** (managed service) — €5/mo. Different product entirely.
- **Mobile companion app** — pause/resume the stack from your phone.
- **Multi-node clustering** — one Gecko on the TV, another on the NAS.

These are all "if 1k+ active users" features. Don't build before then.

---

## 3. What's deliberately NOT on the roadmap

- Plex support — Plex's licensing model conflicts with the homebrew
  ethos. Stay Jellyfin-first.
- *arr-stack expansions (Lidarr, Readarr) — already there for some,
  not for others. Add on request, not preemptively.
- Windows/macOS as primary platforms — they work, but Gecko OS is the
  recommended path. Don't over-invest in the desktop installers.
- Telemetry — never. Privacy is part of the value proposition.
- A web dashboard hosted by us — defeats the point.

---

## 4. Open questions (need user input)

1. **Bazarr expansion**: implement now (as v1.4.1) or wait for user
   complaints? Recommendation: do it now — it's clearly broken.
2. **First post timing**: launch on HN tomorrow, or wait until v1.4.1
   ships with the Bazarr fix? Recommendation: wait, ~1 week.
3. **Discord vs. GitHub Discussions**: pick one. Discord has higher
   engagement but more support burden. Recommendation: GitHub
   Discussions for v1.4, Discord later if there's demand.
