import React, { useMemo, useState } from "react";
import {
  Search, ChevronDown, ChevronRight, Mail, Rocket, LayoutGrid, Sparkles,
  CreditCard, Users2, ShieldCheck, MessageCircle,
} from "lucide-react";
import { ThemeToggle, Wordmark } from "./LandingPage";

/**
 * Standalone Help Center — reachable from the landing page navbar without signing in. Content is
 * static prose describing real product behaviour (mirrors what LandingPage and the app actually
 * do), not a stand-in for a missing backend feature.
 */

const SUPPORT_EMAIL = "support@taskgenie.local";

type FaqItem = { q: string; a: string };
type FaqCategory = {
  id: string;
  icon: typeof Rocket;
  title: string;
  description: string;
  items: FaqItem[];
};

const CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting started",
    description: "Accounts, sign-in and your first project.",
    items: [
      {
        q: "How do I create an account?",
        a: "From the landing page, choose Get started and sign in with Google or an email address. Your first project takes about two minutes to set up.",
      },
      {
        q: "Is there a free plan?",
        a: "Yes — Free Personal covers up to 2 active projects with the full kanban board, AI risk analysis and realtime notifications included, forever, not as a trial.",
      },
      {
        q: "I can't sign in — what do I do?",
        a: "Use Forgot password on the sign-in screen to reset it by email. If your account was created with Google sign-in, use the Google button instead of a password.",
      },
    ],
  },
  {
    id: "projects-tasks",
    icon: LayoutGrid,
    title: "Projects & tasks",
    description: "The board, dependencies, import and export.",
    items: [
      {
        q: "What are the board columns and who can move a card?",
        a: "Todo, In Progress, In Review and Done. Any project member can move a card between columns; only the project leader can edit or delete a task.",
      },
      {
        q: "Can one task depend on another?",
        a: "Yes. A task cannot be marked Done while any of its dependencies are still open, and the dependency graph refuses to save a cycle.",
      },
      {
        q: "What do the risk levels (LOW / MEDIUM / HIGH) mean?",
        a: "Each task is scored from its deadline, priority and remaining capacity, so work that's about to slip is flagged before the due date, not after it.",
      },
      {
        q: "Can I bring in a plan I already have in a spreadsheet?",
        a: "Import an XLSX with type, priority, deadline, required skills and dependencies already filled in. Any project can be exported back out to XLSX or PDF.",
      },
    ],
  },
  {
    id: "ai-features",
    icon: Sparkles,
    title: "AI features",
    description: "Assignment recommendations and the assistant.",
    items: [
      {
        q: "How does an assignment recommendation get its score?",
        a: "It blends skill match (40%), semantic similarity to past work (25%), current workload (20%) and past performance (15%) — the breakdown is shown before you accept a recommendation.",
      },
      {
        q: "Why don't I see the AI assistant chat?",
        a: "The assistant ships with the paid plans. On a free account the launcher doesn't appear; upgrading from Subscription unlocks it.",
      },
    ],
  },
  {
    id: "billing-plans",
    icon: CreditCard,
    title: "Billing & plans",
    description: "Upgrading, limits and payment.",
    items: [
      {
        q: "What happens when I try to create a third free project?",
        a: "Creation is rejected — you'll see a message asking you to upgrade. Pro Personal removes the project cap entirely.",
      },
      {
        q: "How do I pay for a paid plan?",
        a: "Checkout redirects to our payment provider (PayOS); prices are shown in VND.",
      },
      {
        q: "Is Organization Premium the same as being an admin?",
        a: "No. It comes from your organization having an active paid subscription and you having active membership in it — it isn't tied to your account role.",
      },
    ],
  },
  {
    id: "organizations-teams",
    icon: Users2,
    title: "Organizations & teams",
    description: "Invitations, roles and workspaces.",
    items: [
      {
        q: "How do I invite someone to my project team?",
        a: "Open Team Management and send an invitation by email. Accepting it checks for an existing membership first, so nobody ends up added twice.",
      },
      {
        q: "What's the difference between a project team and an organization?",
        a: "Every project automatically gets its own team with you as leader. An organization is a separate paid workspace that groups multiple projects and members, with shared skills and reporting.",
      },
    ],
  },
  {
    id: "account-security",
    icon: ShieldCheck,
    title: "Account & security",
    description: "Sessions, sign-out and data.",
    items: [
      {
        q: "How do sessions work?",
        a: "Signing in issues a rotating refresh token. Signing out from Settings invalidates that session immediately.",
      },
      {
        q: "Can I use Google to sign in instead of a password?",
        a: "Yes, Google sign-in is supported alongside email and password on both the sign-in and sign-up screens.",
      },
    ],
  },
];

const norm = (s: string) => s.toLowerCase();

export const SupportCenter = ({
  onBack,
  onSignIn,
}: {
  onBack: () => void;
  onSignIn: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const q = query.trim();
  const filtered = useMemo(() => {
    if (!q) return CATEGORIES;
    const needle = norm(q);
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => norm(item.q).includes(needle) || norm(item.a).includes(needle)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [q]);

  const totalMatches = filtered.reduce((n, cat) => n + cat.items.length, 0);

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-dvh bg-surface font-body text-default">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-surface-raised/85 backdrop-blur-md border-b border-soft">
        <nav className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-4">
          <button type="button" onClick={onBack} className="cursor-pointer">
            <Wordmark />
          </button>
          <span className="hidden sm:inline text-[13px] text-subtle">/ Support</span>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-muted hover:text-strong rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
            >
              <ChevronRight size={14} className="rotate-180" aria-hidden="true" /> Back to home
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold bg-brand rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-brand-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-600)]"
            >
              Sign in
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero + search ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-soft">
        <div className="absolute inset-0 brand-wash pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto px-5 pt-16 pb-14 text-center">
          <h1 className="font-display text-[32px] sm:text-[40px] leading-[1.1] font-bold text-strong text-balance mb-4">
            How can we help?
          </h1>
          <p className="text-[15px] leading-relaxed text-muted mb-8 max-w-[52ch] mx-auto">
            Search the help center, or browse by topic below.
          </p>

          <label className="relative block max-w-lg mx-auto">
            <span className="sr-only">Search help articles</span>
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for an answer…"
              className="w-full pl-11 pr-4 py-3 text-[14px] rounded-xl border border-line bg-surface-raised text-default placeholder:text-subtle shadow-brand-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
            />
          </label>
        </div>
      </section>

      {/* ── Category quick nav (hidden while searching) ────────────────── */}
      {!q && (
        <section className="border-b border-soft bg-surface-raised">
          <div className="max-w-5xl mx-auto px-5 py-10">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => jumpTo(cat.id)}
                  className="text-left rounded-xl border border-line bg-surface p-5 hover:border-strong hover:shadow-brand-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                >
                  <span className="w-9 h-9 rounded-lg bg-surface-inset text-brand flex items-center justify-center shrink-0 mb-3">
                    <cat.icon size={17} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-[14px] font-semibold text-strong mb-1">{cat.title}</h3>
                  <p className="text-[12.5px] leading-relaxed text-muted">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-5 py-14">
        {q && (
          <p className="text-[13px] text-subtle mb-6" role="status">
            {totalMatches === 0
              ? `No results for "${q}".`
              : `${totalMatches} result${totalMatches === 1 ? "" : "s"} for "${q}"`}
          </p>
        )}

        {q && totalMatches === 0 && (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted mb-4">
            Nothing matched that search. Try a different word, or{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand font-semibold hover:underline">
              email support
            </a>
            .
          </div>
        )}

        <div className="flex flex-col gap-10">
          {filtered.map((cat) => (
            <div key={cat.id} id={cat.id} className="scroll-mt-20">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-lg bg-surface-inset text-brand flex items-center justify-center shrink-0">
                  <cat.icon size={15} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h2 className="font-display text-[18px] font-bold text-strong">{cat.title}</h2>
              </div>

              <div className="rounded-xl border border-line bg-surface overflow-hidden">
                {cat.items.map((item, i) => {
                  const key = `${cat.id}-${i}`;
                  const open = openKeys.has(key);
                  return (
                    <div key={key} className={i > 0 ? "border-t border-soft" : undefined}>
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-expanded={open}
                        aria-controls={`${key}-panel`}
                        className="w-full flex items-start justify-between gap-3 text-left px-5 py-4 hover:bg-surface-sunken transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-600)]"
                      >
                        <span className="text-[13.5px] font-medium text-default">{item.q}</span>
                        <ChevronDown
                          size={16}
                          className={`text-subtle shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>
                      {open && (
                        <div id={`${key}-panel`} className="px-5 pb-4 -mt-1">
                          <p className="text-[13px] leading-relaxed text-muted max-w-[62ch]">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section className="border-t border-soft bg-surface-raised">
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <span className="w-11 h-11 rounded-xl bg-surface-inset text-brand flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <h2 className="font-display text-[22px] font-bold text-strong mb-3">Still need help?</h2>
          <p className="text-[14px] leading-relaxed text-muted mb-6 max-w-[46ch] mx-auto">
            Can't find the answer here? Send us the details and we'll get back to you by email.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold bg-brand rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-brand-cta focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-600)]"
          >
            <Mail size={15} aria-hidden="true" /> {SUPPORT_EMAIL}
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-soft bg-surface">
        <div className="max-w-5xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center gap-4">
          <button type="button" onClick={onBack} className="cursor-pointer">
            <Wordmark />
          </button>
          <p className="text-[12px] text-subtle sm:ml-4">AI-assisted project and task management.</p>
          <button
            type="button"
            onClick={onBack}
            className="sm:ml-auto px-3 py-1.5 text-[12px] font-semibold text-brand hover:underline cursor-pointer"
          >
            Back to home
          </button>
        </div>
      </footer>
    </div>
  );
};
