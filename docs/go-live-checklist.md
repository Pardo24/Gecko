# Go-live checklist — Gecko v1.0

The complete list of things that need to be true for you to ONLY have
to flash USBs (or do nothing) when orders arrive. Time estimates in
parentheses. Order is roughly fastest → slowest.

## ✅ Already done (CI does this for you)

- [x] Build automation — every tagged release builds Windows .exe,
      macOS .pkg (×2 arches), and Gecko OS .img.xz
- [x] All artefacts attached to GitHub Releases automatically
- [x] Landing page live + docs published

## 🟡 5-min tasks for you to click through

### Email — set up `hello@<your-domain>` (5 min, free)

**Easiest path:**

1. Create a **ProtonMail** account: <https://proton.me/mail/pricing>
   - Free tier: 1 GB, 1 address. Plenty for now.
   - Suggest: `gecko.project@proton.me` or `gecko.os@proton.me`
   - 5 min, no card needed.

2. Later, when you have a domain on Cloudflare:
   - Cloudflare dashboard → Email → **Email Routing**
   - Forward `hello@yourdomain.tld` → `gecko.project@proton.me`
   - 100% free, zero maintenance.

**Alternative if you prefer Gmail**: just register `geckoproject@gmail.com`.
Less private but anyone knows Gmail.

**No need to self-host email.** That's a maintenance trap. Use a free
provider.

### ProtonVPN public affiliate (5 min)

1. Apply: <https://protonvpn.com/affiliate-program>
2. Open to anyone — they accept OSS publishers / small sites
3. Get your unique affiliate URL
4. Update one line on the landing + the email template with it

### Gumroad — payment processor (10 min)

1. Sign up: <https://gumroad.com/> — free, 10% fee on transactions
2. Create a product:
   - Name: "Gecko OS — pre-flashed USB"
   - Price: €35 (or whatever)
   - Type: physical (Gumroad asks shipping address from buyer)
3. Get the product URL (`gumroad.com/l/gecko-usb` or similar)
4. Replace the `alert(...)` on the landing USB button with that URL

**Alternative**: Stripe Checkout (1.4 % + €0.25, lower fees but slightly
more setup). For first 100 sales, Gumroad is fine.

### Domain (10 min, ~€10/year)

If you don't have one:
1. **Cloudflare Registrar** at-cost prices: <https://www.cloudflare.com/products/registrar/>
2. Suggest: `gecko.os` (~€30/yr), `gecko.app` (~€18/yr), `gecko.cat` (~€10/yr, .cat needs Catalan-relevance check)
3. After purchase: point at your Nubul IP via A record
4. Caddy already serves the static files; just add the domain to
   `Caddyfile`

Use Cloudflare DNS so you can enable Email Routing for free.

## 🟢 30-min tasks (do once, no recurring work)

### Wire Gumroad → landing button

Edit `gecko-web/index.html` line ~824 (the USB button):

```diff
- <a href="#" onclick="alert('Disponible aviat — escriu-nos un email a hello@gecko.cat'); return false;" class="btn btn-outline" style="width:100%;justify-content:center;">
+ <a href="https://gumroad.com/l/YOUR_PRODUCT_ID" target="_blank" class="btn btn-outline" style="width:100%;justify-content:center;">
```

Then `scp` to Nubul.

### Document your "flash + ship" workflow

When Gumroad emails you "new order":

1. Open Etcher → flash `gecko-os.img.xz` to a USB (3-4 min)
2. Print label (use Gumroad's "Mark as shipped" + Correos web)
3. Padded envelope (~€0.50, supermarket)
4. Postage stamp (~€2.50 Correos for inside-EU)
5. Drop at post box (or pick up from your home if you have it scheduled)
6. Mark as shipped in Gumroad with tracking ID

Per-order time: ~10 minutes, no thinking required.

### Setup auto-email after purchase (Gumroad does this)

Gumroad has built-in receipt emails. You can customise them:
1. Gumroad dashboard → Receipt
2. Paste the contents of `docs/email-templates/welcome.md`
3. Replace `{{purchaser_name}}` and similar with Gumroad's template tags
4. Test by buying your own product (use Gumroad's preview mode)

## 🔵 Optional but high-leverage

### GitHub Sponsors (15 min)

Enables monthly recurring donations alongside Buy Me a Coffee.
<https://github.com/sponsors/Pardo24> → enable.

Cardless donations from the open-source community are real (~€20-100/mo
for medium-active OSS projects). Set tiers €3/€10/€30 monthly.

### Hardware affiliate (Amazon, 10 min)

1. Apply to Amazon Associates (your region): <https://affiliate-program.amazon.com/>
2. After approval, generate affiliate URLs for the mini PCs in
   `gecko-os/docs/HARDWARE.md`
3. Replace direct Amazon links with your affiliated ones
4. ~3-8% commission on hardware bought via your link

### Discord server (20 min)

A free Discord server for community support — early users can help each
other, you don't bear all the support burden.

1. Create Discord account if you don't have one (5 min)
2. Make a server "Gecko Community"
3. Channels: #general, #help, #showcase
4. Create an invite link, put it on landing as "Get help on Discord"

## What you DON'T need to set up

- Cloud servers
- Customer database / CRM
- Tax compliance software (Gumroad handles EU VAT automatically)
- Helpdesk (the AI prompt + GitHub issues are enough for v1.0)
- Marketing automation
- Custom paywall infra

## Recurring tasks once live

| Task | Frequency | Time |
|---|---|---|
| Flash + ship USB | Per-order | 10 min |
| Respond to GitHub issues | Weekly | 30-60 min |
| Update Docker images (auto via Recyclarr) | Monthly | 0 min — automated |
| Tag a new release (when you have features) | Quarterly-ish | 5 min (tag + push, CI does rest) |
| Check Gumroad payouts | Monthly | 2 min |

Total ongoing: **~1-2 hours per week** if you have ~10 orders/week.

## When to escalate

If you hit 100+ orders/month:
- Switch from Correos manual drop-off to scheduled pickup
- Bulk-print labels (Correos has API for this)
- Consider hiring someone for €15/hour to handle physical packaging

If you hit 500+ active users:
- Re-evaluate the VPN partnership pitch (you'll have real numbers)
- Consider GitHub Sponsors waitlist for "priority support" tier

If you hit 1000+ active users:
- Hosted version ("Gecko Cloud") becomes a real product
- Hire someone for community / docs
- Negotiate hardware bundle deals (Beelink direct, etc.)

## Bottom line

After the 5-min + 30-min tasks above are done, your operating model is:

```
Email arrives → Flash USB → Drop at post box → Mark shipped
                ⏱ 10 min
```

Everything else (build, release, docs, support escalation) is either
automated, community-driven, or one-time setup.
