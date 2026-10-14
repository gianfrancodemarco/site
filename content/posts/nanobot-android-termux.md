---
title: "Run Your Personal Assistant on Your Phone"
date: 2026-10-10
description: "Nanobot on Android with Termux, Debian, and Telegram. ARM64, background limits, and boot startup on a real device."
type: "post"
draft: true
featured: true
tags: ["AI", "Python", "Linux", "Telegram", "Android"]
weight: 1
summary: "Running Nanobot on Android with Termux, Debian, and Telegram: the goal, how the stack fits together, and the setup that worked on my phone."
image: /images/posts/nanobot-android-termux/hero.jpg
showTableOfContents: true
---

{{< tldr >}}
- **Goal:** **[Nanobot](https://pypi.org/project/nanobot-ai/)** on Android, reachable on **Telegram** (text and voice), with the gateway on the phone (ARM64 Termux, Debian via `proot-distro`, venv, `nanobot gateway`).
- **Voice notes:** top-level **`transcription`** in `config.json` with OpenAI **`whisper-1`**, **`language`: `it`** (uses the same OpenAI API key; audio may be billed separately).
- **Stack:** Telegram → Nanobot in **Debian** → **proot** inside **Termux** → Android (battery and boot policy matter).
- Use **64-bit Termux** (`aarch64`); install Nanobot in **Debian**, not Termux Python.
- **OEM background/battery** settings for Termux were required for replies when the app is not open (MagicOS on my HONOR 200).
- **Termux:Boot:** [v0.8.1-boot-fix](https://github.com/oswaldlow/termux-boot) with matching-key Termux worked after reboot on my device; official 0.8.1 did not.
- Long screen-off, network loss, and force-stop are still untested for me.
{{< /tldr >}}

# Introduction

I wanted a personal assistant I could reach on Telegram: change the model and tools in config, add scripts when I need them, send **voice notes** when typing is awkward, and get proactive output too (I already use it for **reminders** and a **custom newsletter every morning**). [Nanobot](https://pypi.org/project/nanobot-ai/) matched that for me. It is open source, runs as a gateway I control, and speaks Telegram without me writing a bot from scratch.

I run the gateway on my phone instead of a small VPS. I wanted the config and logs on hardware I already carry, and I did not want another monthly host bill on top of LLM API usage. A phone is not a datacenter, and Android can limit background work, but for a personal assistant that trade-off was fine.

The result on my **HONOR 200** (**Android 16**, MagicOS, October 2026): Nanobot **0.3.5** in Debian ARM64, Telegram when Termux is in the background, and the gateway back after reboot without opening Termux. I have built Telegram bots before ([Converso Chatbot](/projects/conversochatbot/)); this post is the Android wiring (Termux, proot, Debian, boot) that makes that setup stick.

# How Termux, proot, Debian, and tmux fit together

Android only gives you one kernel. Everything below still runs under Android; there is no second operating system and no full VM.

**Termux** is an Android app with a Linux-style shell and `pkg`. Programs there are built for Android (Bionic libc). Android treats Termux like any app for battery, background, and boot.

**proot** (used by **`proot-distro`**) lets a directory on disk behave like the root of a normal Linux system. When I run `proot-distro login debian`, I get a Debian shell: `apt`, glibc, paths like `/root`. Those programs still use Android’s kernel; proot translates paths and syscalls so Debian userspace thinks it is on Linux ARM64.

**Debian** is where I install Python and Nanobot. Pip wheels match desktop ARM64 Linux more closely than Termux’s own Python, which mattered for my install.

**tmux** runs in Termux. It keeps a shell session alive when I detach from the terminal. It does not replace Android battery rules; it only helps with long-running processes once Termux is allowed to run in the background.

**Nanobot** runs inside Debian (`nanobot gateway`). **Telegram** is the UI. **Termux:Boot** and my scripts start the gateway after reboot; **`nanobot-loop`** re-enters Debian and restarts the gateway if it exits.

{{< nanobot-stack >}}

| Path | What runs there |
| --- | --- |
| `/root/nanobot-env` | Python venv + `nanobot` (Debian only) |
| `/root/.nanobot/config.json` | Nanobot config (keep keys private) |
| `~/bin/nanobot-loop` | Termux: gateway loop into Debian |
| `~/.termux/boot/00-start-nanobot` | Termux:Boot entrypoint |
| `~/nanobot-logs/` | `boot.log`, `gateway.log` |

Termux APK I recorded: `termux-app_v0.119.0-beta.3+apt-android-7-github-debug_arm64-v8a.apk`. Boot add-on: **v0.8.1-boot-fix** from [oswaldlow/termux-boot](https://github.com/oswaldlow/termux-boot), with Termux from the same signing family.

# Setting it up

The steps follow the goals above. I mention a few mistakes I made where they save time.

## 1. ARM64 Termux

**Goal:** a Termux userspace that matches a 64-bit phone, so later installs are not fighting 32-bit wheels and Rust targets.

Install **ARM64 Termux** and check `uname -m` and `dpkg --print-architecture` in Termux. Both should be **`aarch64`**. Uninstall wipes Termux data; back up first.

On my phone, Android listed 64-bit ABIs while Termux was still 32-bit (`arm`). That mismatch explained confusing pip errors until I reinstalled.

<!-- SCREENSHOT: uname/dpkg before vs after ARM64 reinstall -->

## 2. Debian and Nanobot

**Goal:** Nanobot installed in a normal Linux ARM64 environment inside the phone.

In Termux, install `proot-distro` and Debian, then work **inside** `proot-distro login debian`. The venv must live in Debian (for me `/root/nanobot-env`), not in Termux home. Termux and Debian do not share `/root` until you create files after logging into Debian.

| # | Where | Command |
| ---: | --- | --- |
| 1 | Termux | `pkg update && pkg upgrade -y` |
| 2 | Termux | `pkg install -y proot-distro tmux` |
| 3 | Termux | `proot-distro install debian` *(first time only)* |
| 4 | Termux | `proot-distro login debian` |
| 5 | Debian | `apt update && apt install -y python3 python3-venv python3-pip git curl build-essential` |
| 6 | Debian | `python3 -m venv /root/nanobot-env && source /root/nanobot-env/bin/activate` |
| 7 | Debian | `python -m pip install --upgrade pip` |
| 8 | Debian | `python -m pip install --only-binary=:all: rapidfuzz` |
| 9 | Debian | `python -m pip install nanobot-ai` |
| 10 | Debian | `nanobot onboard` |

I tried installing Nanobot in Termux Python first. Rust and wheels for dependencies such as **watchfiles** / **RapidFuzz** did not fit that Android target; Debian was the path that worked.

Config: `/root/.nanobot/config.json`. Restrict who can use the bot and review tool permissions before enabling shell or filesystem access.

{{<details "Example config.json (placeholders only)">}}

```json
{
  "agents": { "defaults": { "model": "gpt-4.1-mini", "provider": "openai" } },
  "providers": { "openai": { "apiKey": "PASTE_YOUR_OPENAI_API_KEY_HERE" } },
  "channels": { "telegram": { "enabled": true, "token": "PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE" } },
  "transcription": {
    "enabled": true,
    "provider": "openai",
    "model": "whisper-1",
    "language": "it",
    "maxDurationSec": 120,
    "maxUploadMb": 25
  }
}
```

{{< /details >}}

The **`transcription`** block is for incoming Telegram voice messages. I set **`language`** to **`it`** because I mostly send voice notes in Italian. Transcription uses the same **`providers.openai`** API key as chat; OpenAI may bill audio separately from a ChatGPT subscription.

Before I filled in `provider`, `model`, and `language`, transcription was enabled at the top level but those fields were null. I also had an old channel-level Groq transcription setting without a Groq key. I pointed the top-level block at **OpenAI Whisper** (`whisper-1`) and left the legacy Groq field in place for now. After editing config, restart the gateway (same loop as usual, no duplicate `nanobot gateway` process) and send a short Italian voice note to confirm end-to-end behavior. Check `/root/.nanobot/logs/gateway.log` if something fails, and redact tokens before sharing logs.

<!-- SCREENSHOT: nanobot --help or Telegram reply (no tokens) -->

## 3. Background and tmux

**Goal:** Telegram works when Termux is not in the foreground.

Run the gateway in Debian tmux if you want a manual session (`tmux new -s nanobot`, activate venv, `exec nanobot gateway`). For the phone to keep answering, I had to allow **Termux** to run in the background in system settings. On MagicOS I used **App launch** and battery options for Termux. Menu names differ on other OEMs; the idea is the same.

tmux alone did not fix background replies for me. It keeps a terminal session; Android still decides whether Termux may run.

<!-- SCREENSHOT: OEM App launch / battery screen for Termux -->

## 4. Boot and the restart loop

**Goal:** after reboot, the gateway starts without opening Termux manually, and restarts if the process dies.

On the Termux side:

| File | Role |
| --- | --- |
| `~/bin/nanobot-loop` | Enter Debian, run gateway, log, retry |
| `~/.termux/boot/00-start-nanobot` | On boot, start tmux session `nanobot-host` running the loop |

Create dirs once: `mkdir -p ~/bin ~/.termux/boot ~/nanobot-logs`.

{{<details "Script: ~/bin/nanobot-loop (chmod 700)" >}}

```bash
#!/data/data/com.termux/files/usr/bin/bash
LOG="$HOME/nanobot-logs/gateway.log"
mkdir -p "$HOME/nanobot-logs"
while true; do
  echo "[$(date)] start nanobot gateway" >>"$LOG"
  proot-distro login debian -- /bin/bash -lc \
    'source /root/nanobot-env/bin/activate && exec nanobot gateway' >>"$LOG" 2>&1
  echo "[$(date)] gateway exit rc=$?; sleep 10s" >>"$LOG"
  sleep 10
done
```

{{< /details >}}

{{<details "Script: ~/.termux/boot/00-start-nanobot (chmod 700)" >}}

Open the **Termux:Boot** app once after install.

```bash
#!/data/data/com.termux/files/usr/bin/bash
LOG_DIR="$HOME/nanobot-logs"
mkdir -p "$LOG_DIR"
exec >>"$LOG_DIR/boot.log" 2>&1
echo "===== boot $(date) ====="
termux-wake-lock 2>/dev/null || true
sleep 15
if tmux has-session -t nanobot-host 2>/dev/null; then exit 0; fi
tmux new-session -d -s nanobot-host "$HOME/bin/nanobot-loop"
```

{{< /details >}}

Verify with `tail -n 20 ~/nanobot-logs/boot.log` and `tail -n 40 ~/nanobot-logs/gateway.log`.

On my phone, official **Termux:Boot 0.8.1** ran the script when I fired the receiver manually (`am broadcast -a android.intent.action.BOOT_COMPLETED -n com.termux.boot/.BootReceiver`) but not after a real reboot on Android 16. The **boot-fix** fork with matching Termux signing fixed that. I do not know if that applies to every device; JobScheduler is a guess, not a proven root cause.

<!-- SCREENSHOT: fresh boot.log line after reboot -->

# Pitfalls (short)

If something breaks, these were the non-obvious checks for me:

| Symptom | What helped |
| --- | --- |
| Pip/Rust errors in Termux | Confirm **aarch64** Termux; install Nanobot in **Debian** |
| `No such file or directory` for venv | Create venv **after** `proot-distro login debian` |
| Telegram silent in background | OEM **battery / background** for Termux, not more tmux |
| Boot script works manually, not after reboot | **boot-fix** Termux:Boot + matching APK keys; read **`boot.log`** |

{{< log >}}
Python reports SOABI: cpython-314-arm-linux-androideabi  
Computed rustc target triple: arm-unknown-linux-androideabi  
Target triple not supported by rustup: arm-unknown-linux-androideabi
{{< /log >}}

*(Example from Termux native Python install attempt.)*

# Limits

| Topic | What to expect |
| --- | --- |
| **Secrets** | Do not publish `config.json` |
| **Uptime** | Android may stop background processes; not server-grade availability |
| **Battery / heat** | A gateway running often will use power |
| **Not tested yet** | Long screen-off, network loss, force-stop from cleaner apps |

# Next steps

The gateway already does more than reactive chat (reminders, a custom morning newsletter). I want more Nanobot tools in the workspace and, where background limits allow, more scheduled jobs on the same process.

I may reuse Termux + Debian for other small Telegram bots (expense tracker, other **RYOT-style** services) without another host. Longer screen-off tests and safe config backups are still on my list.

# Closing

The product goal was an assistant I control on Telegram, including proactive output and voice notes. The engineering work was mostly Android: ARM64 Termux, Debian under proot, OEM settings, and boot scripts. Nanobot itself was the straightforward part on my phone.

If you try the same path: match the four goals above, confirm **aarch64**, keep Nanobot in Debian, whitelist Termux in battery settings, and treat one working phone as one data point.
