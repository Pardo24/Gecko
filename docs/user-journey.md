# Gecko user journey — from buying to streaming

The full path a customer takes, broken into stages. Everything *we* have to
do is on the left; everything *they* have to do is on the right.

```
  US (you, the operator)                  THE CUSTOMER
  ─────────────────────                   ────────────────────────

  1. Customer arrives via SEO,
     r/selfhosted post, or word
     of mouth → lands on the
     gecko-web/ landing page

  2. They read FAQ + price
     and click "Buy USB" (€35
     via Gumroad checkout)

  3. Order email arrives:                ─→  Pays. Gets receipt + thank-you
     "name, address, language        ←─       email with order ID, tracking
     pref, paid €35"                          info, AI helper prompt link

  4. You: flash USB at home
     (~3 min per stick), drop
     into padded envelope,
     write address, Correos
     stamp, drop at post box
     → ~5 € shipping inside EU

  5. (4-7 days later)                    ─→  Envelope arrives. USB inside,
                                              tiny printed instruction card
                                              ("plug it in, follow what the
                                              TV shows. AI helper at
                                              gecko.tld/help")

  6. (Customer side, no further
     action from you needed
     unless something breaks)

                                          7. Plugs USB into mini PC, plugs
                                             HDMI to TV, plugs ethernet,
                                             powers on. ~30 s later:
                                             welcome screen on the TV.

                                          8. Follows 6 wizard steps (3-5 min):
                                             • Welcome → Start
                                             • WiFi (or skipped if ethernet)
                                             • External drive picker
                                             • Admin password
                                             • Subtitle language (CA+EN /
                                               ES+EN / EN only)
                                             • VPN (optional, can defer)
                                             • Install — wait 5 min while
                                               Gecko configures itself

                                          9. Dashboard appears on the TV.
                                             Customer reads the
                                             "next step: add an indexer"
                                             card. Opens Prowlarr (link
                                             button in dashboard), adds
                                             their preferred indexer
                                             (public, private, Usenet).

                                         10. (Optional) Settings → Move
                                             Gecko to internal disk. ~5 min,
                                             reboot. Remove USB, reuse it.

                                         11. Daily use: open Jellyfin on
                                             phone / TV / browser, watch
                                             content. Request new movies
                                             via Jellyseerr (the family-
                                             friendly request portal).

  12. Maybe weekly: customer
      sees a red light in the
      dashboard. Three paths:

  ── 12a. Customer reads
          docs/troubleshooting.md
          → finds their symptom
          → runs the fix.
          (You aren't involved.)

  ── 12b. Customer copies the
          AI helper prompt into
          ChatGPT / Claude →
          gets specific advice →
          fixes it.
          (You aren't involved.
          You pay zero tokens.)

  ── 12c. Customer opens a
          GitHub issue. You
          (or community) read,
          help, document.

  13. (Major release every
     ~2-3 months): customer
     re-flashes USB with new
     image. Their config on
     external HDD is preserved.
```

## Where revenue comes from

| Source | Amount per buyer | Required actions |
|---|---|---|
| Direct USB sale | ~€20 net (after stripe + Correos) | Flash + ship |
| VPN affiliate (Mullvad, Surfshark) | ~€5-15 if they enable VPN at wizard | Just include the affiliate link in step 5 |
| Amazon hardware affiliate | ~€3-8 per mini-PC recommendation followed | List specific products with affiliate URLs in `docs/HARDWARE.md` and landing |
| GitHub Sponsors / Buy Me a Coffee | Tip jar | Nothing — passive |

100 sales at ~€30 net (USB + average affiliate) = €3,000 per launch
month. Sustainable for "the founder works on this evenings + weekends"
economics.

## Where we DON'T spend money

- No cloud servers (Gecko is fully self-hosted by the customer)
- No AI API tokens (the helper prompt runs on the customer's own AI account)
- No paid analytics
- No paid support tier (community + AI helper handle 90%)
- No code signing for Windows (SignPath is free for OSS once we apply;
  works around the SmartScreen "unknown publisher" warning)

## Where things might go wrong

| Risk | Severity | Mitigation |
|---|---|---|
| Customer's hardware too weak → bad first experience | High | HARDWARE.md is loud about minimum specs. Pre-flight check in wizard warns before they install. |
| Customer's BIOS won't boot from USB | Medium | Troubleshooting doc; common BIOS keys listed; "if all else fails: refund + ship pre-installed mini-PC" |
| VPN credentials wrong | Medium | Wizard validates the connection before storing; explicit error message if Gluetun fails health check |
| ISP blocks BitTorrent → 0 download speed | Medium | We recommend VPN; if customer skipped, troubleshooting points them to enable it |
| External HDD format unsupported | Low | Wizard checks `DATA_PATH` is writable; warns if NTFS or exFAT |
| Customer accidentally clicks "Move to disk" → wipes wrong drive | Catastrophic | Modal demands typing the exact disk model; can't fat-finger |
| Container update breaks something | Medium | Weekly auto-update but watchtower-style logic + rollback isn't there yet — manual via `docker compose up -d --force-recreate` |

## Where we keep iterating after launch

- **Hardware compat list grows** as beta + early users report
- **FAQ grows** with every repeat question (we update before answering 3rd time)
- **AI prompt** gets refined as we see which questions confuse the LLM
- **i18n** stays at EN/ES/CA until 50+ customers in another language
  request it (then we add it via Crowdin community translations)
