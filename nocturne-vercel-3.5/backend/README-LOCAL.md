# NOCTURNE // 3.4.2 Living Mystery Final

NOCTURNE is a standalone browser multiplayer murder-mystery simulation for 2–8 human players. Each case generates a new setting, cast, private roles, relationships, secrets, movement, memories and evidence. One human player is secretly selected as the Killer.

## 3.4 upgrade

- Fixed the critical-window flow: the human Killer now has a real server-side `killerDecision` action that resolves the crime.
- The server remains authoritative for hidden truth. AI is a narrative layer and cannot choose the human Killer's speech or decisions.
- Human-to-human questioning is private: the target receives the question and writes their own answer.
- NPC questioning is grounded in each NPC's own memories, stress, secrets and uncertainty.
- NPC movement and observations create personal memories instead of a shared omniscient memory.
- Player actions now recognize common movement, following, talking and searching phrases and update the simulated state when appropriate.
- Added stronger validation for names, room codes and incoming payloads.
- Added a stable private player ID so the client no longer depends primarily on matching the player's name.
- Upgraded GM output handling to OpenAI Structured Outputs JSON Schema instead of relying only on free-form JSON parsing.
- Current AI defaults: `gpt-5.6-luna` for narrative and `gpt-image-2` for generated visual evidence. Both can be overridden in `.env`.
- Visual evidence remains explicitly imperfect and non-graphic.
- Updated Windows setup with a PowerShell-first installer and a safer batch wrapper.
- Windows installer pins local Node.js to Node `v24.20.0` LTS when a compatible Node 20+ runtime is not already available, with SHA-256 verification.
- No system-wide Node installation is required when the local installer path is used.
- Added clearer Windows Smart App Control guidance.

## Requirements

### Windows
- Windows 10 or Windows 11.
- Node.js 20+ if you already have it. Otherwise the Windows installer downloads Node.js `v24.20.0` LTS locally from the official Node.js distribution.
- Internet access for first-time npm dependency installation and optional AI/image generation.
- OpenAI API key is optional. Without one, the deterministic simulation and fallback visual evidence still run.

### macOS / Linux
- Node.js 20+ and npm.
- Internet access for the first `npm install` and optional AI features.

## Windows installation

### Recommended when Windows Smart App Control blocks the `.bat`

Windows can mark files extracted from an internet-downloaded ZIP as coming from the internet. Smart App Control may block a `.bat` before the script can run. The installer cannot override that Windows security decision.

Use this clean workflow:

1. Download the NOCTURNE ZIP.
2. **Before extracting it**, right-click the ZIP → **Properties**.
3. If Windows shows **Unblock**, check it → **Apply** → **OK**.
4. Extract the ZIP normally.
5. Open the extracted folder.
6. Run `INSTALL-WINDOWS-POWERSHELL.ps1` with PowerShell, or run `INSTALL-WINDOWS.bat` if Windows allows it.

If Smart App Control still blocks the batch wrapper, use `INSTALL-WINDOWS-POWERSHELL.ps1`. Do not disable Smart App Control merely to run NOCTURNE.

### Later launches

Run `START-WINDOWS.bat`.

`CHECK-WINDOWS.bat` shows the Node.js, dependency, configuration and installer status.

## macOS / Linux

Run:

```bash
./INSTALL-MAC-LINUX.sh
```

Or install dependencies manually with `npm install` and start with `npm start`.

## AI configuration

Copy `.env.example` to `.env` if needed. The Windows installer creates it automatically.

`OPENAI_API_KEY` is optional. Never commit your real key to source control or put it in a public frontend file.

## Multiplayer

The package starts a local authoritative Socket.IO server at `http://localhost:3000`.

For players on different machines, deploy the server to a reachable Node.js host or use a secure private network/tunnel. A public production deployment should add authentication, persistent storage, HTTPS/WSS, rate limiting, reconnection recovery and a shared room store such as Redis when scaling across multiple processes.

## Investigation model

Players can:

- interview NPCs and other human players
- reconstruct timelines
- inspect locations and objects
- compare movement and access records
- review trace, environmental, behavioral and digital evidence
- request CCTV-style stills and investigative scene photographs
- observe contradictions and uncertain memories
- make a public accusation

Evidence is generated from simulation state rather than a fixed finite clue checklist. It can be incomplete, uncertain or misleading, so independent corroboration matters.

## Safety boundary

The game is fictional and non-graphic. It does not provide real-world instructions for committing violence. Hidden causal state stays on the server; AI cannot rewrite the authoritative Killer, victim, movement or verdict.
