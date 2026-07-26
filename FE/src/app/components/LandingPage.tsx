import { useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  Kanban,
  Users,
  Brain,
  Shield,
  BarChart3,
  Zap,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why TMAI", href: "#why-tmai" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI Risk Prediction",
    description:
      "Detect deadline conflicts and bottlenecks before they impact delivery. AI scores every task in real time.",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: Kanban,
    title: "Visual Kanban Boards",
    description:
      "Drag-and-drop task management with Todo, In Progress, and Done columns — just like Jira, but smarter.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Users,
    title: "Personal & Team Projects",
    description:
      "Work solo on personal projects or collaborate in team spaces. Invite members and assign roles instantly.",
    color: "bg-violet-50 text-violet-700",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description:
      "Executive dashboards with progress tracking, workload distribution, and performance insights.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: Zap,
    title: "Smart Assignment",
    description:
      "AI recommends the best team member for each task based on skills, workload, and past performance.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description:
      "JWT authentication, role-based access, and enterprise-grade security for your project data.",
    color: "bg-slate-50 text-slate-700",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create your workspace",
    description: "Sign up free and spin up a personal or team project in seconds.",
  },
  {
    step: "02",
    title: "Add tasks & invite team",
    description: "Build your backlog, set deadlines, and invite collaborators to your board.",
  },
  {
    step: "03",
    title: "Let AI guide delivery",
    description: "Get risk alerts, assignment suggestions, and analytics as work progresses.",
  },
];

const STATS = [
  { value: "40%", label: "Faster task assignment with AI" },
  { value: "3×", label: "Better deadline visibility" },
  { value: "100%", label: "Free to get started" },
];

function MockBoard() {
  const columns = [
    { name: "Todo", color: "bg-gray-100", tasks: ["Design API schema", "Write unit tests"] },
    { name: "In Progress", color: "bg-blue-50", tasks: ["Build auth module"] },
    { name: "Done", color: "bg-green-50", tasks: ["Setup project repo", "DB migration"] },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-gray-400 font-medium">TMAI — Sprint Board</span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {columns.map((col) => (
          <div key={col.name} className={`rounded-lg p-2.5 ${col.color}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{col.name}</p>
            {col.tasks.map((task) => (
              <div
                key={task}
                className="bg-white rounded-md px-2.5 py-2 mb-1.5 text-[11px] text-gray-700 shadow-sm border border-gray-100"
              >
                {task}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-100">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[10px] font-semibold text-red-600">2 tasks at risk</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100">
          <Sparkles size={10} className="text-indigo-500" />
          <span className="text-[10px] font-semibold text-indigo-600">AI insight active</span>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-white text-gray-900 overflow-x-hidden"
      style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
    >
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1A237E]">
              <Sparkles size={16} className="text-blue-300" />
            </div>
            <div>
              <span className="font-bold text-lg text-[#1A237E] tracking-wide">TMAI</span>
              <span className="hidden sm:inline text-xs text-gray-400 ml-2">AI Task Intelligence</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 hover:text-[#1A237E] transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="text-sm font-semibold text-gray-700 hover:text-[#1A237E] px-4 py-2 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold text-white bg-[#1A237E] hover:bg-[#0D1757] px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Get started free
              <ArrowRight size={14} />
            </button>
          </div>

          <button
            className="md:hidden p-2 text-gray-600 cursor-pointer"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-sm text-gray-600 font-medium py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={onSignIn}
                className="w-full py-2.5 text-sm font-semibold border border-gray-200 rounded-lg cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={onGetStarted}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#1A237E] rounded-lg cursor-pointer"
              >
                Get started free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(26,35,126,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
              <Sparkles size={12} />
              AI-powered project management for modern teams
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-gray-900 mb-6">
              Project management{" "}
              <span className="text-[#1A237E]">built for the AI era</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              Plan, track, and deliver with confidence. TMAI combines Kanban boards,
              team collaboration, and intelligent risk detection — all in one console.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#1A237E] text-white font-semibold rounded-lg hover:bg-[#0D1757] transition-colors cursor-pointer text-sm"
              >
                Get started — it's free
                <ArrowRight size={16} />
              </button>
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-[#1A237E] hover:text-[#1A237E] transition-colors cursor-pointer text-sm"
              >
                Sign in
              </button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {["No credit card required", "Personal & team projects", "Google sign-in"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-1.5 text-sm text-gray-500">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    {item}
                  </div>
                )
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div
              className="absolute -inset-4 rounded-2xl opacity-30 blur-2xl pointer-events-none"
              style={{ background: "linear-gradient(135deg, #1A237E 0%, #5C6BC0 100%)" }}
            />
            <MockBoard />
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-extrabold text-[#1A237E] mb-1">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#1A237E] uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Everything your team needs to ship
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From solo projects to cross-functional teams — TMAI scales with your workflow.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <motion.div
                key={title}
                whileHover={{ y: -4 }}
                className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-[#1A237E] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Up and running in minutes
            </h2>
            <p className="text-blue-200 max-w-xl mx-auto">
              No complex setup. Create an account, add your first project, and start managing work today.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="relative">
                <p className="text-5xl font-extrabold text-white/10 mb-4">{step}</p>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-blue-200 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why TMAI ── */}
      <section id="why-tmai" className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-[#1A237E] uppercase tracking-widest mb-3">
              Why TMAI
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
              Jira-level structure.<br />AI-level intelligence.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              TMAI gives you the familiar Kanban workflow you know from tools like Jira,
              enhanced with AI that watches your backlog, flags risks, and recommends
              the right person for every task.
            </p>
            <ul className="space-y-3">
              {[
                "Kanban boards with drag-and-drop status updates",
                "Personal projects for solo work, team projects for collaboration",
                "Invite members and manage leader/member roles",
                "Real-time progress tracking and deadline management",
                "Google OAuth for one-click sign in",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xl">
            <div className="bg-[#1A237E] px-6 py-5">
              <p className="text-white font-bold text-lg">Team Project — Q3 Launch</p>
              <p className="text-blue-300 text-sm">5 members · 23 tasks · 68% complete</p>
            </div>
            <div className="bg-white p-6 space-y-3">
              {[
                { label: "API Integration", status: "In Progress", risk: "LOW" },
                { label: "UI Polish", status: "Todo", risk: "MEDIUM" },
                { label: "Load Testing", status: "Todo", risk: "HIGH" },
              ].map((task) => (
                <div
                  key={task.label}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                >
                  <span className="text-sm font-medium text-gray-800">{task.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{task.status}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.risk === "HIGH"
                          ? "bg-red-50 text-red-600"
                          : task.risk === "MEDIUM"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {task.risk}
                    </span>
                  </div>
                </div>
              ))}
              <div className="mt-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-start gap-2">
                <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700">
                  <span className="font-semibold">AI Insight:</span> Load Testing has no assignee
                  and deadline is in 3 days. Consider assigning to Alex (lowest workload).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Ready to manage projects smarter?
          </h2>
          <p className="text-gray-500 mb-8 text-lg">
            Join TMAI today — create your first project in under a minute.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#1A237E] text-white font-semibold rounded-lg hover:bg-[#0D1757] transition-colors cursor-pointer"
            >
              Create free account
              <ChevronRight size={18} />
            </button>
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-[#1A237E] hover:text-[#1A237E] transition-colors cursor-pointer"
            >
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#1A237E]">
              <Sparkles size={13} className="text-blue-300" />
            </div>
            <span className="font-bold text-[#1A237E]">TMAI</span>
            <span className="text-xs text-gray-400">· AI Task Intelligence</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} TMAI. Built for modern project teams.
          </p>
        </div>
      </footer>
    </div>
  );
}
