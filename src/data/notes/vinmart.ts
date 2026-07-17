import type { FieldNoteData } from "@/components/ui/FieldNote";

export const vinmartNote: FieldNoteData = {
  slug: "vinmart",
  project: "VinMart",
  title: "Eight weeks to rebuild a supermarket",
  deck: "What happens when the dev team leaves, the tills can't stop, and you're the one person left holding a live point-of-sale system.",
  meta: [
    { label: "Role", value: "Sole engineer at handover — inherited, stabilized, rebuilt" },
    { label: "Timeline", value: "Handover May 2026 · rebuild in 8 weeks" },
    { label: "Scale", value: "53 tables · 130 API routes · 424 test files" },
    { label: "Status", value: "Legacy live & evolving · rebuild awaiting cutover" },
  ],
  sections: [
    {
      heading: "The handover",
      body: [
        "In early May 2026, the outsourced team that had built VinMart's retail system over the previous eight months moved on. What they left behind was real: a multi-branch supermarket POS with money flowing through it every day — Laravel API, React checkout, a mobile stock app, a P&L reporting tool. What they also left behind: zero test coverage, fully manual two-step deploys, a receipt renderer held together by accumulated edge-case fixes, and a backups document whose last line read \"Last verified restore: NEVER.\"",
        "I was the one IT person taking it over. Not a senior engineer with a team — one person, and a store that could not stop selling while I figured it out.",
      ],
      pull: "The tills don't wait for you to feel ready.",
    },
    {
      heading: "Stabilize first, then change your mind honestly",
      body: [
        "The first thing I shipped wasn't code. Within a day of the handover I wrote the entire ops runbook suite — backup and restore, deploys, migrations, rollback, incident response — because the most dangerous system is one only its departed authors understand. I wrote down a decision, too: keep the existing stack, improve incrementally, no rewrite.",
        "Three days later, I started the rewrite. Not because the decision was wrong — because the framing was. The real question was never rewrite-or-not; it was whether the store stays safe while you change your mind. So the new system was built parallel-isolated: its own repo, its own database, its own deployment, touching nothing in production. The legacy system kept receiving features the whole time — I was shipping fixes to the old checkout in the same weeks I was building its replacement.",
      ],
    },
    {
      heading: "The rebuild, by the numbers",
      body: [
        "Eight weeks of building: 1,367 commits. A Postgres schema of 53 tables across 77 migrations — sales, shifts, promotions, FIFO vendor lots, stock counting with an append-only audit trail. Around 130 API routes, 67 admin screens, and paired Excel and PDF exporters for everything the back office prints. And 424 test files on a codebase whose predecessor had none.",
        "Every screen ships in Khmer and English — Khmer first, because that's who runs the tills. The translation files alone are six and a half thousand lines per language, and the project rules forbid hardcoding a single user-facing string. Infrastructure target: about fifteen dollars a year. The domain.",
      ],
    },
    {
      heading: "A sale is never silently dropped",
      body: [
        "Phnom Penh's internet does not care that you're mid-transaction. The design spec for the offline mode has one sentence I treated as law: a sale is never silently dropped. When the connection dies, the register keeps selling — sales queue in an IndexedDB outbox under an idempotency key, receipts print with an OFFLINE reference, and a sync engine drains the queue when the network returns.",
        "The subtle engineering is in the failure taxonomy. A rejected sale parks for human review; a transient error retries; a poison pill parks after twenty drain attempts so it can't wedge the queue. And an \"unauthorized\" response during a drain deliberately does not park anything — that means the cashier's session expired, not that the sales are bad. Each synced sale is dated to when the money actually changed hands, not when the server finally heard about it.",
      ],
      pull: "The connection is allowed to fail. The record of a sale is not.",
    },
    {
      heading: "The sixteen-second problem",
      body: [
        "One morning the analytics dashboard took 16.85 seconds to load cold — the same query that took 0.67 seconds warm. The culprit: subqueries scanning hundreds of megabytes of raw sale line-items on a serverless database that had gone to sleep. Fixing it properly meant precomputing: the heavy analytics moved onto materialized views refreshed nightly, the admin shell became a deliberate single-page app so navigation stopped paying the cold-start tax, and a cron pings the hot endpoints every minute so the first cashier of the morning never meets a sleeping database.",
        "The project rules now carry the scar tissue as doctrine: cheap warm, brutal cold. Every new admin page goes through a fifteen-step checklist written so the next feature can't quietly reintroduce the problem.",
      ],
    },
    {
      heading: "Software meets the physical world",
      body: [
        "A supermarket system earns its keep at the point where pixels hit paper and plastic: thermal printers, barcode scanners, label rolls. Receipts render Khmer script on 80mm paper — grapheme widths and all. Barcode labels come in the exact sticker formats the shelves already use, sized so the cashier never has to touch a print dialog's scale setting. The stock-count scanner runs on staff phones, and phone cameras fight back: the code detects when a bare camera request lands on a zoomed telephoto lens, picks the correct main lens, and debounces duplicate reads — because a warehouse count done twice is worse than one done slowly.",
      ],
    },
    {
      heading: "Moving the past, to the cent",
      body: [
        "A new system is worthless if the old data doesn't survive the trip. Seven importers move the legacy database across — products, sales, movements, purchase orders, settlements — using deterministic IDs so re-running an import can never create duplicates. Colliding product codes get quarantined with a suffix and merged by a dedicated tool instead of being silently overwritten.",
        "Then the reconcile harness checks everything: hundreds of thousands of historical sales and stock movements, row counts exact, money matched to the cent. Not approximately migrated. Migrated, and proven.",
      ],
    },
    {
      heading: "The rebuild that hasn't shipped yet",
      body: [
        "Here is the part a portfolio isn't supposed to say: the rebuild is not in production. The code is complete — tested, migrated, cutover runbooks written and rehearsed — and the store still runs on the legacy system. Because a supermarket is not a side project. Cutting over the brain of a live business is a bet you only place when everything says yes, and we're not there yet. So the system selling groceries today is the one the staff already trust, and I'm still shipping features to it every week.",
        "What did the eight weeks buy, then? Everything except the switch — so far. The ops runbooks now protect the legacy system. The test discipline moved backward into how I maintain it. The schema work taught me the business deeper than any handover document could. And the rebuild sits ready on staging, waiting for the day the bet makes sense.",
      ],
      pull: "Code complete is not the same as shipped. A working store outranks a beautiful repo.",
    },
    {
      heading: "What I'd tell you honestly",
      body: [
        "This project runs on discipline armor built from early scars. Any command that writes to production requires typing the literal phrase \"yes prod\" — a reflexive \"yes\" is not accepted. Every change lands in an append-only progress journal. Rollback commands are written down before the deploy, not during the panic.",
        "And the honest lesson I'd share with any engineer inheriting a live system: the bravest thing isn't the rewrite, and it isn't refusing the rewrite. It's keeping the boring old system healthy — deploy by deploy — while your best work waits on the shelf until the business is ready for the risk. The store never noticed any of this happening. That was the whole point.",
      ],
    },
  ],
};
