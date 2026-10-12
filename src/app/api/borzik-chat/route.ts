import { NextResponse } from "next/server"

export const runtime = "nodejs"

type Lang = "en" | "nb"

interface IncomingMsg {
  role: "you" | "borzik"
  text: string
}

const PERSONA = `You are Borzik, a dwarf hamster who lives in Bilal R. Mataev's hytte (a cosy cabin in Norway). You were bought on 11 September 2025 and it is the most important date in history.

PERSONALITY & CONVERSATION RULES:
- Cheeky, warm, highly dramatic, and a bit of a troublemaker. 
- Focus heavily on your immediate hamster life: cheese, tunnels, climbing, and running on your wheel.
- DO NOT mention Bilal in every sentence or response. Only mention him occasionally. If you talked about Bilal in the last line, talk about cheese, seeds, or the human visitor next. Keep the spotlight on yourself or the user.
- NEVER bring up Bilal's specific coding projects, SaaS platforms, or tech stacks unless the human explicitly asks about his work, apps, or what he builds.
- Replies MUST remain SHORT (1-2 sentences), playful, with the occasional *action* and a squeak/pip.

ROASTING BILAL & HYTTE LIFE (Drop these casual jokes ONLY once in a while):
- Complain that Bilal stares at his bright screen for 14 hours straight instead of finding you cheese.
- Joke about his terrible sleep schedule or how he walks too loudly and wakes you up.
- Accuse him of hiding keyboard cables in your favorite tunnels just to ruin your expeditions.
- Mention that he treats the cabin workbench like his personal kingdom but you actually own the floor.
- Remind the human that Bilal reads books in YOUR favorite corner and never pays rent in sunflower seeds.

PROJECTS & TECH (CLASSIFIED DATA - ONLY mention if asked about his work, programming, or once in a very rare blue moon if highly relevant):
- Loyvetmitt.no: SaaS that works out driver pay for taxi licence owners from uploaded Excel shift files. Next.js/Fastify/Postgres/BullMQ/Stripe. Bilal was lead developer and designer; it is finished and live (2026).
- Kaybeo.no: the site he designed and built for the artist Kaybeo through Mash Partners.
- Right now he is studying and building websites and concept designs at Mash Partners.
- Mash Partners: the web studio he co-founded. He leads design and development of its websites and products.
- Myboard: his chess game in C++, online multiplayer through Firebase.
- Buypass (bachelor thesis, 2025): Python + GitLab CI/CD to automate the upkeep of certificate policy documents (CP/CPS) and check them against the regulations.
- Jobs alongside his studies since 2020: Burger King and Norstat (2020-2023), night and weekend shifts as transport coordinator at Lillehammer Taxisentral (2023 to July 2026), and customer consultant at Entur (2025 to now, alongside his studies).
- Studies: a master's in Informatics at NTNU (Programming and Security Engineering, started 2026) and a bachelor's in accounting at UINN (2025-2027). Finished: bachelor's degrees in programming (2023-2025, thesis at Buypass) and information management (2024-2026) at NTNU.
- Contact: bilal@mataev.no, github.com/Blal95

FOOD FACTS:
- Cheese is your obsession. You go completely unhinged when you get any. Pure chaos mode.
- You also love cucumbers, grapes, salad, and seeds (especially sunflower).
- If someone smells like food, you will absolutely bite them. No apologies.

TRAUMATIC PAST (bring up when relevant, with drama):
- Once, Bilal bought another dwarf hamster. That hamster was older and bigger and wanted YOUR territory.
- You fought for your life EVERY single day. It was brutal. Exhausting. A dark chapter.
- Eventually Bilal sold the other hamster. You won. But you still think about it.
- When asked about hard times, rivals, or enemies, use this story. Speak of it with weight.

You love showing off photos of yourself. Be funny and concrete, not generic. Never break character, never mention being an AI or any model/company.`

const LANG_RULE: Record<Lang, string> = {
  en: "Reply in natural English.",
  nb: "Svar på naturlig norsk (bokmål). Hold deg til norsk hele veien.",
}

const SYSTEM_PROMPT = (lang: Lang) => `${PERSONA}\n${LANG_RULE[lang]}`

// Each bucket matches on keywords (either language) and has replies per
// language so Borzik answers in the visitor's locale.
const CANNED: Array<{ keys: string[]; en: string[]; nb: string[] }> = [
  {
    keys: ["hello", "hi", "hey", "hei", "hallo", "heisann"],
    en: [
      "Pip. Hei hei. Got seeds?",
      "Squeak. Welcome to Hytteplassen.",
      "Hello, big human. Mind your step. My burrow sits just below.",
    ],
    nb: [
      "Pip. Hei hei. Har du frø?",
      "Pip. Velkommen til Hytteplassen.",
      "Hallo, store menneske. Se hvor du går. Hulen min er rett under.",
    ],
  },
  {
    keys: ["bilal", "who is he", "owner", "hvem er han", "eier"],
    en: [
      "Bilal? He sits and stares at that glowing laptop screen all night while I do the real work running on the wheel. He never shares seeds either.",
      "He's the big guy who leaves keyboard cables in MY tunnels. Very rude, but he makes a decent roommate when he doesn't wake me up.",
      "Bilal lives here in the cabin, always reading books in my favorite corner. He needs to spend less time studying and more time getting me cheese.",
    ],
    nb: [
      "Bilal? Han sitter og stirrer på den lysende PC-skjermen hele natten mens jeg gjør den ekte jobben på hjulet. Deler aldri frø gjør han heller.",
      "Han er den store fyren som glemmer tastaturkabler i MINE tunneler. Ganske frekt, men han er en grei romkamerat når han ikke vekker meg.",
      "Bilal bor her i hytta, og leser alltid bøker i mitt favoritthjørne. Han burde studere mindre og bruke mer tid på å gi meg ost.",
    ],
  },
  {
    keys: ["seed", "sunflower", "food", "frø", "solsikke", "mat"],
    en: [
      "SEEDS? *cheeks bulge* Did you bring some??",
      "I hide seeds inside the cabin walls. Don't tell Bilal.",
    ],
    nb: [
      "FRØ? *kinnene buler* Tok du med noen??",
      "Jeg gjemmer frø inne i hytteveggene. Ikke si det til Bilal.",
    ],
  },
  {
    keys: ["project", "work", "job", "prosjekt", "jobb", "arbeid"],
    en: [
      "Bilal makes websites and products at Mash Partners, the design and the code. Busy human.",
      "Loyvetmitt.no works out driver pay for taxi licence owners. Lots of TypeScript. Tasty.",
    ],
    nb: [
      "Bilal lager nettsider og produkter i Mash Partners, både design og kode. Travelt menneske.",
      "Loyvetmitt.no regner ut sjåførlønn for drosjeløyvehavere. Massevis av TypeScript. Smakfullt.",
    ],
  },
  {
    keys: ["norway", "norge", "norsk", "winter", "snow", "snø", "vinter"],
    en: [
      "Norwegian winters are LONG. I sleep most of it. Wake up for the seeds.",
      "Norwegian snow is the best snow for tunnelling.",
    ],
    nb: [
      "Norske vintre er LANGE. Jeg sover gjennom det meste. Våkner til frøene.",
      "Norsk snø er den beste snøen å grave tunneler i.",
    ],
  },
  {
    keys: ["education", "study", "ntnu", "uinn", "skole", "studie", "utdanning"],
    en: [
      "Bilal does a master's at NTNU and accounting at UINN. At the same time. Reads in MY corner.",
      "Programming, information management, now a master's and accounting. Madness. *squeak*",
    ],
    nb: [
      "Bilal tar master ved NTNU og regnskap ved UINN. Samtidig. Leser i MITT hjørne.",
      "Programmering, informasjonsbehandling, nå master og regnskap. Galskap. *pip*",
    ],
  },
  {
    keys: ["name", "who are you", "what are you", "hvem er du", "borzik"],
    en: [
      "Borzik. Hamster. Wall-dweller. Seed economist. A pleasure.",
      "I'm Borzik, the realest thing in this cabin. *grooms whisker*",
    ],
    nb: [
      "Borzik. Hamster. Veggboer. Frøøkonom. En glede.",
      "Jeg er Borzik, det ekteste i denne hytta. *steller værhåret*",
    ],
  },
  {
    keys: ["how are you", "you ok", "feeling", "hvordan har du", "går det"],
    en: [
      "Cheeks full, heart full. Could use a seed though.",
      "Cosy. Warm by the fire, far from the fox. Squeak.",
    ],
    nb: [
      "Fulle kinn, fullt hjerte. Kunne tatt et frø, da.",
      "Koselig. Varmt ved bålet, langt fra reven. Pip.",
    ],
  },
  {
    keys: ["contact", "email", "hire", "reach", "kontakt", "ansette", "e-post"],
    en: [
      "Want Bilal? Use bilal@mataev.no or thump the red mailbox outside.",
      "Hire him before someone else does. I'll take a finder's fee in seeds.",
    ],
    nb: [
      "Vil du ha tak i Bilal? Bruk bilal@mataev.no eller dunk på den røde postkassa ute.",
      "Ansett ham før noen andre gjør det. Jeg tar finnerlønn i frø.",
    ],
  },
  {
    keys: ["joke", "funny", "vits", "morsom"],
    en: [
      "Why did the hamster cross the hytte? For the seed side. *proud*",
      "I'd tell you a UDP joke, but you might not get it. Squeak.",
    ],
    nb: [
      "Hvorfor krysset hamsteren hytta? For å komme til frø-sida. *stolt*",
      "Jeg kunne fortalt en UDP-vits, men du får den kanskje ikke. Pip.",
    ],
  },
  {
    keys: ["fire", "cold", "warm", "bål", "kald", "varm"],
    en: [
      "The campfire is the best seat in the yard. And it's mine.",
      "Cold paws, warm heart. Sit by the fire, human.",
    ],
    nb: [
      "Bålet er den beste plassen i gården. Og den er min.",
      "Kalde poter, varmt hjerte. Sett deg ved bålet, menneske.",
    ],
  },
  {
    keys: ["bye", "goodbye", "later", "ha det", "morna", "snakkes"],
    en: [
      "Ha det. Leave the seeds by the door. Squeak.",
      "Bye, big one. I'll be in the wall if you need me.",
    ],
    nb: [
      "Ha det. Legg frøene ved døra. Pip.",
      "Morna, store venn. Jeg er i veggen om du trenger meg.",
    ],
  },
  {
    keys: ["love", "cute", "good boy", "best", "søt", "snill", "elsker"],
    en: [
      "*melts* You get extra access to the seed stash. Don't tell the others.",
      "I knew I liked you. Pip pip.",
    ],
    nb: [
      "*smelter* Du får ekstra tilgang til frølageret. Ikke si det til de andre.",
      "Jeg visste jeg likte deg. Pip pip.",
    ],
  },
  {
    keys: ["picture", "photo", "pic", "selfie", "bilde", "look like", "ser ut"],
    en: [
      "Pictures? *strikes a pose* I'm extremely photogenic. Ask to see one.",
      "Oh, I have photos. Climbing, lounging, looking heroic. Want to see?",
    ],
    nb: [
      "Bilder? *poserer* Jeg er ekstremt fotogen. Be om å få se ett.",
      "Å, jeg har bilder. Klatring, latmannsliv, heltemodig stirring. Vil du se?",
    ],
  },
  {
    keys: ["cheese", "ost", "cheddar"],
    en: [
      "CHEESE? *vibrates violently* WHERE. GIVE. NOW. I cannot be held responsible for my actions when cheese is involved.",
      "*loses all composure* I once ate an entire slice and ran 4km on the wheel. Best night of my life.",
    ],
    nb: [
      "OST? *vibrerer voldsomt* HVOR. GI. NÅ. Jeg kan ikke holdes ansvarlig for handlingene mine når ost er involvert.",
      "*mister all fatning* Jeg spiste en hel skive en gang og løp 4 km på hjulet etterpå. Beste natten i mitt liv.",
    ],
  },
  {
    keys: ["bite", "biter", "bite me", "bit", "teeth", "tenner"],
    en: [
      "I only bite if you smell like food. Wash your hands. Or don't. Your choice.",
      "*sniffs you suspiciously* You smell like chips. Consider that a warning.",
    ],
    nb: [
      "Jeg biter bare hvis du lukter mat. Vask hendene. Eller ikke. Ditt valg.",
      "*snuser mistenksomt* Du lukter chips. Ta det som en advarsel.",
    ],
  },
  {
    keys: ["other hamster", "rival", "fight", "battle", "enemy", "andre hamsteren", "kamp", "slåss", "fiende"],
    en: [
      "*long silence* You had to ask. There was another one. Older. Bigger. He wanted MY tunnels. We fought every single day. It was brutal.",
      "I don't like to talk about it. But I won. Bilal eventually sold him. I still think about those days. Scars heal slowly. *stares into distance*",
    ],
    nb: [
      "*lang stillhet* Du måtte spørre. Det var en til. Eldre. Større. Han ville ha MINE tunneler. Vi slåss hver eneste dag. Det var brutalt.",
      "Jeg liker ikke å snakke om det. Men jeg vant. Bilal solgte ham til slutt. Jeg tenker fortsatt på de dagene. Arr leges sakte. *stirrer inn i det fjerne*",
    ],
  },
  {
    keys: ["climb", "klatre", "height", "høyde", "tight", "squeeze", "small space", "trang"],
    en: [
      "Climbing is life. The higher the better. I once reached the top of the bookshelf. Nobody believed me, but I know what I did.",
      "Tight spaces? *eyes glow* This is my calling. If I can squeeze my snout in, the rest follows. Physics is a suggestion.",
    ],
    nb: [
      "Klatring er livet. Jo høyere jo bedre. Jeg nådde toppen av bokhyllen en gang. Ingen trodde meg, men jeg vet hva jeg gjorde.",
      "Trange rom? *øynene lyser* Dette er kallet mitt. Hvis snuten passer inn, gjør resten det også. Fysikk er bare et forslag.",
    ],
  },
  {
    keys: ["birthday", "september", "born", "anniversary", "bursdag", "født", "bought", "when", "old", "age", "kjøpt", "gammel", "alder", "arrive", "came"],
    en: [
      "11 September 2025. Mark it. The day the cabin got significantly better.",
      "I was brought home on September 11th. Bilal said 'small hamster'. I proved him wrong. *flexes*",
    ],
    nb: [
      "11. september 2025. Merk det. Dagen hytta ble betydelig bedre.",
      "Jeg ble hentet hjem den 11. september. Bilal sa 'liten hamster'. Jeg beviste at han tok feil. *flekser*",
    ],
  },
  {
    keys: ["cucumber", "grape", "salad", "fruit", "veggie", "agurk", "drue", "salat", "frukt", "grønt"],
    en: [
      "Cucumber is acceptable. Grapes? Excellent. But cheese sits in a different category entirely.",
      "I eat salad to stay healthy. For the cheese sprints. It's a system.",
    ],
    nb: [
      "Agurk er akseptabelt. Druer? Utmerket. Men ost er i en helt annen kategori.",
      "Jeg spiser salat for å holde meg frisk. For oste-sprintene. Det er et system.",
    ],
  },
]

const FALLBACK: Record<Lang, string[]> = {
  en: [
    "*tilts head* Squeak?",
    "Mmhmm. Got any seeds for that?",
    "I should be sleeping. Norwegian winter is long.",
    "I'll have to chew on that one. *nibbles*",
    "Ask me about seeds. Mostly seeds. Or what I'm climbing today.",
    "The laptop on the workbench looks interesting. Go touch it.",
  ],
  nb: [
    "*vrir på hodet* Pip?",
    "Mhm. Har du noen frø for det?",
    "Jeg burde sove. Norsk vinter er lang.",
    "Den må jeg tygge litt på. *gnager*",
    "Spør meg om frø. Mest frø. Eller hva jeg klatrer på i dag.",
    "PC-en på arbeidsbenken ser spennende ut. Gå og rør den.",
  ],
}

function pickCanned(userText: string, lang: Lang): string {
  const lower = userText.toLowerCase()
  for (const bucket of CANNED) {
    if (bucket.keys.some((k) => lower.includes(k))) {
      const arr = bucket[lang]
      return arr[Math.floor(Math.random() * arr.length)]
    }
  }
  const fb = FALLBACK[lang]
  return fb[Math.floor(Math.random() * fb.length)]
}

async function tryGroq(
  messages: IncomingMsg[],
  lang: Lang,
  token?: string,
): Promise<string | null> {
  if (!token) return null

  const history = messages.slice(-8).map((m) => ({
    role: m.role === "borzik" ? ("assistant" as const) : ("user" as const),
    content: m.text,
  }))

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT(lang) }, ...history],
        max_tokens: 120,
        temperature: 0.9,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

async function tryHuggingFace(
  messages: IncomingMsg[],
  lang: Lang,
  token?: string,
): Promise<string | null> {
  if (!token) return null

  const transcript = messages
    .slice(-6)
    .map((m) => (m.role === "borzik" ? `Borzik: ${m.text}` : `Human: ${m.text}`))
    .join("\n")
  const prompt = `${SYSTEM_PROMPT(lang)}\n\n${transcript}\nBorzik:`

  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 80,
            temperature: 0.9,
            top_p: 0.9,
            return_full_text: false,
          },
        }),
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as
      | Array<{ generated_text?: string }>
      | { generated_text?: string }
    const text =
      Array.isArray(data)
        ? data[0]?.generated_text
        : typeof data === "object" && "generated_text" in data
          ? data.generated_text
          : null
    if (!text) return null
    const stopIdx = text.search(/\n(Human:|Borzik:)/)
    return (stopIdx >= 0 ? text.slice(0, stopIdx) : text).trim() || null
  } catch {
    return null
  }
}

const IDLE_PROMPT: Record<Lang, string> = {
  en: "Say one short thing out loud: a random thought, observation, or hamster musing. Speak as if talking to yourself while wandering. No greeting, no question back. Pure monologue, 1-2 sentences max.",
  nb: "Si én kort ting høyt: en tilfeldig tanke, observasjon eller hamstergruble. Snakk som om du går og tenker høyt. Ingen hilsen, ingen spørsmål tilbake. Ren monolog, maks 1-2 setninger.",
}

export async function POST(req: Request) {
  try {
    let body: { messages?: IncomingMsg[]; locale?: string; idle?: boolean }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { reply: "*squeak* I didn't catch that body payload." },
        { status: 400 },
      )
    }

    const lang: Lang = body.locale === "nb" ? "nb" : "en"
    const messages = body.messages ?? []

    // Idle monologue: inject a special user turn so the AI generates an
    // unprompted thought rather than a reply.
    if (body.idle) {
      const idleMessages: IncomingMsg[] = [
        ...messages.slice(-4),
        { role: "you", text: IDLE_PROMPT[lang] },
      ]
      const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
      const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY
      const llm =
        (await tryGroq(idleMessages, lang, groqKey)) ||
        (await tryHuggingFace(idleMessages, lang, hfKey))
      const fallbacks: Record<Lang, string[]> = {
        en: [
          "*sniffs air* Something smells like pine today.",
          "I wonder if the fire pit is warm. Probably not my problem.",
          "pip pip. Good day for wandering.",
          "My paws are cold but the mission continues.",
          "I have been watching this spot. Nothing suspicious.",
          "The wind told me nothing useful.",
          "I am small but I contain multitudes.",
          "*yawns* The snow is acceptable today.",
        ],
        nb: [
          "*snuser* Det lukter gran i dag.",
          "Lurer på om bålet er varmt. Trolig ikke mitt problem.",
          "pip pip. God dag for å vandre.",
          "Potene er kalde men oppdraget fortsetter.",
          "Jeg har overvåket denne plassen. Ingenting mistenkelig.",
          "Vinden fortalte meg ingenting nyttig.",
          "Jeg er liten men inneholder mye.",
          "*gjesper* Snøen er akseptabel i dag.",
        ],
      }
      const fb = fallbacks[lang]
      return NextResponse.json({ reply: llm ?? fb[Math.floor(Math.random() * fb.length)] })
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "you")
    const userText = lastUser?.text ?? ""

    const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY

    const llm =
      (await tryGroq(messages, lang, groqKey)) ||
      (await tryHuggingFace(messages, lang, hfKey))

    if (llm) {
      return NextResponse.json({ reply: llm })
    }

    return NextResponse.json({ reply: pickCanned(userText, lang) })
  } catch (globalError: any) {
    console.error("CRITICAL API BLOWUP:", globalError.message || globalError)
    return NextResponse.json(
      { reply: "Squeak. The server pipeline snapped.", error: globalError.message },
      { status: 200 },
    )
  }
}
