---
title: "Run Your Personal Assistant on Your Phone"
date: 2026-10-10
description: "Nanobot on Android with Termux, Debian, and Telegram — ARM64, background limits, and boot startup on a real device."
type: "post"
tags: ["AI", "Python", "Linux", "Telegram", "Android"]
weight: 1
summary: "Running your own AI assistant on Android: ARM64 Termux, Debian via proot-distro, Telegram, OEM battery settings, and a Termux:Boot fork — what failed, what worked, and what I would not assume on every phone."
image: /images/posts/nanobot-android-termux/hero.jpg
showTableOfContents: true
---

{{< tldr >}}
- Run **[Nanobot](https://pypi.org/project/nanobot-ai/)** on Android with **ARM64 Termux** → **Debian (proot-distro)** → Python venv → `nanobot gateway`, and talk to it from **Telegram**.
- Use **64-bit Termux** (`aarch64`). A 32-bit Termux install on a 64-bit phone breaks wheels and native builds.
- **Don’t install Nanobot in native Termux Python** if you hit Android/Rust wheel pain — **Debian ARM64** + a **RapidFuzz** binary wheel worked for me.
- **tmux alone doesn’t fix background replies.** Whitelist **Termux** in your OEM **battery / background app** settings (on my HONOR 200 / MagicOS, that was the fix).
- **Termux:Boot:** official **0.8.1** ran my script on manual broadcast but **not after a real reboot** on Android 16; **[v0.8.1-boot-fix](https://github.com/oswaldlow/termux-boot)** with a **matching-key Termux build** did, on my device only.
- **Not server-grade:** long screen-off, network drops, and force-stop behavior are still untested for me. Full commands and dead ends: [Notion notes](https://app.notion.com/p/3f54b0b02c0a815cb2dfc3e1d73d613c).
{{< /tldr >}}

# Introduction

I wanted a personal AI assistant on Telegram, running on a phone I already carry — not another always-on cloud box. [Nanobot](https://pypi.org/project/nanobot-ai/) is an open-source assistant with a Telegram channel. **`pip install` was the easy part.** The hard part was making it behave on **real Android**: correct architecture, Python packages that look like Linux, replies with Termux in the background, and startup after reboot without opening the app every time.

I tested this on **Android 16** (HONOR 200, MagicOS). The same constraints show up on many OEM skins — aggressive battery rules, boot scheduling — even when the steps are generic.

| Piece | Role |
| --- | --- |
| **Termux (ARM64)** | Linux environment on Android |
| **proot-distro → Debian ARM64** | Userspace where `pip` and wheels behave like on Linux |
| **Nanobot 0.3.5** | Gateway + Telegram integration |
| **tmux + restart loop** | Keep the gateway running; retry on crash |
| **Termux:Boot** | Run scripts after `BOOT_COMPLETED` |
| **OEM app / battery settings** | Let Termux work in the background |

**Confirmed on my device (October 2026):** Nanobot in a Debian venv (Python 3.13.5), Telegram works with Termux backgrounded, and the gateway comes back **after a real reboot** without manually opening Termux.

For commands, dead ends, and APK notes, see the [full setup notes on Notion](https://app.notion.com/p/3f54b0b02c0a815cb2dfc3e1d73d613c). This post is the story; that page is the lab notebook.

If you already use Telegram as a frontend — like in my [Converso Chatbot](/projects/conversochatbot/) project — the UX is familiar. Here the backend lives on the phone.

<!-- SCREENSHOT (optional hero): Telegram chat with the bot replying while Termux is not in the foreground. Path: static/images/posts/nanobot-android-termux/hero.jpg -->

---

# Stack overview

{{< nanobot-stack >}}

**Termux** gives you a shell and packages on Android. **`proot-distro`** installs a **Debian ARM64 rootfs** inside Termux. That is **not** a full virtual machine: there is no separate kernel, only a Linux userspace under proot. For Nanobot, that was enough to use normal ARM64 wheels instead of fighting Android-specific builds.

On Termux I also use:

- **`~/bin/nanobot-loop`** — runs `nanobot gateway` inside Debian, logs, retries on exit
- **`~/.termux/boot/00-start-nanobot`** — boot hook, wake lock attempt, starts tmux session `nanobot-host`
- **Logs** under `~/nanobot-logs/` (`boot.log`, `gateway.log`)

**Boot fix that worked for me:** [oswaldlow/termux-boot](https://github.com/oswaldlow/termux-boot) tag **`v0.8.1-boot-fix`**, with a **matching-key Termux build** (same signing family as that fork). Termux APK I recorded:

`termux-app_v0.119.0-beta.3+apt-android-7-github-debug_arm64-v8a.apk`

(GitHub ARM64 **debug** build — a non-debug ARM64 build from the same line is preferable when you can use it. Keep Termux and add-ons from compatible sources.)

> I am **not** claiming the boot fork fixes every Android 16 device, or that the original boot failure root cause is proven. Reboot auto-start is **confirmed on my phone** only.

<!-- SCREENSHOT: Diagram is enough for some readers; optional — Termux + proot-distro login showing aarch64 (Settings → About or `uname -m` in both shells). Path: .../architecture-check.png -->

---

# 32-bit Termux on a 64-bit phone

The first surprise was not Nanobot — it was **architecture**.

Android reported:

```text
arm64-v8a,armeabi-v7a,armeabi
```

Termux reported a **32-bit userspace**:

```bash
uname -m                      # armv8l
dpkg --print-architecture     # arm
```

The CPU supports ARM64, but Termux was **`arm`**, not **`aarch64`**. That broke later assumptions about wheels and Rust targets.

> **Lesson:** compare **Android’s supported ABIs** and **Termux’s architecture** separately.

I reinstalled with an ARM64 Termux APK and verified:

```bash
uname -m                      # aarch64
dpkg --print-architecture     # aarch64
```

Uninstalling Termux **wipes its private data** — back up anything you need first.

<!-- SCREENSHOT: Side-by-side or single terminal showing uname/dpkg before vs after ARM64 reinstall (blur device name if you want). -->

---

# Dead end: native Termux Python

I tried installing Nanobot directly in Termux. Build prep for **watchfiles** / **maturin** failed when Rust could not target the Android ABI Termux reported, e.g.:

```text
Python reports SOABI: cpython-314-arm-linux-androideabi
Computed rustc target triple: arm-unknown-linux-androideabi
Target triple not supported by rustup: arm-unknown-linux-androideabi
```

That is **Android/Termux packaging**, not “the phone is too slow.”

Binary-only install in Termux also failed for me:

```bash
python -m pip install --only-binary=:all: rapidfuzz watchfiles
```

Pip found **no matching distribution** for `rapidfuzz` in that environment. I did not want to compile native Android deps one by one.

---

# What worked: Debian ARM64 + venv

In **Termux**:

```bash
pkg update && pkg upgrade -y
pkg install proot-distro -y
proot-distro install debian
proot-distro login debian
```

Inside **Debian**:

```bash
uname -m                    # aarch64
dpkg --print-architecture   # arm64

apt update
apt install -y python3 python3-venv python3-pip git curl build-essential

python3 -m venv ~/nanobot-env
source ~/nanobot-env/bin/activate
python -m pip install --upgrade pip
python -m pip install --only-binary=:all: rapidfuzz
python -m pip install nanobot-ai
nanobot --help
nanobot onboard
```

The venv must live **inside Debian**. An old Termux venv is a different filesystem — I hit `No such file or directory` on `source ~/nanobot-env/bin/activate` until I created `/root/nanobot-env` in Debian.

Config: `/root/.nanobot/config.json`. Another Termux window can `proot-distro login debian` and edit the same file.

{{<details "Example config.json (placeholders only)">}}

```json
{
  "agents": {
    "defaults": {
      "model": "gpt-4.1-mini",
      "provider": "openai"
    }
  },
  "providers": {
    "openai": {
      "apiKey": "PASTE_YOUR_OPENAI_API_KEY_HERE"
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE"
    }
  }
}
```

{{< /details >}}

Restrict Telegram to your user(s) (allowlist / pairing). Review tool permissions before enabling shell or filesystem access.

Telegram’s optional deps failed **once** in my gateway log; a **retry** worked. I did not save the pip error — I will not guess it here.

<!-- SCREENSHOT: `nanobot --help` or a successful Telegram reply (no tokens in the image). -->

---

# Background execution: tmux is not enough

For manual runs inside Debian:

```bash
apt install -y tmux
tmux new -s nanobot
source ~/nanobot-env/bin/activate
nanobot gateway
```

Detach: `Ctrl+B`, then `D`. Reattach: `tmux attach -t nanobot`.

Nanobot ran in tmux, but **Telegram still failed when Termux was backgrounded**. tmux only keeps the **terminal session** alive; it does not override Android process management or battery policy.

---

# OEM settings (where HONOR / MagicOS mattered for me)

On **MagicOS** (HONOR 200), background replies started working after I changed **Termux** in system settings:

1. Search settings for **App launch** (names vary by OEM/Android version).
2. Select **Termux** → disable automatic management if offered.
3. Allow **background activity** / **auto-launch** / **run in background** (wording varies).
4. Set **battery optimization** to don’t optimize (or equivalent) for Termux.
5. Avoid “phone manager” style cleaners that force-stop Termux.

On **Samsung, Xiaomi, OnePlus**, etc., the menus differ but the pattern is the same: **whitelist Termux for background work** before you blame Nanobot or tmux.

<!-- SCREENSHOT (high value): MagicOS (or your OEM) App launch / battery screen for Termux — this is the step readers struggle to find. Path: .../termux-background-settings.jpg -->

Optional experiment (not confirmed necessary for me): in Termux, `pkg install termux-api` and `termux-wake-lock` (Termux:API companion app may be required). Wake locks cost battery.

---

# Boot after reboot: Termux:Boot + restart loop

Termux:Boot runs executable scripts in `~/.termux/boot/`. Open the Termux:Boot app once after install.

| File | Purpose |
| --- | --- |
| `~/bin/nanobot-loop` | Gateway inside Debian, log + retry loop |
| `~/.termux/boot/00-start-nanobot` | Boot log, wake lock, delay, start `nanobot-host` tmux |

{{<details "nanobot-loop (Termux bash)">}}

```bash
#!/data/data/com.termux/files/usr/bin/bash
LOG="$HOME/nanobot-logs/gateway.log"
mkdir -p "$HOME/nanobot-logs"
while true; do
  echo "[$(date)] Starting Nanobot gateway" >> "$LOG"
  proot-distro login debian -- /bin/bash -lc \
    'source /root/nanobot-env/bin/activate && exec nanobot gateway' >> "$LOG" 2>&1
  rc=$?
  echo "[$(date)] Gateway exited with code $rc; retry in 10 seconds" >> "$LOG"
  sleep 10
done
```

{{< /details >}}

{{<details "00-start-nanobot (boot script)">}}

```bash
#!/data/data/com.termux/files/usr/bin/bash
mkdir -p "$HOME/nanobot-logs"
exec >> "$HOME/nanobot-logs/boot.log" 2>&1
echo "===== Boot script fired: $(date) ====="
termux-wake-lock
sleep 15
if tmux has-session -t nanobot-host 2>/dev/null; then
  echo "[$(date)] Existing tmux session; not duplicating."
  exit 0
fi
tmux new-session -d -s nanobot-host "$HOME/bin/nanobot-loop"
```

{{< /details >}}

`chmod 700` on both scripts.

## Official Termux:Boot 0.8.1 vs real reboot

With **official Termux:Boot 0.8.1**, manual broadcast worked:

```bash
am broadcast -a android.intent.action.BOOT_COMPLETED \
  -n com.termux.boot/.BootReceiver
```

After a **real reboot**, my boot log did **not** update — scripts did not run automatically. The receiver and `~/.termux/boot/` path were fine; **delivery after reboot** was not (on my device, Android 16).

A **plausible** explanation is **BootJobService** / **JobScheduler** behavior on newer Android. That is a **hypothesis**, not a proven root cause.

Switching to **`v0.8.1-boot-fix`** plus matching Termux signing fixed reboot startup for me: Telegram works without opening Termux manually. I did **not** record the fork Boot APK filename — install from the release and match keys with your Termux build.

<!-- SCREENSHOT: `tail ~/nanobot-logs/boot.log` after reboot showing a new "Boot script fired" timestamp (redact paths if needed). -->

---

# Security, battery, reliability

| Topic | Notes |
| --- | --- |
| **Secrets** | Never publish `config.json`; use placeholders in docs |
| **Telegram** | Restrict who can talk to the bot; review enabled tools |
| **Uptime** | Android can kill background apps; this is not server-grade HA |
| **Hardware** | Continuous use → heat and battery wear |
| **Still untested for me** | Long screen-off, network loss, force-stop / cleaner behavior |

This setup works for **my** personal assistant use case — not for everyone or every OEM.

---

# Checklist if you try this

1. **ARM64 Termux** — verify `aarch64` before deep pip debugging.
2. **Debian via proot-distro** — venv and Nanobot **inside** Debian.
3. **OEM battery / background** for Termux — do this before tuning tmux.
4. **Termux:Boot** — if `am broadcast` works but reboot does not, consider the boot-fix fork and **matching APK keys**; verify with `boot.log` on **your** phone.
5. **Logs** — `boot.log` and `gateway.log`; full commands in [Notion](https://app.notion.com/p/3f54b0b02c0a815cb2dfc3e1d73d613c).

Installing Nanobot was only the beginning. **Android policy** (background + boot) is what turned a demo into something I could message after reboot — on my HONOR 200 that meant MagicOS settings; on other phones, find the equivalent Termux whitelist.

Treat one working device as **one data point**. Keep logs, match APK signing families, and do not wipe a working Debian venv to chase a guess.
