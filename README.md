# NOCTURNE

## The Living Mystery Engine

**NOCTURNE** is a standalone multiplayer murder-mystery game built around procedural cases, autonomous characters, imperfect information, investigation, testimony, evidence, and human decision-making.

Every case is designed to feel like a living situation rather than a fixed puzzle.

Players interact with a world containing human-controlled investigators, a human-controlled Killer, and autonomous NPCs with their own memories, beliefs, goals, relationships, secrets, routines, and reactions.

The result is a mystery that develops through player actions, character behavior, evidence, and the evolving timeline.

---

# Creator & Ownership

**Created & Owned by Kavish Koradia**

**© 2026 Kavish Koradia. All rights reserved.**

NOCTURNE is an original project created, developed, and owned by **Kavish Koradia**.

The NOCTURNE name, original game concept, original source code, original written content, game systems, and original creative assets are subject to rights held by their respective owners.

Third-party libraries and technologies remain subject to their respective licenses.

---

# Introduction

Traditional murder-mystery games usually provide a predetermined set of clues and a predetermined solution.

NOCTURNE takes a different approach.

The world is simulated around a hidden causal truth.

Characters move through locations, interact with one another, remember events differently, form opinions, hide information, investigate their surroundings, and react to what other players do.

The human Killer is part of the player group.

The investigators must reconstruct what actually happened from incomplete and sometimes contradictory information.

There is no requirement for every player to receive the same information.

Your character only knows what they have personally experienced, observed, learned, or been told.

That makes every investigation a problem of reasoning rather than simply finding a checklist of clues.

---

# Core Requirements

## Players

- Minimum players: **2**
- Maximum players: **8**
- Multiplayer through a web browser
- No local multiplayer required
- One real human player becomes the Killer
- Remaining human players become investigators

## Game Architecture

NOCTURNE uses:

- HTML
- CSS
- JavaScript
- Node.js
- Socket.IO
- Vercel
- Render
- Optional OpenAI integration

The frontend runs as a web application while the multiplayer game state is maintained by the server.

The server is authoritative over the hidden case truth and game state.

---

# How to Play

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

The game generates the world, characters, secrets, relationships, timeline, and hidden case state.

One human player is randomly assigned:

**KILLER**

The remaining human players receive investigator roles.

The Killer's identity and private information are not publicly revealed.

---

# Investigator Roles

Investigators have different specialties.

Available investigator roles include:

### Lead Detective

Coordinates the investigation and focuses on the overall case.

### Forensic Analyst

Focuses on physical evidence, traces, objects, and forensic observations.

### Behavioral Analyst

Studies character behavior, inconsistencies, motives, stress, and relationships.

### Digital Investigator

Focuses on digital evidence, communications, devices, logs, and technological traces.

### Field Investigator

Focuses on locations, physical observations, searches, movement, and direct investigation.

### Investigative Journalist

Focuses on interviews, testimony, information gathering, and connecting people to events.

### Security Specialist

Focuses on surveillance, access, movement, security systems, and CCTV-related information.

### Medical Consultant

Focuses on medical observations, injuries, timing, and related evidence.

---

# The Killer

The Killer is always controlled by a **real human player**.

The AI does not control the Killer.

The AI does not write the Killer's answers.

The Killer receives private information and controls their own decisions.

During the critical period, the Killer can make the decisions available to their role.

The other players must determine who the Killer is through investigation, evidence, behavior, contradictions, and reasoning.

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

NPCs answer according to their own memories, beliefs, goals, stress, and secrets.

If the target is another human player, that player receives the question privately and writes their own answer.

This prevents the AI from speaking on behalf of human players.

---

# Case Timeline

Cases develop through a simulated timeline.

The world progresses through different phases.

## PRE-CRIME

Characters move through the world and establish relationships and observations.

Players can investigate the environment and interact with characters before the critical event.

## CRIME

The critical window is active.

The human Killer controls the turning point.

## POST-CRIME

The death has been discovered.

Players begin securing observations and comparing accounts.

## INVESTIGATION

Players reconstruct the timeline, investigate evidence, question characters, and test contradictions.

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

Each setting provides a different environment for characters, movement, relationships, observations, and evidence.

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

The intention is to make repeated games less predictable.

A previous solution should not automatically reveal the solution to the next case.

---

# Hidden Truth

The game maintains a hidden causal truth behind the public information.

The server is authoritative over this hidden state.

The narrative and AI layers can help produce character behavior, explanations, and observations, but they should not be able to arbitrarily rewrite the underlying truth of the case.

This separation is important.

The mystery should emerge from the simulated state rather than being invented after players make an accusation.

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
      ├── Case Generation
      ├── Character State
      ├── Memory
      ├── Evidence
      ├── Timeline
      └── Game Rules
