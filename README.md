# NOCTURNE

## The Living Mystery Engine

**NOCTURNE** is a standalone multiplayer and single-player murder-mystery game built around procedural cases, autonomous characters, imperfect information, investigation, testimony, evidence, and human decision-making.

Every case is designed to feel like a living situation rather than a fixed puzzle.

NOCTURNE supports two primary ways to play:

- **MULTIPLAYER**: Real players investigate together while one real human player is secretly selected as the Killer.
- **SINGLE PLAYER**: One real player investigates a case while the remaining cast, including the Killer, is controlled by autonomous AI characters.

The world is driven by a server-authoritative simulation containing characters with their own memories, beliefs, goals, relationships, secrets, routines, suspicion, stress, and reactions.

The result is a mystery that develops through player actions, character behavior, evidence, and the evolving timeline.

---

# Creator & Ownership

**Created & Owned by Kavish Koradia**

**© 2026 Kavish Koradia. All rights reserved.**

NOCTURNE is an original project created, developed, and owned by **Kavish Koradia**.

The NOCTURNE name, original game concept, original source code, original written content, game systems, and original creative assets are subject to rights held by their respective owners.

Third-party libraries and technologies remain subject to their respective licenses.

---

# Version

**NOCTURNE 4.0**

NOCTURNE 4.0 introduces the major **Single Player Living Mystery** experience while preserving the original multiplayer architecture.

### 4.0 Highlights

- Single-player cases
- AI-controlled Killer NPC
- Investigator role selection
- Four difficulty levels
- Autonomous NPC behavior
- Individual character memories
- Server-authoritative hidden truth
- Procedural case generation
- Dynamic evidence and testimony
- Multiplayer preservation
- Improved game mode handling

---

# Introduction

Traditional murder-mystery games usually provide a predetermined set of clues and a predetermined solution.

NOCTURNE takes a different approach.

The world is simulated around a hidden causal truth.

Characters move through locations, interact with one another, remember events differently, form opinions, hide information, investigate their surroundings, and react to what players do.

The mystery is not simply a list of clues waiting to be collected.

Instead, the investigation develops from the simulated world.

Your character only knows what they have personally experienced, observed, learned, or been told.

That makes every investigation a problem of reasoning rather than simply finding a checklist of clues.

---

# Game Modes

## Multiplayer

Multiplayer is designed for **2 to 8 real players**.

One real player is randomly selected as the Killer.

The remaining players become investigators with different specialties.

The Killer receives private information and controls their own decisions.

The AI does not control the human Killer and does not write their answers.

Players must investigate the world, question characters, examine evidence, compare testimony, and determine who is responsible.

### Multiplayer Rules

- Minimum players: **2**
- Maximum players: **8**
- One real human becomes the Killer
- Remaining human players become investigators
- NPCs remain autonomous
- Killer identity is private
- Human players control their own answers
- Server controls the hidden case truth

---

## Single Player

Single Player is designed for one real human investigator.

The player is **never assigned as the Killer** in Single Player.

Instead:

- The human player becomes an investigator
- The player selects an investigator specialty
- The remaining cast is controlled by AI
- The Killer is an AI-controlled NPC
- The AI Killer has its own memories, motive, relationships, pressure, suspicion, and self-preservation behavior
- NPCs interact with the investigation independently
- The player must discover the Killer through evidence, behavior, testimony, and reasoning

The Single Player mode uses the same underlying mystery philosophy as Multiplayer rather than being a separate scripted puzzle.

---

# Single Player Setup

Before starting a solo case, the player selects:

### Investigator Name

The player's character name.

### Investigator Role

Available investigator specialties include:

- Lead Detective
- Forensic Analyst
- Behavioral Analyst
- Digital Investigator
- Field Investigator
- Investigative Journalist
- Security Specialist
- Medical Consultant

### Difficulty

NOCTURNE 4.0 provides four difficulty levels:

#### CASUAL

Designed for a more forgiving investigation.

Characters and evidence are easier to interpret.

#### DETECTIVE

Provides a balanced investigation with stronger contradictions and more demanding reasoning.

#### EXPERT

Characters become harder to read and evidence requires stronger corroboration.

#### NOCTURNE

The most demanding experience.

Information can be incomplete, memories can conflict, characters can become highly defensive, and the player must carefully reconstruct the hidden truth.

---

# How to Play Multiplayer

## 1. Create a Room

One player selects:

**CREATE CASE**

Enter your player name.

NOCTURNE creates a private room and provides a four-character room code.

Share that code with the other players.

---

## 2. Join the Room

Other players select:

**JOIN CASE**

Enter:

- Your player name
- The four-character room code

All players should appear in the lobby.

At least **2 players** are required before the host can start the case.

---

## 3. Start the Case

The host launches the case.

The game generates:

- The world
- Characters
- Secrets
- Relationships
- Timeline
- Hidden case state
- Evidence
- Character memories

One human player is randomly assigned:

**KILLER**

The remaining human players receive investigator roles.

The Killer's identity and private information are not publicly revealed.

---

# How to Play Single Player

## 1. Select SINGLE PLAYER

From the main menu select:

**SINGLE PLAYER**

---

## 2. Configure Your Investigator

Enter your investigator name.

Select your investigator specialty.

Choose a difficulty:

- CASUAL
- DETECTIVE
- EXPERT
- NOCTURNE

---

## 3. Start the Case

NOCTURNE generates a new case.

The system creates:

- Your investigator
- AI investigators and NPCs
- An AI Killer
- A victim
- Character relationships
- Secrets
- Motives
- Locations
- Memories
- Timeline events
- Evidence
- Hidden truth

The Killer is an AI-controlled character.

The player must uncover the Killer's identity through investigation.

---

# Investigator Roles

Investigators have different specialties.

## Lead Detective

Coordinates the investigation and focuses on the overall case.

## Forensic Analyst

Focuses on physical evidence, traces, objects, and forensic observations.

## Behavioral Analyst

Studies character behavior, inconsistencies, motives, stress, and relationships.

## Digital Investigator

Focuses on digital evidence, communications, devices, logs, and technological traces.

## Field Investigator

Focuses on locations, physical observations, searches, movement, and direct investigation.

## Investigative Journalist

Focuses on interviews, testimony, information gathering, and connecting people to events.

## Security Specialist

Focuses on surveillance, access, movement, security systems, and CCTV-related information.

## Medical Consultant

Focuses on medical observations, injuries, timing, and related evidence.

---

# The Killer

## Multiplayer Killer

In Multiplayer, the Killer is always controlled by a **real human player**.

The AI does not control the Killer.

The AI does not write the Killer's answers.

The Killer receives private information and controls their own decisions.

During the critical period, the Killer can make the decisions available to their role.

The other players must determine who the Killer is through:

- Investigation
- Evidence
- Behavior
- Contradictions
- Testimony
- Relationships
- Reasoning

---

## Single Player Killer

In Single Player, the Killer is an **AI-controlled NPC**.

The AI Killer has its own internal character state.

This can include:

- Motive
- Pressure
- Relationships
- Suspicion
- Secrets
- Memories
- Goals
- Self-preservation
- Knowledge
- Stress
- Behavioral tendencies

The AI Killer is not simply waiting for the player to discover a predetermined answer.

Its behavior is influenced by the simulated case and its own character state.

The Killer may attempt to:

- Hide information
- Deflect questions
- Protect itself
- Protect another character
- Maintain a cover story
- React to suspicion
- Change behavior
- Manipulate conversations
- Become stressed
- Reveal inconsistencies under pressure

The exact behavior depends on the character and the evolving case.

---

# NPC Intelligence

NOCTURNE NPCs are designed to behave as individual characters rather than simple scripted dialogue machines.

Each NPC can have:

- Personality
- Memories
- Beliefs
- Goals
- Secrets
- Relationships
- Routines
- Suspicion
- Stress
- Self-preservation instincts
- Observations
- Rumors
- Personal knowledge

NPCs can:

- Cooperate
- Lie
- Deflect
- Protect someone
- Hide information
- Reveal information
- Become suspicious
- Panic
- Investigate
- Change their behavior
- Betray another character
- React to player actions

NPC answers are grounded in their own information and memories rather than an omniscient description of the entire case.

---

# Character Memory

Every character has an individual memory.

Memory can contain different categories of information such as:

- Episodic memories
- Observations
- Conversations
- Rumors
- Beliefs
- Secrets
- Routines

Memory records can have:

- Time
- Type
- Description
- Confidence
- Source
- Importance
- Distortion state

Older or less important memories can lose confidence over time.

This means two characters may remember the same situation differently.

One character may be highly confident about something they personally witnessed.

Another may only remember hearing a rumor.

The difference matters.

---

# Investigation

Players can investigate the world through actions such as:

- Talking to people
- Moving between locations
- Searching areas
- Following people
- Observing
- Recalling information
- Questioning characters
- Requesting CCTV evidence
- Requesting scene photographs
- Reviewing evidence
- Making accusations

Actions can advance the case and influence what happens next.

The goal is not simply to collect everything.

The goal is to determine what information is reliable.

---

# Evidence System

NOCTURNE does not rely on a simple finite list of clues that must be collected in a predetermined order.

Evidence can emerge from simulated events and causal state.

Possible evidence can include:

- Physical traces
- Objects
- Witness observations
- Testimony
- CCTV observations
- Photographs
- Digital information
- Timeline inconsistencies
- Location information
- Character behavior
- Contradictions
- Relationships
- Other observations produced by the evolving case

Evidence can have different reliability levels.

Players should corroborate important information instead of blindly trusting a single observation.

---

# Questioning System

Players can directly question other characters.

Questions can be specific.

For example:

- Where were you during the critical period?
- What did you personally see?
- What did you hear?
- What do you remember about a particular person?
- What do you know about a particular location?
- What happened before you arrived?

NPCs answer according to their own:

- Memories
- Beliefs
- Goals
- Stress
- Secrets
- Knowledge
- Relationships

If the target is another human player, that player receives the question privately and writes their own answer.

This prevents the AI from speaking on behalf of human players.

---

# Case Timeline

Cases develop through a simulated timeline.

The world progresses through different phases.

## PRE-CRIME

Characters move through the world and establish relationships and observations.

Players can investigate the environment and interact with characters before the critical event.

---

## CRIME

The critical window becomes active.

### Multiplayer

The human Killer controls the turning point.

### Single Player

The AI Killer controls the turning point according to its character state and case simulation.

---

## POST-CRIME

The death has been discovered.

Players begin securing observations and comparing accounts.

Characters react to what happened.

---

## INVESTIGATION

Players reconstruct the timeline, investigate evidence, question characters, and test contradictions.

---

## ENDED

The case reaches its final outcome.

---

# Game Settings

NOCTURNE supports multiple fictional environments.

Current settings include:

1. **Blackwood Hotel**
2. **Ashcroft Estate**
3. **Marrowgate Museum**
4. **Velvet Room Theatre**
5. **Northstar Research Campus**
6. **The Meridian**
7. **Ravenscar Island Retreat**
8. **Starlight Film Studio**
9. **Grand Prix Paddock**
10. **Old City University**

Each setting provides a different environment for:

- Characters
- Movement
- Relationships
- Observations
- Evidence
- Investigation
- Timeline events

---

# Procedural Cases

Cases are designed to be replayable.

The system can generate different combinations of:

- Characters
- Relationships
- Secrets
- Locations
- Events
- Timelines
- Evidence
- Observations
- Suspicions
- Character reactions
- Motives
- Pressures

The intention is to make repeated games less predictable.

A previous solution should not automatically reveal the solution to the next case.

---

# Hidden Truth

The game maintains a hidden causal truth behind the public information.

The server is authoritative over this hidden state.

The narrative and AI layers can help produce:

- Character behavior
- Explanations
- Observations
- Testimony
- Reactions

However, they should not be able to arbitrarily rewrite the underlying truth of the case.

This separation is important.

The mystery should emerge from the simulated state rather than being invented after players make an accusation.

---

# Server Authority

NOCTURNE uses a server-authoritative architecture.

The frontend should not determine the underlying truth of a case.

The server maintains important game state including:

- Rooms
- Players
- Characters
- Roles
- Hidden Killer state
- Victim
- Relationships
- Memories
- Timeline
- Evidence
- Investigation state
- Game phase
- Accusations
- Case outcome

The frontend primarily presents the information that the current player is allowed to know.

This helps protect hidden information in both multiplayer and single-player games.

---

# Multiplayer Architecture

The project is separated into frontend and backend components.

```text
PLAYER BROWSER
      │
      ▼
VERCEL FRONTEND
      │
      │ Socket.IO
      ▼
RENDER NODE.JS SERVER
      │
      ├── Room Management
      ├── Multiplayer State
      ├── Single Player State
      ├── Case Generation
      ├── Character State
      ├── Memory
      ├── Evidence
      ├── Timeline
      ├── Game Rules
      └── AI / Narrative Layer
