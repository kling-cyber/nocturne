# NOCTURNE Multiplayer Roles

## Role assignment

Multiplayer supports 2–8 human players.

- Exactly one human is the Killer.
- If a second human is present, that player becomes the Detective.
- Every additional human becomes an Investigator with a distinct specialty.
- If there is no human Investigator, an NPC is promoted to the Investigator role.
- The rest of the cast remains autonomous NPCs.
- The server is authoritative. The frontend cannot grant a role ability.

### Example player counts

| Humans | Human roles | NPC fallback |
|---:|---|---|
| 2 | Killer + Detective | NPC Investigator |
| 3 | Killer + Detective + Investigator | None required |
| 4–8 | Killer + Detective + Investigators | Remaining cast are NPCs |

## Killer abilities

### ELIMINATE

Available during the critical crime window. The human Killer chooses the living target. The server resolves the crime using that selected target.

### CONCEAL SCENE

Available after the crime. It can disturb the scene, but it can also create additional evidence.

## Detective abilities

### ANALYZE CASE

Cross-references recent evidence and produces an analytical lead.

### INTERROGATE

Performs a formal targeted interrogation of a character.

### MARK SUSPECT

Marks a person of interest and increases their public suspicion. It is not a verdict.

## Investigator abilities

### FORENSICS

Performs a focused search for traces, objects and environmental inconsistencies.

### TRACK

Follows a living character's movement trail and moves the Investigator to their current location.

### RECON

Surveys the current area and records nearby activity.

## Common actions

All human roles retain basic world actions such as movement, talking, searching, following, observing, recalling information, questioning, evidence review and accusation where applicable.

The difference is that role-specific abilities are separate and server-authorized. A player cannot invoke another role's ability by changing the frontend or sending a crafted socket event.

## Single player

This role system applies to Multiplayer. Single Player continues to use its existing investigator-specialty selection and autonomous AI Killer architecture.
