import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, ArrowRight, ShieldAlert, GitBranch, Users2, Radio,
  LayoutGrid, FileSpreadsheet, Check, Sun, Moon, Menu, X, TrendingUp,
} from "lucide-react";
import { usePreferences } from "../settings/PreferencesContext";
import { billingApi, formatMoney, PlanDto } from "../services/billingApi";

/**
 * Marketing surface. Sits in front of the console for signed-out visitors; the only way forward is
 * `onEnter`, which hands over to the existing AuthModule untouched — no auth logic lives here.
 */

const NAV_SECTIONS = [
  { id: "features", label: "Features" },
  { id: "intelligence", label: "Intelligence" },
  { id: "pricing", label: "Pricing" },
] as const;

const CAPABILITIES = [
  {
    icon: ShieldAlert,
    title: "Risk that surfaces itself",
    body:
      "Every task carries a live risk level weighted by deadline, priority and remaining capacity. Work that is about to slip is flagged before the deadline, not after it.",
    chip: "HIGH",
    chipTone: "danger" as const,
  },
  {
    icon: GitBranch,
    title: "Dependencies you can read",
    body:
      "The dependency graph lays tasks out in waves — everything on a level can run in parallel. Cycles are refused at write time, so no pair of tasks can lock each other out of Done.",
    chip: "Wave 3",
    chipTone: "brand" as const,
  },
  {
    icon: Users2,
    title: "Assignment with a reason",
    body:
      "Recommendations score skill match, semantic fit, current workload and past performance — and show you the breakdown before you accept one.",
    chip: "94% fit",
    chipTone: "accent" as const,
  },
  {
    icon: LayoutGrid,
    title: "A board that matches the work",
    body:
      "Todo, In Progress, In Review and Done. Any project member can move a card; editing and deleting stay with the leader. Status rules are enforced by the API, not the UI.",
    chip: "In Review",
    chipTone: "neutral" as const,
  },
  {
    icon: Radio,
    title: "Realtime, on every device",
    body:
      "One notification hub over SignalR. A comment posted at a desk lands on the phone in the same second, carrying its project and image with it.",
    chip: "Live",
    chipTone: "accent" as const,
  },
  {
    icon: FileSpreadsheet,
    title: "Bring the plan you already have",
    body:
      "Import a spreadsheet with types, priorities, deadlines, required skills and dependencies. Export any project back out to XLSX or PDF.",
    chip: "XLSX · PDF",
    chipTone: "neutral" as const,
  },
];

/** Marketing copy per plan code — the only things NOT sourced from the API, since they're prose,
 * not numbers. Price, cadence and "current" state all come from the real catalog below. */
const PLAN_COPY: Record<string, { audience: string; highlight: boolean; features: string[] }> = {
  FREE_PERSONAL: {
    audience: "Personal",
    highlight: false,
    features: ["Up to 2 active projects", "Kanban board & task detail", "AI risk analysis", "Realtime notifications"],
  },
  PRO_PERSONAL: {
    audience: "Personal",
    highlight: true,
    features: ["Unlimited projects", "Everything in Free", "AI assignment recommendations", "Dependency graph & planning", "XLSX / PDF export"],
  },
  PRO_ORGANIZATION: {
    audience: "Teams",
    highlight: false,
    features: ["Unlimited members & projects", "Everything in Pro", "Organization workspace", "Member evaluations & reports", "Centralised skill catalogue"],
  },
};

const PLAN_DISPLAY_ORDER = ["FREE_PERSONAL", "PRO_PERSONAL", "PRO_ORGANIZATION"];

const cadenceLabel = (billingInterval: PlanDto["billingInterval"]) =>
  billingInterval === "MONTHLY" ? "per month" : billingInterval === "YEARLY" ? "per year" : "forever";

const chipClass = (tone: "danger" | "brand" | "accent" | "neutral") => {
  const base = "text-[10px] font-semibold px-2 py-0.5 rounded-md tracking-wide";
  if (tone === "danger") return `${base} bg-red-500/12 text-red-600 dark:text-red-400`;
  if (tone === "brand") return `${base} text-brand bg-[color-mix(in_srgb,var(--brand-600)_12%,transparent)]`;
  if (tone === "accent") return `${base} text-accent bg-[color-mix(in_srgb,var(--accent-600)_14%,transparent)]`;
  return `${base} text-muted bg-surface-inset`;
};

/** The product's own board, standing in as the hero image — no stock illustration. */
const BoardPreview = () => {
  const columns = [
    {
      name: "In Progress",
      accent: "var(--brand-600)",
      cards: [
        { title: "Payment webhook settlement", risk: "HIGH", meta: "Due in 2 days · 60%" },
        { title: "Refresh token rotation", risk: "LOW", meta: "Due in 9 days · 30%" },
      ],
    },
    {
      name: "In Review",
      accent: "#F59E0B",
      cards: [{ title: "Organization member roles", risk: "MEDIUM", meta: "Awaiting leader · 100%" }],
    },
    {
      name: "Done",
      accent: "var(--accent-600)",
      cards: [{ title: "Dependency cycle guard", risk: "LOW", meta: "Merged yesterday" }],
    },
  ];

  const riskTone = (risk: string) =>
    risk === "HIGH"
      ? "bg-red-500/12 text-red-600 dark:text-red-400"
      : risk === "MEDIUM"
      ? "bg-amber-500/14 text-amber-600 dark:text-amber-400"
      : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400";

  return (
    <div
      className="rounded-2xl border border-line bg-surface-raised overflow-hidden shadow-brand-lg"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-soft bg-surface-sunken">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[11px] text-muted font-body">Apollo Platform · Board</span>
        <span className="ml-auto text-[10px] text-subtle tabular-nums">4 / 12 done</span>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {columns.map((col) => (
          <div key={col.name} className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.accent }} />
              <span className="text-[10px] font-semibold text-default truncate">{col.name}</span>
              <span className="text-[10px] text-subtle tabular-nums ml-auto">{col.cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {col.cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-lg border border-soft bg-surface p-2.5"
                  style={{ borderLeft: `2px solid ${col.accent}` }}
                >
                  <p className="text-[11px] font-medium text-strong leading-snug mb-1.5 line-clamp-2">
                    {card.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${riskTone(card.risk)}`}>
                      {card.risk}
                    </span>
                    <span className="text-[9px] text-subtle truncate">{card.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = usePreferences();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className="w-9 h-9 rounded-lg border border-line bg-surface-raised text-muted hover:text-strong hover:border-strong transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
    >
      {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};

export const Wordmark = () => (
  <span className="flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
      <Sparkles size={16} strokeWidth={2} />
    </span>
    <span className="font-display text-[17px] font-bold text-strong">TaskGenie</span>
  </span>
);

export const LandingPage = ({
  onEnter,
  onSupport,
}: {
  onEnter: () => void;
  /** Opens the standalone Help Center page — a separate top-level view, not a section of this page. */
  onSupport: () => void;
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<PlanDto[]>([]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [personal, org] = await Promise.all([
          billingApi.plans("PERSONAL"),
          billingApi.plans("ORGANIZATION"),
        ]);
        setPlans([...personal, ...org]);
      } catch {
        // Public marketing page: if the catalog can't be reached, the pricing section simply
        // renders nothing rather than falling back to a stale hardcoded price.
      }
    })();
  }, []);

  const pricedPlans = PLAN_DISPLAY_ORDER
    .map((code) => ({ plan: plans.find((p) => p.code === code), copy: PLAN_COPY[code] }))
    .filter((entry): entry is { plan: PlanDto; copy: (typeof PLAN_COPY)[string] } => entry.plan != null);

  const jumpTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-dvh bg-surface font-body text-default">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-colors ${
          scrolled ? "bg-surface-raised/85 backdrop-blur-md border-b border-soft" : "border-b border-transparent"
        }`}
      >
        <nav className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-6">
          <Wordmark />

          <div className="hidden md:flex items-center gap-1 ml-4">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(s.id)}
                className="px-3 py-1.5 text-[13px] font-medium text-muted hover:text-strong rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onSupport}
              className="px-3 py-1.5 text-[13px] font-medium text-muted hover:text-strong rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
            >
              Support
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={onEnter}
              className="hidden sm:inline-flex px-3.5 py-2 text-[13px] font-semibold text-default hover:text-strong rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold bg-brand rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-brand-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-600)]"
            >
              Get started <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="md:hidden w-9 h-9 rounded-lg border border-line text-muted flex items-center justify-center cursor-pointer"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-soft bg-surface-raised px-5 py-3 flex flex-col gap-1">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(s.id)}
                className="text-left px-3 py-2 text-sm font-medium text-default hover:bg-surface-sunken rounded-lg cursor-pointer"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSupport();
              }}
              className="text-left px-3 py-2 text-sm font-medium text-default hover:bg-surface-sunken rounded-lg cursor-pointer"
            >
              Support
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 brand-wash pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 brand-grid opacity-60 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-14 items-center">
          <div className="brand-rise">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-surface-raised text-[11px] font-semibold text-muted mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              AI risk analysis, built in
            </span>

            <h1 className="font-display text-[38px] sm:text-[46px] lg:text-[54px] leading-[1.06] font-bold text-strong text-balance mb-5">
              Know which task slips
              <br />
              <span className="brand-gradient-text">before it slips.</span>
            </h1>

            <p className="text-[15px] leading-relaxed text-muted max-w-[46ch] mb-8">
              TaskGenie reads deadlines, priorities, dependencies and team capacity, then tells you
              where the plan is about to break — and who is best placed to fix it.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-10">
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-brand rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-brand-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-600)]"
              >
                Start free <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => jumpTo("features")}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-default border border-line bg-surface-raised rounded-xl hover:border-strong transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
              >
                See what it does
              </button>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-4">
              {[
                { v: "4", l: "workflow states" },
                { v: "2 min", l: "spreadsheet to board" },
                { v: "0", l: "dependency deadlocks" },
              ].map((stat) => (
                <div key={stat.l}>
                  <dt className="font-display text-2xl font-bold text-strong tabular-nums">{stat.v}</dt>
                  <dd className="text-[11px] text-subtle uppercase tracking-wider mt-0.5">{stat.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          >
            <BoardPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 border-t border-soft bg-surface-raised">
        <div className="max-w-6xl mx-auto px-5 py-20 lg:py-24">
          <div className="max-w-[52ch] mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand mb-3">
              What you get
            </p>
            <h2 className="font-display text-[30px] lg:text-[36px] leading-tight font-bold text-strong text-balance mb-4">
              Six things a spreadsheet cannot do
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              Each of these is enforced on the server, so what the board shows is what the rules
              actually allow — not a hint the UI is free to ignore.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap, i) => (
              <motion.article
                key={cap.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                className="rounded-xl border border-line bg-surface p-5 hover:border-strong hover:shadow-brand-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className="w-9 h-9 rounded-lg bg-surface-inset text-brand flex items-center justify-center shrink-0">
                    <cap.icon size={17} strokeWidth={1.9} />
                  </span>
                  <span className={chipClass(cap.chipTone)}>{cap.chip}</span>
                </div>
                <h3 className="font-display text-[15px] font-semibold text-strong mb-2">{cap.title}</h3>
                <p className="text-[13px] leading-relaxed text-muted">{cap.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligence ────────────────────────────────────────────────── */}
      <section id="intelligence" className="scroll-mt-20 border-t border-soft">
        <div className="max-w-6xl mx-auto px-5 py-20 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-3">
              The intelligence layer
            </p>
            <h2 className="font-display text-[30px] lg:text-[36px] leading-tight font-bold text-strong text-balance mb-5">
              Every score comes with its reasoning
            </h2>
            <p className="text-[15px] leading-relaxed text-muted mb-7">
              An assignment recommendation is only useful if you can argue with it. TaskGenie shows
              the four components behind every match, so a leader can override the number when they
              know something the model does not.
            </p>

            <ul className="flex flex-col gap-3">
              {[
                "Skill match against the task's required skills",
                "Semantic similarity between the task and past work",
                "Current workload measured in the project's working hours",
                "Historical performance on comparable tasks",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14px] text-default">
                  <Check size={16} className="text-accent mt-0.5 shrink-0" strokeWidth={2.4} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface-raised p-6 shadow-brand-md" aria-hidden="true">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={15} className="text-brand" />
              <span className="text-[12px] font-semibold text-strong">Recommended assignee</span>
              <span className="ml-auto font-display text-lg font-bold text-accent tabular-nums">94</span>
            </div>
            <div className="flex flex-col gap-3.5">
              {[
                { label: "Skill match", weight: "40%", value: 96 },
                { label: "Semantic similarity", weight: "25%", value: 91 },
                { label: "Workload headroom", weight: "20%", value: 88 },
                { label: "Past performance", weight: "15%", value: 97 },
              ].map((row, i) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12px] text-default">{row.label}</span>
                    <span className="text-[10px] text-subtle tabular-nums">
                      {row.weight} · {row.value}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-inset overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, var(--brand-600), var(--accent-600))`,
                      }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${row.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 border-t border-soft bg-surface-raised">
        <div className="max-w-6xl mx-auto px-5 py-20 lg:py-24">
          <div className="max-w-[48ch] mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand mb-3">Pricing</p>
            <h2 className="font-display text-[30px] lg:text-[36px] leading-tight font-bold text-strong text-balance mb-4">
              Start free. Upgrade when the second project arrives.
            </h2>
            <p className="text-[15px] leading-relaxed text-muted">
              The free plan is a real plan, not a trial — it just caps you at two active projects.
            </p>
          </div>

          {pricedPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
              Loading pricing…
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {pricedPlans.map(({ plan, copy }) => (
                <div
                  key={plan.planId}
                  className={`relative rounded-xl border p-6 flex flex-col ${
                    copy.highlight
                      ? "border-[var(--brand-600)] bg-surface shadow-brand-md"
                      : "border-line bg-surface"
                  }`}
                >
                  {copy.highlight && (
                    <span className="absolute -top-2.5 left-6 px-2.5 py-0.5 rounded-md bg-brand text-[10px] font-bold tracking-wide">
                      MOST POPULAR
                    </span>
                  )}

                  <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-2">
                    {copy.audience}
                  </p>
                  <h3 className="font-display text-[19px] font-bold text-strong mb-3">{plan.name}</h3>
                  <p className="flex items-baseline gap-1.5 mb-6">
                    <span className="font-display text-[32px] font-bold text-strong tabular-nums">
                      {plan.priceMinor === 0 ? "Free" : formatMoney(plan.priceMinor, plan.currency)}
                    </span>
                    <span className="text-[12px] text-subtle">{cadenceLabel(plan.billingInterval)}</span>
                  </p>

                  <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                    {copy.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-default">
                        <Check size={14} className="text-accent mt-[3px] shrink-0" strokeWidth={2.4} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={onEnter}
                    className={`w-full py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-600)] ${
                      copy.highlight
                        ? "bg-brand hover:opacity-90 shadow-brand-cta"
                        : "border border-line text-default hover:border-strong bg-surface-raised"
                    }`}
                  >
                    {plan.priceMinor === 0 ? "Create an account" : `Choose ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-soft relative overflow-hidden">
        <div className="absolute inset-0 brand-wash pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto px-5 py-20 lg:py-24 text-center">
          <h2 className="font-display text-[30px] lg:text-[38px] leading-tight font-bold text-strong text-balance mb-4">
            Put the next deadline where you can see it
          </h2>
          <p className="text-[15px] leading-relaxed text-muted mb-8 max-w-[52ch] mx-auto">
            Sign in with Google or an email address. Your first project takes about two minutes to set up.
          </p>
          <button
            type="button"
            onClick={onEnter}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold bg-brand rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-brand-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-600)]"
          >
            Get started free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-soft bg-surface-raised">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center gap-4">
          <Wordmark />
          <p className="text-[12px] text-subtle sm:ml-4">
            AI-assisted project and task management.
          </p>
          <div className="sm:ml-auto flex items-center gap-1">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(s.id)}
                className="px-3 py-1.5 text-[12px] text-muted hover:text-strong rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onSupport}
              className="px-3 py-1.5 text-[12px] text-muted hover:text-strong rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              Support
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="px-3 py-1.5 text-[12px] font-semibold text-brand hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
