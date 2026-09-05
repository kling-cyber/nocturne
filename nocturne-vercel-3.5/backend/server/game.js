require("dotenv").config();

const crypto = require("crypto");

const { buildCameraNetwork, getCamera } = require("./camera-network");
const comfy = require("./comfy-client");

let OpenAI = null;

try {
  OpenAI = require("openai");
} catch (e) {
  console.error(
    "[NOCTURNE] OpenAI SDK could not be loaded:",
    e.message
  );
}

const apiKey =
  String(process.env.OPENAI_API_KEY || "").trim();

const ai =
  OpenAI && apiKey
    ? new OpenAI({ apiKey })
    : null;

const MODEL =
  process.env.OPENAI_TEXT_MODEL ||
  "gpt-5.6-luna";


/* =========================================================
   WORLDS
   ========================================================= */

const WORLDS = [
  [
    "Blackwood Hotel",
    [
      "Grand Lobby",
      "Ballroom",
      "Kitchen",
      "Library",
      "Service Corridor",
      "Suite 204",
      "Rooftop",
      "Garden",
      "Parking"
    ]
  ],

  [
    "Ashcroft Estate",
    [
      "Entrance Hall",
      "Library",
      "Study",
      "Conservatory",
      "Kitchen",
      "Cellar",
      "Garden",
      "Guest Wing",
      "Garage"
    ]
  ],

  [
    "Marrowgate Museum",
    [
      "Grand Gallery",
      "Archive",
      "Restoration Lab",
      "Security Office",
      "Loading Dock",
      "Atrium",
      "Roof Access",
      "Staff Room"
    ]
  ],

  [
    "Velvet Room Theatre",
    [
      "Lobby",
      "Auditorium",
      "Backstage",
      "Dressing Rooms",
      "Props Room",
      "Green Room",
      "Catwalk",
      "Bar"
    ]
  ],

  [
    "Northstar Research Campus",
    [
      "Reception",
      "Lab A",
      "Lab B",
      "Conference Room",
      "Server Room",
      "Cafeteria",
      "Parking",
      "Service Hall",
      "Roof"
    ]
  ],

  [
    "The Meridian",
    [
      "Grand Lounge",
      "Dining Deck",
      "Galley",
      "Cabin Hall",
      "Observation Lounge",
      "Service Corridor",
      "Engine Access",
      "Pool Deck",
      "Bridge"
    ]
  ],

  [
    "Ravenscar Island Retreat",
    [
      "Main Lodge",
      "Boathouse",
      "Cliff Path",
      "Spa",
      "Dining Hall",
      "Cottages",
      "Generator Room",
      "Greenhouse",
      "Helipad"
    ]
  ],

  [
    "Starlight Film Studio",
    [
      "Soundstage A",
      "Soundstage B",
      "Production Office",
      "Wardrobe",
      "Editing Suite",
      "Prop Warehouse",
      "Backlot",
      "Screening Room",
      "Canteen"
    ]
  ],

  [
    "Grand Prix Paddock",
    [
      "Team Garage",
      "Pit Lane",
      "Hospitality Suite",
      "Control Room",
      "Media Centre",
      "Workshop",
      "Transport Yard",
      "VIP Terrace",
      "Track Tunnel"
    ]
  ],

  [
    "Old City University",
    [
      "Senate Hall",
      "Rare Books Room",
      "Laboratory",
      "Faculty Lounge",
      "Archives",
      "Courtyard",
      "Theatre",
      "Dormitory",
      "Boiler Room"
    ]
  ]
];


/* =========================================================
   CHARACTER DATA
   ========================================================= */

const FIRST = [
  "Mara",
  "Julian",
  "Elena",
  "Theo",
  "Nadia",
  "Victor",
  "Iris",
  "Marcus",
  "Sofia",
  "Adrian",
  "Leah",
  "Damian",
  "Rhea",
  "Noah",
  "Celeste",
  "Arman",
  "Clara",
  "Milo",
  "Priya",
  "Owen",
  "Lena",
  "Jonah",
  "Maeve",
  "Ravi",
  "Diana",
  "Silas"
];

const LAST = [
  "Vale",
  "Mercer",
  "Rowan",
  "Sterling",
  "Hart",
  "Voss",
  "Kane",
  "Bishop",
  "Hale",
  "Cross",
  "Marlow",
  "Reed",
  "Quinn",
  "Frost",
  "Sinclair",
  "Dane",
  "Sloane",
  "West",
  "Carter",
  "Ellis"
];

const JOBS = [
  "director",
  "curator",
  "chef",
  "security officer",
  "producer",
  "engineer",
  "researcher",
  "lawyer",
  "journalist",
  "doctor",
  "professor",
  "photographer",
  "accountant",
  "actor",
  "architect",
  "technician",
  "pilot",
  "archivist"
];

const TRAITS = [
  "observant but guarded",
  "warm and persuasive",
  "ambitious and impatient",
  "anxious and detail-focused",
  "charismatic but secretive",
  "skeptical and blunt",
  "empathetic but conflict-averse",
  "competitive and proud",
  "quietly manipulative",
  "curious and impulsive",
  "calm under pressure",
  "socially confident but vain"
];

const GOALS = [
  "protect reputation",
  "discover the truth",
  "protect another person",
  "recover something valuable",
  "leave unnoticed",
  "settle a personal conflict",
  "keep a damaging secret",
  "prove competence",
  "find who is lying",
  "avoid becoming a suspect",
  "protect their career"
];

const SECRETS = [
  "owes a large debt",
  "has hidden a relationship",
  "altered an important document",
  "has been stealing small items",
  "knows a damaging family secret",
  "plans to leave their job",
  "was secretly meeting the victim",
  "has a financial conflict with another guest",
  "has lied about their whereabouts",
  "possesses information they fear will ruin their reputation",
  "is protecting a colleague",
  "has a private grievance against the victim"
];

const MOTIVES = [
  "a threatened secret",
  "a personal betrayal",
  "a financial conflict",
  "fear of exposure",
  "revenge for an old wrong",
  "a collapsed relationship",
  "a damaging disclosure",
  "a conflict over control or status",
  "fear of losing everything"
];

const PRESSURES = [
  "the victim planned to expose something",
  "a confrontation was approaching",
  "someone discovered a secret",
  "a private dispute was escalating",
  "the victim had scheduled a damaging meeting"
];

const ROLES = [
  [
    "Lead Detective",
    "Build the master timeline and challenge contradictions.",
    ["timeline", "testimony"]
  ],

  [
    "Forensic Analyst",
    "Interpret traces, objects and environmental inconsistencies.",
    ["trace", "object", "environmental"]
  ],

  [
    "Behavioral Analyst",
    "Read stress, motives, alliances and suspicious changes.",
    ["behavioral", "testimony"]
  ],

  [
    "Digital Investigator",
    "Follow access logs, messages, cameras and device evidence.",
    ["digital", "visual"]
  ],

  [
    "Field Investigator",
    "Move through the world, locate witnesses and verify scenes.",
    ["observation", "testimony"]
  ],

  [
    "Investigative Journalist",
    "Interview people, compare stories and surface hidden relationships.",
    ["testimony", "document"]
  ],

  [
    "Security Specialist",
    "Map movement, access and blind spots.",
    ["digital", "timeline", "visual"]
  ],

  [
    "Medical Consultant",
    "Interpret the non-graphic timing and condition clues.",
    ["timeline", "environmental"]
  ]
];


/* =========================================================
   DIFFICULTY
   ========================================================= */

const DIFFICULTY = {
  CASUAL: {
    npc: 8,
    guard: 0.18,
    crimeDelay: 7
  },

  DETECTIVE: {
    npc: 10,
    guard: 0.32,
    crimeDelay: 6
  },

  EXPERT: {
    npc: 12,
    guard: 0.48,
    crimeDelay: 5
  },

  NOCTURNE: {
    npc: 14,
    guard: 0.65,
    crimeDelay: 4
  }
};


/* =========================================================
   HELPERS
   ========================================================= */

const pick = array =>
  array[Math.floor(Math.random() * array.length)];

const uid = () =>
  crypto.randomBytes(6).toString("hex");

const clamp = (n, a, b) =>
  Math.max(a, Math.min(b, n));

const clean = (s, n = 600) =>
  String(s ?? "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      ""
    )
    .slice(0, n);

const errorText = error => {

  const status =
    error?.status
      ? `HTTP ${error.status}: `
      : "";

  const message =
    error?.error?.message ||
    error?.message ||
    String(error);

  return clean(
    `${status}${message}`,
    500
  );
};


/* =========================================================
   SIMULATION
   ========================================================= */

class Sim {

  constructor(players, room, options = {}) {

    this.room = room;

    this.mode =
      options.singlePlayer
        ? "SINGLE_PLAYER"
        : "MULTIPLAYER";

    this.singlePlayer =
      !!options.singlePlayer;

    this.difficulty =
      String(
        options.difficulty ||
        "DETECTIVE"
      ).toUpperCase();

    if (!DIFFICULTY[this.difficulty]) {
      this.difficulty = "DETECTIVE";
    }

    this.seed =
      crypto.randomBytes(12).toString("hex");

    this.world =
      pick(WORLDS);

    this.people = [];
    this.events = [];
    this.evidence = [];
    this.questions = new Map();

    this.t = 0;
    this.phase = "SETUP";

    this.truth = {};
    this.caseClosed = false;

    this.imageBusy = false;

    this.cameras = [];

    this.make(players, options);
  }


  /* =======================================================
     PERSON
     ======================================================= */

  person(
    id,
    name,
    isPlayer,
    killer = false
  ) {

    return {
      id,
      name,
      isPlayer,

      role:
        killer
          ? "KILLER"
          : "INVESTIGATOR",

      investigatorRole: null,

      job:
        isPlayer
          ? "investigator"
          : pick(JOBS),

      trait: pick(TRAITS),
      goal: pick(GOALS),
      secret: pick(SECRETS),

      location:
        pick(this.world[1]),

      alive: true,

      suspicion:
        Math.floor(
          Math.random() * 12
        ),

      stress:
        Math.floor(
          Math.random() * 20
        ),

      memory: [],
      beliefs: [],
      relationships: {},

      lastAction: null,

      memoryVersion: 2
    };
  }


  /* =======================================================
     MEMORY
     ======================================================= */

  remember(
    p,
    type,
    text,
    opts = {}
  ) {

    if (!p) {
      return null;
    }

    const memory = {

      id: uid(),

      t: this.t,

      type:
        type ||
        "episodic",

      text:
        clean(text, 500),

      confidence:
        clamp(
          Math.round(
            opts.confidence ?? 75
          ),
          15,
          100
        ),

      source:
        opts.source ||
        "personal",

      importance:
        clamp(
          Math.round(
            opts.importance ?? 50
          ),
          0,
          100
        ),

      distorted: false
    };

    p.memory.push(memory);

    if (p.memory.length > 42) {
      this.forgetOrCompress(p);
    }

    return memory;
  }


  forgetOrCompress(p) {

    p.memory.sort(
      (a, b) =>
        (
          b.importance +
          b.confidence * 0.35
        ) -
        (
          a.importance +
          a.confidence * 0.35
        )
    );

    const keep =
      p.memory.slice(0, 34);

    for (const m of keep) {

      if (
        m.type === "routine" &&
        Math.random() < 0.28
      ) {

        m.confidence =
          clamp(
            m.confidence - 10,
            15,
            100
          );
      }

      if (
        m.type !== "secret" &&
        Math.random() < 0.1
      ) {

        m.confidence =
          clamp(
            m.confidence - 6,
            15,
            100
          );
      }
    }

    p.memory =
      keep.sort(
        (a, b) => a.t - b.t
      );
  }


  recall(p, topic) {

    const q =
      String(topic || "")
        .toLowerCase();

    return p.memory
      .filter(
        m =>
          !q ||
          m.text
            .toLowerCase()
            .includes(q)
      )
      .sort(
        (a, b) =>
          (
            b.importance +
            b.confidence * 0.3
          ) -
          (
            a.importance +
            a.confidence * 0.3
          )
      )
      .slice(0, 8);
  }


  /* =======================================================
     CASE CREATION
     ======================================================= */

  make(players, options) {

    const shuffled =
      [...players].sort(
        () => Math.random() - 0.5
      );

    const killerId =
      this.singlePlayer
        ? null
        : shuffled[0]?.id;

    const rolePool =
      [...ROLES].sort(
        () => Math.random() - 0.5
      );


    players.forEach((p, i) => {

      const character =
        this.person(
          p.id,
          p.name,
          true,
          p.id === killerId
        );

      if (
        character.role !== "KILLER"
      ) {

        character.investigatorRole =
          this.singlePlayer
            ? (
                options.requestedInvestigatorRole ||
                rolePool[0][0]
              )
            : rolePool[
                i % rolePool.length
              ][0];
      }

      this.people.push(
        character
      );
    });


    const npcCount =
      this.singlePlayer
        ? DIFFICULTY[
            this.difficulty
          ].npc
        : Math.max(
            8,
            12 - players.length
          );


    for (
      let i = 0;
      i < npcCount;
      i++
    ) {

      this.people.push(
        this.person(
          "npc-" + uid(),
          pick(FIRST) +
            " " +
            pick(LAST),
          false,
          false
        )
      );
    }


    const victim =
      pick(
        this.people.filter(
          p => !p.isPlayer
        )
      );

    const accomplice =
      Math.random() < 0.25
        ? pick(
            this.people.filter(
              p =>
                !p.isPlayer &&
                p.id !== victim.id
            )
          )
        : null;


    const killer =
      this.singlePlayer
        ? pick(
            this.people.filter(
              p =>
                !p.isPlayer &&
                p.id !== victim.id
            )
          )
        : this.get(killerId);


    this.cameras = buildCameraNetwork(this.world[1]);

    this.truth = {

      killerId:
        killer?.id || null,

      victimId:
        victim.id,

      motive:
        pick(MOTIVES),

      pressure:
        pick(PRESSURES),

      accompliceId:
        accomplice?.id || null,

      crimeStart:
        18 +
        Math.floor(
          Math.random() * 9
        ),

      crimeMinute: null,

      scene: null,

      witnessIds: [],

      crimeCommitted: false
    };


    for (const p of this.people) {

      this.remember(
        p,
        "routine",
        `I arrived at ${p.location}.`,
        {
          confidence: 96,
          importance: 38,
          source: "self"
        }
      );


      for (let i = 0; i < 5; i++) {

        const other =
          pick(
            this.people.filter(
              x => x.id !== p.id
            )
          );

        const texts = [

          `I spoke briefly with ${other.name}.`,

          `I noticed ${other.name} nearby.`,

          `I kept to my own schedule in ${p.location}.`,

          `I heard people moving through the area.`,

          `I checked something on my schedule.`
        ];

        this.remember(
          p,
          pick([
            "episodic",
            "observation",
            "conversation",
            "routine"
          ]),
          pick(texts),
          {
            confidence:
              52 +
              Math.random() * 38,

            importance:
              28 +
              Math.random() * 38
          }
        );
      }


      this.remember(
        p,
        "secret",
        `Private concern: ${p.secret}.`,
        {
          confidence: 100,
          importance: 98,
          source: "self"
        }
      );
    }


    if (killer) {

      this.remember(
        killer,
        "secret",
        `Private motive pressure: ${this.truth.motive}. ${this.truth.pressure}.`,
        {
          confidence: 100,
          importance: 100,
          source: "self"
        }
      );
    }


    this.event(
      "WORLD",
      `The ${this.world[0]} simulation opens. ${this.people.length} people have independent routines, relationships and private concerns.`
    );


    this.add({

      type: "environmental",

      title:
        "Opening environment",

      description:
        `${this.world[1].length} active areas create movement routes, blind spots and opportunities for conflicting observations.`,

      reliability: 90,

      source: "venue"
    });


    this.phase =
      "PRE-CRIME";


    if (this.singlePlayer) {
      this.scheduleSoloCrime();
    }
  }


  /* =======================================================
     GET / CLOCK
     ======================================================= */

  get(id) {

    return this.people.find(
      p => p.id === id
    );
  }


  clock() {

    const x =
      19 * 60 + this.t;

    return (
      String(
        Math.floor(x / 60) % 24
      ).padStart(2, "0")
      +
      ":" +
      String(
        x % 60
      ).padStart(2, "0")
    );
  }


  event(
    type,
    text,
    privateTo
  ) {

    this.events.push({

      id: uid(),

      time: this.clock(),

      type,

      text:
        clean(text, 900),

      privateTo:
        privateTo || null
    });
  }


  add(e) {

    this.evidence.push({

      id: uid(),

      createdAt:
        this.clock(),

      reliability:
        clamp(
          Math.round(
            e.reliability ?? 60
          ),
          0,
          100
        ),

      visibility:
        e.visibility ||
        "public",

      ...e
    });
  }


  /* =======================================================
     TIME
     ======================================================= */

  tick(n) {

    if (this.caseClosed) {
      return;
    }

    this.t +=
      clamp(
        Number(n) || 1,
        1,
        8
      );


    for (
      const p of this.people.filter(
        x =>
          !x.isPlayer &&
          x.alive
      )
    ) {

      if (
        Math.random() < 0.5
      ) {

        const old =
          p.location;

        const newLoc =
          pick(this.world[1]);

        if (
          newLoc !== old
        ) {

          p.location =
            newLoc;

          this.remember(
            p,
            "observation",
            `I moved from ${old} to ${newLoc}.`,
            {
              confidence: 98,
              importance: 36,
              source: "self"
            }
          );
        }
      }


      if (
        Math.random() < 0.28
      ) {

        const nearby =
          this.people.filter(
            x =>
              x.id !== p.id &&
              x.alive &&
              x.location ===
                p.location
          );

        if (nearby.length) {

          const q =
            pick(nearby);

          this.remember(
            p,
            "observation",
            `I noticed ${q.name} in ${p.location}.`,
            {
              confidence:
                62 +
                Math.random() * 28,

              importance: 45,

              source: "self"
            }
          );

          this.relationshipsFor(
            p,
            q
          );
        }
      }


      if (
        Math.random() < 0.18
      ) {

        this.remember(
          p,
          "routine",
          pick([
            "I checked the time.",
            "I reviewed my schedule.",
            "I kept a private matter to myself.",
            "I tried to avoid unnecessary attention."
          ]),
          {
            confidence: 88,
            importance: 24
          }
        );
      }


      if (
        p.memory.length > 42
      ) {

        this.forgetOrCompress(
          p
        );
      }
    }


    if (
      this.t >=
        this.truth.crimeStart &&
      this.phase ===
        "PRE-CRIME"
    ) {

      this.openCrimeWindow();
    }
  }


  /* =======================================================
     CRITICAL WINDOW
     ======================================================= */

  openCrimeWindow() {

    this.phase =
      "CRIME";

    const killer =
      this.get(
        this.truth.killerId
      );


    this.event(
      "WORLD",
      "A critical private opportunity has opened. The venue's routine is temporarily unstable."
    );


    if (killer) {

      this.remember(
        killer,
        "episodic",
        "The critical window is open. I decide what my character does next.",
        {
          confidence: 100,
          importance: 100,
          source: "self"
        }
      );


      if (!this.singlePlayer) {

        this.event(
          "PRIVATE",
          "The critical window is open. Your decision is yours alone. Commit only when you choose.",
          killer.id
        );
      }
    }
  }


  /* =======================================================
     SOLO KILLER
     ======================================================= */

  scheduleSoloCrime() {

    const delay =
      DIFFICULTY[
        this.difficulty
      ].crimeDelay *
      1000;


    setTimeout(
      () => {

        if (
          this.caseClosed ||
          this.truth.crimeCommitted
        ) {

          return;
        }


        if (
          this.phase !== "CRIME"
        ) {

          this.openCrimeWindow();
        }


        setTimeout(
          () =>
            this.aiKillerDecision(),
          delay
        );

      },
      delay
    );
  }


  aiKillerDecision() {

    if (
      !this.singlePlayer ||
      this.caseClosed ||
      this.truth.crimeCommitted
    ) {

      return;
    }


    const killer =
      this.get(
        this.truth.killerId
      );

    if (!killer) {
      return;
    }


    const guard =
      DIFFICULTY[
        this.difficulty
      ].guard;


    if (
      Math.random() < guard &&
      killer.stress > 72
    ) {

      this.event(
        "NPC",
        `${killer.name} appears unusually cautious and delays a planned movement.`
      );


      killer.stress =
        clamp(
          killer.stress - 8,
          0,
          100
        );


      setTimeout(
        () =>
          this.aiKillerDecision(),
        DIFFICULTY[
          this.difficulty
        ].crimeDelay *
          1000
      );

      return;
    }


    this.remember(
      killer,
      "episodic",
      "I chose to act during the critical window.",
      {
        confidence: 100,
        importance: 100,
        source: "self"
      }
    );


    this.event(
      "NPC",
      "An autonomous character made a consequential decision during the critical window."
    );


    this.crime();
  }


  /* =======================================================
     HUMAN KILLER
     ======================================================= */

  killerDecision(pid) {

    const p =
      this.get(pid);


    if (
      !p ||
      p.id !==
        this.truth.killerId ||
      this.singlePlayer ||
      this.phase !==
        "CRIME"
    ) {

      return;
    }


    this.remember(
      p,
      "episodic",
      "I committed to the critical decision. The hidden case event now resolves.",
      {
        confidence: 100,
        importance: 100,
        source: "self"
      }
    );


    this.event(
      "PRIVATE",
      "You committed to the critical decision. The case has moved past the critical window.",
      pid
    );


    this.crime();
  }


  /* =======================================================
     CRIME
     ======================================================= */

  crime() {

    const victim =
      this.get(
        this.truth.victimId
      );

    const killer =
      this.get(
        this.truth.killerId
      );


    if (
      !victim ||
      !victim.alive ||
      !killer ||
      this.truth.crimeCommitted
    ) {

      return;
    }


    const scene =
      killer.location;


    const witnesses =
      this.people.filter(
        p =>
          p.alive &&
          p.id !== killer.id &&
          p.id !== victim.id &&
          p.location === scene
      );


    victim.alive =
      false;

    victim.location =
      scene;


    this.truth.crimeCommitted =
      true;

    this.truth.crimeMinute =
      this.t;

    this.truth.scene =
      scene;

    this.truth.witnessIds =
      witnesses.map(
        x => x.id
      );


    this.phase =
      "POST-CRIME";


    this.event(
      "CRIME",
      `A death is discovered in ${scene}. The exact sequence is not revealed to the players.`
    );


    for (
      const witness of witnesses
    ) {

      this.remember(
        witness,
        "episodic",
        `I was in ${scene} when the venue's routine abruptly changed. I may not remember every detail.`,
        {
          confidence:
            70 +
            Math.random() * 20,

          importance: 78,

          source: "self"
        }
      );
    }


    this.add({

      type: "timeline",

      title:
        "Estimated critical window",

      description:
        `Independent observations place the death around ${this.clock()}, but the exact minute remains uncertain.`,

      reliability: 62,

      source:
        "initial assessment"
    });


    this.add({

      type: "trace",

      title:
        `Scene disturbance: ${scene}`,

      description:
        "Recent environmental disruption is consistent with several possible explanations. It identifies a place, not a culprit.",

      reliability: 68,

      source: "scene"
    });


    if (
      witnesses.length
    ) {

      this.add({

        type: "testimony",

        title:
          "Nearby witness lead",

        description:
          `${witnesses.length} simulated person(s) were near the scene. Each has a different memory and may be uncertain or self-protective.`,

        reliability: 58,

        source:
          witnesses
            .map(x => x.name)
            .join(", ")
      });
    }


    this.add({

      type: "digital",

      title:
        "Partial access record",

      description:
        `A system record shows activity associated with ${scene} near the critical window. It is incomplete and should be corroborated.`,

      reliability: 72,

      source: "system log"
    });


    this.add({

      type: "environmental",

      title:
        "Environmental inconsistency",

      description:
        `Something about the ${scene} environment does not perfectly match the ordinary routine. It is a lead, not proof.`,

      reliability: 61,

      source: "scene"
    });


    this.event(
      "WORLD",
      "The venue enters investigation mode. People can be questioned, followed, compared and challenged."
    );


    this.phase =
      "INVESTIGATION";
  }


  /* =======================================================
     RELATIONSHIPS
     ======================================================= */

  relationshipsFor(p, q) {

    if (
      !p.relationships[q.id]
    ) {

      p.relationships[q.id] = {

        trust:
          Math.floor(
            40 +
            Math.random() * 35
          ),

        familiarity:
          Math.floor(
            20 +
            Math.random() * 60
          )
      };
    }


    if (
      Math.random() < 0.2
    ) {

      const belief =
        `${q.name} may know more than they admit.`;


      if (
        !p.beliefs.includes(
          belief
        )
      ) {

        p.beliefs.push(
          belief
        );


        this.remember(
          p,
          "belief",
          belief,
          {
            confidence:
              35 +
              Math.random() * 35,

            importance: 55,

            source: "inference"
          }
        );


        p.suspicion =
          clamp(
            p.suspicion +
              (
                Math.random() < 0.5
                  ? 3
                  : -1
              ),
            0,
            100
          );
      }
    }
  }


  /* =======================================================
     ACTION PARSER
     ======================================================= */

  parseAction(p, raw) {

    const lower =
      raw.toLowerCase();

    let result =
      null;


    const move =
      /(?:move|go|walk|head|travel|return)\s+(?:to\s+)?(.+)/i
        .exec(raw);


    if (move) {

      const target =
        move[1]
          .replace(
            /[.!?]+$/g,
            ""
          )
          .trim();


      const area =
        this.world[1].find(
          x =>
            x.toLowerCase() ===
            target.toLowerCase()
        )
        ||
        this.world[1].find(
          x =>
            x.toLowerCase().includes(
              target.toLowerCase()
            )
            ||
            target.toLowerCase().includes(
              x.toLowerCase()
            )
        );


      if (area) {

        const old =
          p.location;

        p.location =
          area;

        result =
          `${p.name} moved from ${old} to ${area}.`;


        this.remember(
          p,
          "episodic",
          `I moved from ${old} to ${area}.`,
          {
            confidence: 100,
            importance: 68,
            source: "self"
          }
        );
      }
    }


    if (
      !result &&
      /(?:follow|tail)\s+/i
        .test(lower)
    ) {

      const target =
        this.people.find(
          x =>
            x.alive &&
            x.id !== p.id &&
            lower.includes(
              x.name.toLowerCase()
            )
        );


      if (target) {

        const old =
          p.location;

        p.location =
          target.location;


        result =
          `${p.name} followed ${target.name} toward ${target.location}.`;


        this.remember(
          p,
          "observation",
          `I followed ${target.name} to ${target.location}.`,
          {
            confidence: 100,
            importance: 72,
            source: "self"
          }
        );
      }
    }


    if (
      !result &&
      /(?:search|inspect|examine|look through|check)\b/i
        .test(lower)
    ) {

      result =
        `${p.name} carefully inspected ${p.location}.`;


      this.add({

        type:
          p.investigatorRole ===
          "Forensic Analyst"
            ? "trace"
            : "observation",

        title:
          `Inspection: ${p.location}`,

        description:
          `${p.investigatorRole || "Investigator"} inspected the area. The resulting lead must be corroborated with independent evidence.`,

        reliability:
          58 +
          Math.random() * 27,

        source:
          p.name
      });
    }


    if (
      !result &&
      /(?:talk|speak|ask)\s+(?:to\s+)?/i
        .test(lower)
    ) {

      const target =
        this.people.find(
          x =>
            x.alive &&
            x.id !== p.id &&
            lower.includes(
              x.name.toLowerCase()
            )
        );


      if (target) {

        result =
          `${p.name} approached ${target.name} in ${target.location}.`;


        this.remember(
          p,
          "conversation",
          `I spoke with ${target.name} in ${target.location}.`,
          {
            confidence: 95,
            importance: 55,
            source: "self"
          }
        );


        this.remember(
          target,
          "conversation",
          `${p.name} approached me in ${target.location}.`,
          {
            confidence: 95,
            importance: 55,
            source: "self"
          }
        );
      }
    }


    return result;
  }


  /* =======================================================
     PLAYER ACTION
     ======================================================= */

  async action(pid, raw) {

    const p =
      this.get(pid);


    if (
      !p ||
      !p.alive ||
      this.caseClosed
    ) {

      return;
    }


    raw =
      clean(
        raw,
        600
      ).trim();


    if (!raw) {
      return;
    }


    this.tick(
      2 +
      Math.floor(
        Math.random() * 3
      )
    );


    p.lastAction =
      raw;


    this.remember(
      p,
      "episodic",
      `I chose to: ${raw}`,
      {
        confidence: 100,
        importance: 72,
        source: "self"
      }
    );


    const parsed =
      this.parseAction(
        p,
        raw
      );


    this.event(
      "PLAYER",
      parsed ||
        `${p.name}: ${raw}`
    );


    if (
      p.role === "KILLER" &&
      this.phase === "CRIME"
    ) {

      this.add({

        type:
          "behavioral",

        title:
          "Critical-period behavior",

        description:
          "A human player's choice during the critical period can later be compared with movement, testimony and other evidence.",

        reliability:
          35 +
          Math.random() * 35,

        source:
          "simulation"
      });
    }


    await this.narrate(
      p,
      raw
    );


    this.npcs();

    this.emit();
  }


  /* =======================================================
     AI NARRATION
     ======================================================= */

  async narrate(p, raw) {

    if (!ai) {

      this.event(
        "GM",
        `${p.name} acts in ${p.location}. The local simulation records the choice and lets the world react.`
      );

      return;
    }


    try {

      const response =
        await ai.responses.create({

          model: MODEL,

          input: [

            {
              role: "system",

              content:
                "You are the narrative GM for a fictional, non-graphic multiplayer murder mystery. The server is authoritative. Never reveal hidden case truth, never identify the hidden Killer, never control a human player's choices or speech, and never provide real-world instructions for violence. Return only the requested structured fields."
            },

            {
              role: "user",

              content:
                `Actor: ${p.name}
Public role: ${p.role}
Investigator specialty: ${p.investigatorRole || "none"}
Location: ${p.location}
Phase: ${this.phase}
Clock: ${this.clock()}
Player action: ${raw}
Nearby people: ${this.people
                  .filter(
                    x =>
                      x.alive &&
                      x.location ===
                        p.location &&
                      x.id !== p.id
                  )
                  .map(x => x.name)
                  .join(", ")}`
            }
          ],

          text: {

            format: {

              type:
                "json_schema",

              name:
                "nocturne_gm",

              strict:
                true,

              schema: {

                type:
                  "object",

                properties: {

                  narration: {
                    type:
                      "string"
                  },

                  evidence: {

                    anyOf: [

                      {
                        type:
                          "object",

                        properties: {

                          type: {
                            type:
                              "string"
                          },

                          title: {
                            type:
                              "string"
                          },

                          description: {
                            type:
                              "string"
                          },

                          reliability: {
                            type:
                              "number"
                          }
                        },

                        required: [
                          "type",
                          "title",
                          "description",
                          "reliability"
                        ],

                        additionalProperties:
                          false
                      },

                      {
                        type:
                          "null"
                      }
                    ]
                  },

                  npcReaction: {

                    anyOf: [

                      {
                        type:
                          "string"
                      },

                      {
                        type:
                          "null"
                      }
                    ]
                  }
                },

                required: [
                  "narration",
                  "evidence",
                  "npcReaction"
                ],

                additionalProperties:
                  false
              }
            }
          }
        });


      const x =
        JSON.parse(
          response.output_text ||
            "{}"
        );


      if (x.narration) {

        this.event(
          "GM",
          clean(
            x.narration,
            900
          )
        );
      }


      if (x.evidence) {

        this.add({

          type:
            clean(
              x.evidence.type,
              40
            ) ||
            "observation",

          title:
            clean(
              x.evidence.title,
              120
            ),

          description:
            clean(
              x.evidence.description,
              500
            ),

          reliability:
            Number(
              x.evidence.reliability
            ) || 60,

          source:
            "GM"
        });
      }


      if (x.npcReaction) {

        this.event(
          "NPC",
          clean(
            x.npcReaction,
            500
          )
        );
      }

    } catch (e) {

      console.error(
        "[NOCTURNE] Narrative AI error:",
        e
      );


      this.event(
        "GM",
        `${p.name}'s action changes the situation. The local simulation remains authoritative.`
      );
    }
  }


  /* =======================================================
     NPC REACTIONS
     ======================================================= */

  npcs() {

    for (
      const p of this.people.filter(
        x =>
          !x.isPlayer &&
          x.alive
      )
    ) {

      if (
        Math.random() < 0.2
      ) {

        const q =
          pick(
            this.people.filter(
              x =>
                x.id !== p.id &&
                x.alive
            )
          );


        if (q) {

          this.relationshipsFor(
            p,
            q
          );
        }
      }


      if (
        p.stress > 65 &&
        Math.random() < 0.1
      ) {

        this.add({

          type:
            "behavioral",

          title:
            "Nervous behavior",

          description:
            `${p.name} appears increasingly guarded. Stress can distort recollection and does not prove guilt.`,

          reliability:
            45 +
            Math.random() * 30,

          source:
            p.name
        });
      }
    }
  }


  /* =======================================================
     QUESTIONS
     ======================================================= */

  ask(
    askerId,
    targetId,
    question
  ) {

    const asker =
      this.get(askerId);

    const target =
      this.get(targetId);


    if (
      !asker ||
      !target ||
      !asker.alive ||
      !target.alive ||
      asker.id === target.id ||
      this.caseClosed
    ) {

      return;
    }


    const qText =
      clean(
        question,
        400
      ).trim();


    if (!qText) {
      return;
    }


    this.tick(1);


    const id =
      uid();


    this.questions.set(
      id,
      {
        askerId,
        targetId,
        target: qText,
        createdAt: this.t
      }
    );


    if (target.isPlayer) {

      this.event(
        "QUESTION",
        `${asker.name} requested an answer from ${target.name}.`
      );


      this.room.io
        .to(target.id)
        .emit(
          "incomingQuestion",
          {
            questionId: id,
            from: asker.name,
            question: qText
          }
        );


      this.room.io
        .to(asker.id)
        .emit(
          "questionPending",
          {
            questionId: id,
            target: target.name
          }
        );


      this.emit();

      return;
    }


    this.npcAnswer(id);
  }


  npcAnswer(qid) {

    const q =
      this.questions.get(
        qid
      );


    if (!q) {
      return;
    }


    const npc =
      this.get(
        q.targetId
      );

    const asker =
      this.get(
        q.askerId
      );


    if (!npc || !asker) {
      return;
    }


    const query =
      q.target.toLowerCase();


    const memories =
      this.recall(
        npc,
        ""
      )
      .filter(
        m =>
          m.type !==
          "secret"
      )
      .slice(0, 7);


    let text;
    let conf = 58;


    const matching =
      memories.filter(
        m =>
          query
            .split(/\s+/)
            .some(
              w =>
                w.length > 3 &&
                m.text
                  .toLowerCase()
                  .includes(w)
            )
      );


    if (
      npc.id ===
        this.truth.accompliceId &&
      Math.random() < 0.75
    ) {

      text =
        `${npc.name} becomes guarded. “I remember parts of that period, but I am not comfortable discussing everything I know.”`;

      conf = 61;

    } else if (
      matching.length
    ) {

      const m =
        pick(matching);

      const hedge =
        m.confidence < 65
          ? "I think "
          : "";


      text =
        `${npc.name} recalls: “${hedge}${m.text}${m.confidence < 72 ? " I may be wrong about the exact timing." : ""}”`;

      conf =
        m.confidence;

    } else if (
      /where|location|located|during|time|when/
        .test(query)
    ) {

      text =
        `${npc.name} says they were in ${npc.location}, but cannot account for every minute.`;

      conf = 55;

    } else if (
      Math.random() < 0.42
    ) {

      text =
        `${npc.name} deflects. “I would rather keep some personal matters private.” Their reluctance may concern a separate secret.`;

      conf = 45;

    } else {

      text =
        `${npc.name} says they did not directly witness the event and can only describe what they personally remember.`;

      conf = 50;
    }


    const reliability =
      clamp(
        conf -
          npc.stress / 5 +
          Math.random() * 10,
        30,
        92
      );


    this.add({

      type:
        "testimony",

      title:
        `Statement from ${npc.name}`,

      description:
        text,

      reliability,

      source:
        npc.name
    });


    npc.stress =
      clamp(
        npc.stress + 5,
        0,
        100
      );


    this.remember(
      npc,
      "conversation",
      `I was questioned by ${asker.name}: ${q.target}`,
      {
        confidence: 100,
        importance: 62,
        source: "interview"
      }
    );


    this.event(
      "INVESTIGATION",
      `${asker.name} questioned ${npc.name}.`
    );


    this.room.io
      .to(q.askerId)
      .emit(
        "questionAnswer",
        {
          questionId: qid,
          target: npc.name,
          answer: text,
          source: npc.name
        }
      );


    this.questions.delete(
      qid
    );


    this.emit();
  }


  answer(
    pid,
    qid,
    answer
  ) {

    const q =
      this.questions.get(
        qid
      );


    if (
      !q ||
      q.targetId !== pid
    ) {

      return;
    }


    const p =
      this.get(pid);

    const a =
      this.get(
        q.askerId
      );


    if (
      !p ||
      !a ||
      !p.alive
    ) {

      return;
    }


    const text =
      clean(
        answer,
        700
      ).trim();


    if (!text) {
      return;
    }


    this.add({

      type:
        "testimony",

      title:
        `Statement from ${p.name}`,

      description:
        text,

      reliability: 78,

      source:
        p.name
    });


    this.remember(
      p,
      "conversation",
      `I answered ${a.name}: ${text}`,
      {
        confidence: 100,
        importance: 72,
        source: "self"
      }
    );


    this.event(
      "INVESTIGATION",
      `${p.name} answered a direct question from ${a.name}.`
    );


    this.room.io
      .to(a.id)
      .emit(
        "questionAnswer",
        {
          questionId: qid,
          target: p.name,
          answer: text,
          source: p.name
        }
      );


    this.questions.delete(
      qid
    );


    this.emit();
  }


  /* =======================================================
     INVESTIGATION
     ======================================================= */

  investigate(
    pid,
    payload
  ) {

    const actor =
      this.get(pid);


    if (
      !actor ||
      !actor.alive ||
      this.caseClosed
    ) {

      return;
    }


    const target =
      clean(
        payload.target,
        180
      ).trim();


    if (
      payload.mode ===
      "question"
    ) {

      const matches =
        this.people.filter(
          x =>
            x.alive &&
            x.id !== actor.id &&
            (
              x.name
                .toLowerCase()
                .includes(
                  target.toLowerCase()
                )
              ||
              x.location
                .toLowerCase()
                .includes(
                  target.toLowerCase()
                )
            )
        );


      if (matches.length) {

        this.ask(
          pid,
          matches[0].id,
          payload.question ||
            `What do you remember about ${target}?`
        );

        return;
      }
    }


    this.tick(1);


    const area =
      this.world[1].find(
        x =>
          x.toLowerCase() ===
          target.toLowerCase()
      );


    const description =
      area
        ? `You inspected ${area}. Movement, environmental and witness details can be cross-checked against the rest of the case.`
        : `You investigated ${target || actor.location}. The result is a lead, not automatic proof.`;


    this.add({

      type:
        actor.investigatorRole ===
        "Forensic Analyst"
          ? "trace"
          : "observation",

      title:
        `Investigation: ${target || actor.location}`,

      description,

      reliability:
        60 +
        Math.random() * 27,

      source:
        actor.name
    });


    this.event(
      "INVESTIGATION",
      `${actor.name} investigated ${target || actor.location}.`
    );


    this.emit();
  }


  /* =======================================================
     ACCUSATION
     ======================================================= */

  accuse(
    pid,
    target
  ) {

    const actor =
      this.get(pid);

    const accused =
      this.get(target);


    if (
      !actor ||
      !accused ||
      !actor.alive ||
      this.caseClosed
    ) {

      return;
    }


    this.event(
      "ACCUSATION",
      `${actor.name} publicly accuses ${accused.name}.`
    );


    if (
      accused.id ===
      this.truth.killerId
    ) {

      this.phase =
        "ENDED";

      this.caseClosed =
        true;


      this.event(
        "VERDICT",
        `Correct. ${accused.name} was the Killer.`
      );

    } else {

      this.add({

        type:
          "consequence",

        title:
          "False accusation",

        description:
          "The accusation did not match the hidden case truth. The investigation now carries a public contradiction.",

        reliability: 90,

        source:
          actor.name
      });


      this.event(
        "VERDICT",
        "Incorrect. The real Killer remains hidden."
      );


      this.phase =
        "INVESTIGATION";
    }


    this.emit();
  }


  /* =======================================================
     VISUAL EVIDENCE
     ======================================================= */

  async visual(
    pid,
    payload = {}
  ) {

    const actor =
      this.get(pid);


    if (
      !actor ||
      !actor.alive ||
      this.caseClosed
    ) {

      return;
    }


    /*
     * Prevent multiple image requests from
     * running at the same time.
     */

    if (this.imageBusy) {

      this.room.io
        .to(pid)
        .emit(
          "errorMessage",
          "Visual generation is already running. Please wait for the current image."
        );

      return;
    }


    this.imageBusy =
      true;


    const type =
      payload.type ===
      "photo"
        ? "photo"
        : "cctv";


    const requestedCameraId = clean(payload.cameraId || "", 30);
    const camera = getCamera(this.cameras, requestedCameraId);
    if (type === "cctv" && !camera) { this.room.io.to(pid).emit("errorMessage", "Invalid CCTV camera for this case. Select one of the available case cameras."); this.imageBusy=false; return; }
    const cameraId = camera?.id || "EVIDENCE-PHOTO";
    const evidenceArea = camera?.area || clean(payload.area || actor.location, 120);


    const title =
      `${cameraId} // ${type.toUpperCase()} // ${this.clock()}`;


    /*
     * STEP 1
     * Confirm that OpenAI exists.
     */

    if (!comfy.configured) {

      console.error(
        "[NOCTURNE] ComfyUI image generation unavailable."
      );

      console.error(
        "[NOCTURNE] GEMINI_API_KEY present:",
        false
      );

      console.error(
        "[NOCTURNE] OpenAI SDK loaded:",
        !!OpenAI
      );

      console.error(
        "[NOCTURNE] Image model:",
        comfy.CHECKPOINT
      );


      this.room.io
        .to(pid)
        .emit(
          "errorMessage",
          "Image generation is not configured on the NOCTURNE server. Check COMFYUI_URL on Render and make sure the Cloudflare ComfyUI tunnel is online."
        );


      this.imageBusy =
        false;

      return;
    }


    try {

      console.log(
        `[NOCTURNE] Image request started. engine=ComfyUI, type=${type}, setting=${this.world[0]}, area=${evidenceArea}`
      );


      /*
       * IMPORTANT:
       * This is visual evidence only.
       * It must not invent authoritative hidden truth.
       */

      const prompt =
        `Create a fictional, non-graphic evidence image for the NOCTURNE murder-mystery game.

This is ${
          type === "photo"
            ? "an investigative scene photograph"
            : "a security camera still"
        }.

Setting:
${this.world[0]}

Available case locations:
${this.world[1].join(", ")}

Evidence area:
${evidenceArea}

Camera ID:
${camera?.id || "not applicable"}

Camera position:
${camera?.position || "handheld investigator camera"}

Camera view:
${camera?.view || "documentary scene view"}

Simulated case time:
${this.clock()}

Visual direction:
- the venue and evidence area must match the generated case exactly
- use only architecture, furniture and environmental objects plausible for this venue and area
- do not substitute a generic location
- imperfect lighting appropriate to the area
- subtle sensor noise and realistic optical imperfections
- restrained documentary framing
- ambiguous but useful visual details
- not a cinematic poster

CCTV continuity rules:
- if this is CCTV, keep the camera physically fixed
- preserve the same camera position, direction, lens character and environmental layout for repeated frames from this camera
- allow people, doors, small objects and transient events to change naturally between frames
- never move the camera or change the room into another location

Do not show:
- gore
- a corpse
- violence
- real people
- celebrities
- logos
- readable credentials
- real-world identifying information

The image should look like imperfect fictional evidence.

It may contain plausible visual observations, but it must not assert hidden case truth.`;


      const negativePrompt =
        "blurry, low quality, distorted, deformed, bad anatomy, extra limbs, text, watermark, cinematic poster, illustration, fantasy environment, generic location";

      let image;
      let imageSource = "ComfyUI";

      if (comfy.configured) {

        console.log(
          `[NOCTURNE] Sending image workflow to local ComfyUI. checkpoint=${comfy.CHECKPOINT}`
        );

        const generated =
          await comfy.request({
            prompt,
            negativePrompt,
            caseSeed: this.seed,
            cameraId,
            type
          });

        image = generated.image;
        imageSource = "ComfyUI";

        console.log(
          `[NOCTURNE] ComfyUI image completed. prompt_id=${generated.promptId}`
        );

      } else if (false) {

        console.log(
          `[NOCTURNE] Calling Gemini Images API with ${IMG}...`
        );

        const response =
          await geminiImageAi.images.generate({
            model: "disabled",
            prompt,
            size: "1344x768",
            response_format: "b64_json",
            n: 1
          });

        const item =
          response?.data?.[0];

        const b64 =
          item?.b64_json;

        const url =
          item?.url;

        if (!b64 && !url) {
          throw new Error(
            "The image API returned no b64_json or url in the first result."
          );
        }

        image =
          b64
            ? `data:image/png;base64,${b64}`
            : url;

        console.log(
          "[NOCTURNE] Gemini image request completed."
        );

      } else {

        throw new Error(
          "No image engine is configured. Set COMFYUI_URL for local ComfyUI."
        );
      }


      const description =
        "Visual evidence generated from the live case state. It is an observation, not automatic truth.";


      const reliability =
        type === "cctv"
          ? 75
          : 65;


      const output = {

        title,

        description,

        reliability,

        image
      };


      /*
       * Store the actual generated image
       * as evidence.
       */

      this.add({

        type:
          "visual",

        title,

        description,

        reliability,

        image,

        source:
          cameraId
      });


      this.event(
        "VISUAL",
        `${actor.name} retrieved ${type.toUpperCase()} evidence from ${cameraId}.`
      );


      /*
       * Send the generated image directly
       * to the requesting player.
       */

      this.room.io
        .to(pid)
        .emit(
          "visualReady",
          output
        );


      this.emit();


    } catch (e) {

      /*
       * THIS IS THE IMPORTANT FIX.
       *
       * The old version had:
       *
       * catch(e){}
       *
       * which completely hid the actual
       * OpenAI error.
       */

      const message =
        errorText(e);


      console.error(
        "=================================================="
      );

      console.error(
        "[NOCTURNE] IMAGE GENERATION FAILED"
      );

      console.error(
        "[NOCTURNE] Gemini image model:",
        comfy.CHECKPOINT
      );

      console.error(
        "[NOCTURNE] Error:",
        message
      );

      console.error(
        "[NOCTURNE] Full error object:",
        e
      );

      console.error(
        "=================================================="
      );


      /*
       * Do NOT create fake evidence.
       *
       * Tell the frontend what actually happened.
       */

      this.room.io
        .to(pid)
        .emit(
          "errorMessage",
          `Image generation failed: ${message}`
        );


    } finally {

      this.imageBusy =
        false;
    }
  }


  /* =======================================================
     PUBLIC STATE
     ======================================================= */

  state() {

    return {

      caseId:
        this.seed
          .slice(0, 10)
          .toUpperCase(),

      mode:
        this.mode,

      difficulty:
        this.difficulty,

      world: {

        name:
          this.world[0],

        areas:
          this.world[1]
      },

      phase:
        this.phase,

      time:
        this.t,

      clock:
        this.clock(),

      cameras:
        this.cameras.map(c => ({ id:c.id, area:c.area, type:c.type, position:c.position, view:c.view })),

      people:
        this.people.map(
          p => ({

            id:
              p.id,

            name:
              p.name,

            isPlayer:
              p.isPlayer,

            job:
              p.job,

            investigatorRole:
              p.investigatorRole,

            location:
              p.location,

            alive:
              p.alive,

            suspicion:
              p.suspicion
          })
        ),

      evidence:
        this.evidence.filter(
          e =>
            e.visibility !==
            "hidden"
        ),

      events:
        this.events
          .filter(
            e =>
              !e.privateTo
          )
          .slice(-100)
    };
  }


  /* =======================================================
     PRIVATE STATE
     ======================================================= */

  private(pid) {

    const p =
      this.get(pid);


    if (!p) {
      return {};
    }


    const base = {

      playerId:
        p.id,

      role:
        p.role,

      investigatorRole:
        p.investigatorRole,

      job:
        p.job,

      trait:
        p.trait,

      goal:
        p.goal,

      memory:
        p.memory.slice(-20),

      beliefs:
        p.beliefs.slice(-12),

      privateEvents:
        this.events
          .filter(
            e =>
              e.privateTo ===
              pid
          )
          .slice(-10)
    };


    /*
     * Multiplayer human Killer.
     */

    if (
      p.role ===
        "KILLER" &&
      !this.singlePlayer
    ) {

      return {

        ...base,

        objective:
          `You are the human Killer. Your motive pressure is ${this.truth.motive}. The AI never controls your speech or decisions. Commit the critical decision only when you choose.`
      };
    }


    /*
     * Investigator state.
     */

    const role =
      ROLES.find(
        x =>
          x[0] ===
          p.investigatorRole
      );


    return {

      ...base,

      objective:
        role
          ? `${role[1]} You can question NPCs and other human players. Their answers are their own.`
          : "Build a defensible case from evidence and contradictions.",

      specialties:
        role
          ? role[2]
          : []
    };
  }


  /* =======================================================
     EMIT
     ======================================================= */

  emit() {

    this.room.io
      .to(this.room.code)
      .emit(
        "stateUpdate",
        this.state()
      );


    for (
      const p of
        this.room.players.values()
    ) {

      this.room.io
        .to(p.id)
        .emit(
          "privateState",
          this.private(p.id)
        );
    }
  }
}


/* =========================================================
   GAME ROOM
   ========================================================= */

class GameRoom {

  constructor(
    code,
    io
  ) {

    this.code =
      code;

    this.io =
      io;

    this.players =
      new Map();

    this.hostId =
      null;

    this.started =
      false;

    this.sim =
      null;
  }


  /* =======================================================
     MULTIPLAYER PLAYER
     ======================================================= */

  addPlayer(
    socket,
    name
  ) {

    const safe =
      clean(
        name,
        24
      ).trim() ||
      "Player";


    this.players.set(
      socket.id,
      {
        id:
          socket.id,

        name:
          safe
      }
    );


    if (!this.hostId) {
      this.hostId =
        socket.id;
    }


    socket.join(
      this.code
    );


    socket.emit(
      "roomJoined",
      {
        code:
          this.code,

        host:
          this.hostId ===
          socket.id,

        mode:
          "MULTIPLAYER"
      }
    );


    this.lobby();
  }


  lobby() {

    this.io
      .to(this.code)
      .emit(
        "lobby",
        {

          code:
            this.code,

          hostId:
            this.hostId,

          players:
            [
              ...this.players.values()
            ].map(
              p => ({

                name:
                  p.name,

                host:
                  p.id ===
                  this.hostId
              })
            )
        }
      );
  }


  /* =======================================================
     MULTIPLAYER START
     ======================================================= */

  async start() {

    if (
      this.started ||
      this.players.size < 2
    ) {

      return;
    }


    this.started =
      true;


    this.sim =
      new Sim(
        [
          ...this.players.values()
        ],
        this,
        {
          singlePlayer:
            false
        }
      );


    this.io
      .to(this.code)
      .emit(
        "caseStarted",
        {
          public:
            this.sim.state()
        }
      );


    this.sim.emit();
  }


  /* =======================================================
     SINGLE PLAYER
     ======================================================= */

  async startSinglePlayer(
    socket,
    options = {}
  ) {

    if (this.started) {
      return;
    }


    this.started =
      true;


    const player = {

      id:
        socket.id,

      name:
        clean(
          options.name,
          24
        ).trim() ||
        "Player"
    };


    this.players.set(
      socket.id,
      player
    );


    this.hostId =
      socket.id;


    socket.join(
      this.code
    );


    this.sim =
      new Sim(
        [player],
        this,
        {

          singlePlayer:
            true,

          difficulty:
            options.difficulty,

          requestedInvestigatorRole:
            options.requestedInvestigatorRole
        }
      );


    socket.emit(
      "roomJoined",
      {

        code:
          this.code,

        host:
          true,

        mode:
          "SINGLE_PLAYER"
      }
    );


    socket.emit(
      "caseStarted",
      {

        public:
          this.sim.state()
      }
    );


    this.sim.emit();
  }


  /* =======================================================
     ACTIONS
     ======================================================= */

  async action(
    id,
    action
  ) {

    if (this.sim) {

      await this.sim.action(
        id,
        action
      );
    }
  }


  killerDecision(id) {

    if (this.sim) {

      this.sim.killerDecision(
        id
      );
    }
  }


  investigate(
    id,
    payload
  ) {

    if (this.sim) {

      this.sim.investigate(
        id,
        payload || {}
      );
    }
  }


  ask(
    id,
    payload
  ) {

    if (this.sim) {

      this.sim.ask(
        id,
        payload?.targetId,
        payload?.question
      );
    }
  }


  answer(
    id,
    payload
  ) {

    if (this.sim) {

      this.sim.answer(
        id,
        payload?.questionId,
        payload?.answer
      );
    }
  }


  accuse(
    id,
    target
  ) {

    if (this.sim) {

      this.sim.accuse(
        id,
        target
      );
    }
  }


  visual(
    id,
    payload
  ) {

    if (this.sim) {

      this.sim.visual(
        id,
        payload || {}
      );
    }
  }


  chat(
    id,
    text
  ) {

    const p =
      this.players.get(id);


    if (
      p &&
      String(text || "").trim()
    ) {

      this.io
        .to(this.code)
        .emit(
          "chat",
          {

            name:
              p.name,

            text:
              clean(
                text,
                800
              )
          }
        );
    }
  }


  /* =======================================================
     REMOVE
     ======================================================= */

  remove(id) {

    this.players.delete(
      id
    );


    if (
      this.hostId ===
      id
    ) {

      this.hostId =
        this.players
          .keys()
          .next()
          .value ||
        null;
    }


    if (
      !this.started
    ) {

      this.lobby();
    }
  }
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  GameRoom,

  openaiConfigured:
    !!ai,

  imageModel:
    IMG,

  textModel:
    MODEL
};
