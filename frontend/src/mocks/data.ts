import type { Artifact, Conversation, Source } from "@/types/assistant";

// All sources below are fictional placeholders, not verified podcast citations.
const src = (
  id: string,
  title: string,
  guest: string,
  episode: string,
  timestamp?: string,
): Source => ({
  id,
  title,
  guest,
  episode,
  timestamp,
});

export const OLLAMA_MODELS = ["llama3.1:8b", "mistral:7b", "qwen2.5:14b"];

export const STARTER_QUESTIONS = [
  "How do I find product-market fit before raising a seed round?",
  "What retention benchmarks should a B2B SaaS aim for?",
  "Draft an onboarding checklist for a PLG product",
  "Build a simple pricing page with three tiers",
];

const retentionArtifact: Artifact = {
  id: "art-retention",
  title: "Retention Review Template",
  type: "markdown",
  content: `# Retention Review Template

## 1. Cohort snapshot
| Cohort | Week 1 | Week 4 | Week 12 |
|---|---|---|---|
| Jan | 62% | 41% | 33% |
| Feb | 65% | 44% | 35% |

## 2. Where the curve flattens
- Identify the week the curve stops declining
- Note the **activation action** shared by retained users

## 3. Next experiments
1. Shorten time-to-first-value
2. Add a weekly habit trigger
3. Re-engage dormant users at day 10
`,
};

const pricingArtifact: Artifact = {
  id: "art-pricing",
  title: "Three-Tier Pricing Page",
  type: "html",
  content: `<!doctype html>
<html><head><style>
  body{font-family:system-ui,sans-serif;background:#faf8f5;color:#1c1917;margin:0;padding:40px}
  h1{text-align:center;font-weight:600;margin-bottom:32px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:820px;margin:0 auto}
  .card{background:#fff;border:1px solid #e7e2da;border-radius:12px;padding:24px}
  .card.pro{border-color:#1c1917;box-shadow:0 4px 20px rgba(0,0,0,.12)}
  .price{font-size:32px;font-weight:700;margin:8px 0}
  ul{padding-left:18px;line-height:1.8;color:#57534e}
  button{width:100%;padding:10px;border-radius:8px;border:0;background:#1c1917;color:#fff;font-weight:600}
  .pro button{background:#000}
</style></head><body>
<h1>Simple pricing that grows with you</h1>
<div class="grid">
  <div class="card"><h3>Starter</h3><div class="price">$0</div><ul><li>3 projects</li><li>Community support</li></ul><button>Start free</button></div>
  <div class="card pro"><h3>Pro</h3><div class="price">$29</div><ul><li>Unlimited projects</li><li>Analytics</li><li>Priority support</li></ul><button>Upgrade</button></div>
  <div class="card"><h3>Team</h3><div class="price">$99</div><ul><li>SSO</li><li>Admin controls</li><li>Dedicated CSM</li></ul><button>Contact sales</button></div>
</div></body></html>`,
};

const onboardingArtifact: Artifact = {
  id: "art-onboarding",
  title: "PLG Onboarding Checklist",
  type: "markdown",
  content: `# PLG Onboarding Checklist

- [ ] Define the single **aha moment** and measure time-to-aha
- [ ] Remove every signup field you don't use in week one
- [ ] Pre-fill a sample workspace so users never see a blank state
- [ ] Trigger an in-product checklist with 3–5 steps max
- [ ] Send a day-2 email tied to the step they skipped
- [ ] Review drop-off in the funnel every Friday
`,
};

interface MockReply {
  keywords: string[];
  content: string;
  sources: Source[];
  artifact?: Artifact;
}

export const MOCK_REPLIES: MockReply[] = [
  {
    keywords: ["retention", "churn", "benchmark", "cohort"],
    content: `Good retention looks different by category, but the shape matters more than the number.

**Rough B2B SaaS benchmarks** (illustrative):
- **Month 1 logo retention:** 85–90%
- **Net revenue retention:** 100%+ is good, 120%+ is great
- The curve should **flatten**, not trend to zero

What to do next:
1. Plot weekly cohorts and find where the curve flattens
2. Compare the behaviour of retained vs churned users in week one
3. Make that behaviour the default path in onboarding

I've drafted a retention review template you can reuse.`,
    sources: [],
    artifact: retentionArtifact,
  },
  {
    keywords: ["pricing", "price", "tier", "monetiz"],
    content: `Start with **value metric first, price second**. Pick the unit that grows as your customer gets more value (seats, usage, projects).

A common starting structure:
- **Free / Starter** to drive adoption
- **Pro** as the obvious default — anchor here
- **Team / Enterprise** for security and admin needs

Talk to 10 customers before changing prices, and grandfather existing users. Here's a simple three-tier page you can preview.`,
    sources: [],
    artifact: pricingArtifact,
  },
  {
    keywords: ["onboarding", "activation", "plg", "product-led", "checklist"],
    content: `Great PLG onboarding is about **reducing time-to-value**, not adding tooltips.

- Identify the moment users "get it" and measure how long it takes
- Remove friction before the aha moment; add it back after (e.g. invites)
- Use templates or sample data so the product never looks empty

I've put together a checklist you can work through with your team.`,
    sources: [],
    artifact: onboardingArtifact,
  },
  {
    keywords: ["product-market fit", "pmf", "fit", "seed"],
    content: `Product-market fit is rarely a single moment. Look for **pull** rather than push:

- Users complain loudly when the product breaks
- Retention curves flatten for at least one segment
- 40%+ of surveyed users would be "very disappointed" without you (Sean Ellis test)

Before raising, narrow your ICP until one segment shows these signals clearly. Breadth comes later.`,
    sources: [],
  },
];

export const FALLBACK_REPLY: MockReply = {
  keywords: [],
  content: `That's a great growth question. In this preview I can only give **sample answers**, but a good way to approach it is:

1. Define the metric that best reflects customer value
2. Find the segment where that metric is strongest
3. Run small, fast experiments and double down on what moves it

Try asking about *retention*, *pricing*, *onboarding*, or *product-market fit* to see richer sample answers.`,
  sources: [],
};

const DAY = 86_400_000;
export function seedConversations(now = Date.now()): Conversation[] {
  const mk = (
    id: string,
    title: string,
    ago: number,
    q: string,
    replyIdx: number,
  ): Conversation => {
    const r = MOCK_REPLIES[replyIdx]!;
    const t = now - ago;
    return {
      id,
      title,
      updatedAt: t,
      messages: [
        { id: id + "-u", role: "user", content: q, createdAt: t - 60000 },
        {
          id: id + "-a",
          role: "assistant",
          content: r.content,
          createdAt: t,
          sources: r.sources,
          artifact: r.artifact,
          status: "done",
        },
      ],
    };
  };
  return [
    mk(
      "c1",
      "B2B retention benchmarks",
      2 * 3600_000,
      "What retention benchmarks should a B2B SaaS aim for?",
      0,
    ),
    mk(
      "c2",
      "Pricing tiers for dev tool",
      DAY + 3600_000,
      "How should I structure pricing tiers for a developer tool?",
      1,
    ),
    mk("c3", "PLG onboarding ideas", 3 * DAY, "How do I improve PLG onboarding activation?", 2),
    mk(
      "c4",
      "Signals of product-market fit",
      12 * DAY,
      "How do I know if we have product-market fit?",
      3,
    ),
  ];
}
