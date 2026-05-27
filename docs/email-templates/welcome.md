# Welcome email — sent after Gumroad confirms payment

Plain-text email. Personalised by Gumroad's `{{purchaser_name}}` and
`{{order_id}}` template tags. Keep it short — first impression matters.

---

**Subject:** Your Gecko USB is on its way 🦎

---

**Body:**

Hi {{purchaser_name}},

Thanks for buying Gecko — order **#{{order_id}}**.

Your USB is being flashed and will be in the post within 48 hours.
Tracking number will arrive in a follow-up email.

**While you wait, here's what to prep:**

1. **Pick your hardware** — if you don't have a mini PC yet, see
   our hardware guide: [docs/HARDWARE.md][hw]. The Beelink S12 Pro
   (~€140) is the easy choice; a used Dell OptiPlex Micro from eBay
   (~€70) is the cheap one.

2. **External HDD** — anything USB-3.0 with the space you need.
   4 TB is enough for ~1500 movies or ~5000 series episodes.

3. **VPN — actually important.** We strongly recommend signing up
   to **ProtonVPN** before plugging in the USB. They have a free
   plan (no P2P) and a paid plan at ~€4/mo (with P2P + WireGuard).
   Sign up here: <https://go.getproton.me/aff_c?offer_id=26&aff_id=7925>
   (our affiliate link — same price for you, helps fund Gecko).

   Why VPN: in DE/FR/UK/US, downloading without one gets you ISP
   notices within weeks. In ES/IT it's lighter but not zero risk.
   At ~€4/mo, the VPN pays for itself in skipped streaming
   subscriptions.

   Alternative: **Mullvad** (~€5/mo, accepts cash, best privacy
   reputation, no affiliate so it's an honest recommendation, not
   commission-driven).

4. **Read [Getting Started][gs]** (5 min) to know what each wizard
   step asks for.

**When the USB arrives:**

- Plug into the mini PC + HDMI to your TV + ethernet + external HDD
- Power on, follow the wizard
- ~5 minutes later, you're streaming

**If anything goes wrong:**

- Copy [this AI helper prompt][ai] into ChatGPT or Claude, describe
  your problem in plain language. It knows Gecko's architecture and
  will give specific advice. (We pay zero AI costs — you bring your
  own.)
- Or open an issue on [GitHub][gh], we'll help.

Thanks again,

Dani
[gecko-web/](https://github.com/Pardo24/Gecko)
[Buy Me a Coffee](https://buymeacoffee.com/danipardo24)

---

[hw]: https://github.com/Pardo24/Gecko/blob/main/gecko-os/docs/HARDWARE.md
[gs]: https://github.com/Pardo24/Gecko/blob/main/docs/getting-started.md
[ai]: https://github.com/Pardo24/Gecko/blob/main/docs/ai-helper-prompt.md
[gh]: https://github.com/Pardo24/Gecko/issues

---

## Notes for whoever sends this

- The ProtonVPN link is our **public affiliate URL** — same price
  for the buyer, ~35% recurring commission for us (~€1.40/mo per
  paying subscriber). Sign up to ProtonVPN's affiliate program at
  <https://protonvpn.com/affiliate-program> and replace the URL
  with your own affiliate ID.
- Track the open + click rate via Gumroad's email analytics. If <40%
  open rate, the subject line needs work.
- Once you have ~500 active users, see `docs/partner-pitch.md` for
  negotiating an extended-trial deal with Proton or Surfshark.

## Variants

- **No-VPN customer** (they chose "No VPN" at wizard): follow-up
  email at day 30 with a gentle "got ISP notice yet? Here's how to
  add a VPN later" reminder, with the affiliate link.
- **Hardware-not-yet-bought**: link to HARDWARE.md prominently, since
  shipping is faster than they'll buy the PC.
