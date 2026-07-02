import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Users, Building2, BarChart2, Search, UserCog, Power, PowerOff,
  Plus, Pencil, Trash2, X, Layers, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  teamMembers as seedUsers,
  organizations as seedOrganizations,
  tasks,
  projects,
  statusColumns,
  TeamMember,
  SystemRole,
  UserStatus,
  Organization,
  OrgPlan,
} from "../data/tmaiData";

type AdminTab = "users" | "organizations" | "stats";

const systemRoles: SystemRole[] = ["Admin", "Manager", "Member", "Viewer"];
const orgPlans: OrgPlan[] = ["Free", "Pro", "Enterprise"];

const roleBadgeStyle: Record<SystemRole, string> = {
  Admin: "bg-purple-50 text-purple-700 border border-purple-200",
  Manager: "bg-blue-50 text-blue-700 border border-blue-200",
  Member: "bg-slate-100 text-slate-600 border border-slate-200",
  Viewer: "bg-gray-50 text-gray-500 border border-gray-200",
};

const planBadgeStyle: Record<OrgPlan, string> = {
  Free: "bg-slate-100 text-slate-600",
  Pro: "bg-blue-50 text-blue-700",
  Enterprise: "bg-purple-50 text-purple-700",
};

const roleColor: Record<SystemRole, string> = {
  Admin: "#7C4DFF",
  Manager: "#1E88E5",
  Member: "#64748B",
  Viewer: "#94A3B8",
};

interface OrgFormState {
  name: string;
  description: string;
  memberCount: string;
  plan: OrgPlan;
}

const emptyOrgForm: OrgFormState = { name: "", description: "", memberCount: "", plan: "Free" };

export const AdministrationCenter = () => {
  const [tab, setTab] = useState<AdminTab>("users");

  // --- Users state ---
  const [users, setUsers] = useState<TeamMember[]>(seedUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | SystemRole>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | UserStatus>("All");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const query = search.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const matchesRole = roleFilter === "All" || u.systemRole === roleFilter;
    const matchesStatus = statusFilter === "All" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = (id: string, role: SystemRole) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, systemRole: role } : u)));
    setEditingRoleId(null);
  };

  const handleToggleStatus = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u)));
  };

  // --- Organizations state ---
  const [orgs, setOrgs] = useState<Organization[]>(seedOrganizations);
  const [orgSearch, setOrgSearch] = useState("");
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState<OrgFormState>(emptyOrgForm);
  const [orgFeedback, setOrgFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredOrgs = orgs.filter((o) => o.name.toLowerCase().includes(orgSearch.toLowerCase()));

  const openCreateOrg = () => {
    setEditingOrgId(null);
    setOrgForm(emptyOrgForm);
    setShowOrgForm(true);
  };

  const openEditOrg = (org: Organization) => {
    setEditingOrgId(org.id);
    setOrgForm({ name: org.name, description: org.description, memberCount: String(org.memberCount), plan: org.plan });
    setShowOrgForm(true);
  };

  const handleSubmitOrg = (e: React.FormEvent) => {
    e.preventDefault();
    const name = orgForm.name.trim();
    if (!name) {
      setOrgFeedback({ type: "error", message: "Organization name is required." });
      return;
    }

    if (editingOrgId) {
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === editingOrgId
            ? { ...o, name, description: orgForm.description.trim(), memberCount: Number(orgForm.memberCount) || 0, plan: orgForm.plan }
            : o
        )
      );
      setOrgFeedback({ type: "success", message: "Organization updated successfully." });
    } else {
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name,
        description: orgForm.description.trim() || "No description provided.",
        memberCount: Number(orgForm.memberCount) || 0,
        plan: orgForm.plan,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setOrgs((prev) => [newOrg, ...prev]);
      setOrgFeedback({ type: "success", message: "Organization created successfully." });
    }

    setShowOrgForm(false);
    setEditingOrgId(null);
    setOrgForm(emptyOrgForm);
  };

  const handleDeleteOrg = (id: string) => {
    setOrgs((prev) => prev.filter((o) => o.id !== id));
    setOrgFeedback({ type: "success", message: "Organization removed successfully." });
  };

  // --- Platform stats ---
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const totalTasks = tasks.length;
  const totalProjects = projects.length;

  const tasksByStatus = statusColumns.map((col) => ({
    label: col.label,
    count: tasks.filter((t) => t.status === col.id).length,
    color: col.color,
  }));

  const usersByRole = systemRoles
    .map((role) => ({ name: role, value: users.filter((u) => u.systemRole === role).length, color: roleColor[role] }))
    .filter((r) => r.value > 0);

  const statTiles = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "#1E88E5" },
    { label: "Active Users", value: activeUsers, icon: CheckCircle2, color: "#10B981" },
    { label: "Total Tasks", value: totalTasks, icon: Layers, color: "#7C4DFF" },
    { label: "Total Projects", value: totalProjects, icon: Building2, color: "#F59E0B" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
            <UserCog size={12} /> Administration
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Manage users, organizations & platform health</h2>
          <p className="mt-1 text-sm text-slate-500">Control access, oversee organizations, and monitor platform-wide activity.</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
          {[
            { id: "users" as AdminTab, label: "Users", icon: Users },
            { id: "organizations" as AdminTab, label: "Organizations", icon: Building2 },
            { id: "stats" as AdminTab, label: "Platform Stats", icon: BarChart2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "All" | SystemRole)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="All">All Roles</option>
              {systemRoles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | UserStatus)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      {editingRoleId === user.id ? (
                        <select
                          autoFocus
                          value={user.systemRole}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as SystemRole)}
                          onBlur={() => setEditingRoleId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-500"
                        >
                          {systemRoles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleBadgeStyle[user.systemRole]}`}>
                          {user.systemRole}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          user.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {user.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingRoleId(user.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <UserCog size={12} /> Edit Role
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                            user.status === "active"
                              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {user.status === "active" ? <PowerOff size={12} /> : <Power size={12} />}
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No users match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "organizations" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search size={14} className="text-slate-400" />
              <input
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                placeholder="Search organizations..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <button
              onClick={openCreateOrg}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <Plus size={15} /> Add Organization
            </button>
          </div>

          {orgFeedback && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${orgFeedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {orgFeedback.message}
            </div>
          )}

          {showOrgForm && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{editingOrgId ? "Edit Organization" : "New Organization"}</h3>
                <button onClick={() => setShowOrgForm(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={handleSubmitOrg} className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Organization Name</label>
                  <input
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="e.g. Northwind Studio"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
                  <textarea
                    value={orgForm.description}
                    onChange={(e) => setOrgForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="What does this organization do?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Members</label>
                  <input
                    type="number"
                    min={0}
                    value={orgForm.memberCount}
                    onChange={(e) => setOrgForm((p) => ({ ...p, memberCount: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</label>
                  <select
                    value={orgForm.plan}
                    onChange={(e) => setOrgForm((p) => ({ ...p, plan: e.target.value as OrgPlan }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {orgPlans.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowOrgForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                    {editingOrgId ? "Save Changes" : "Create Organization"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredOrgs.map((org) => (
              <div key={org.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                      <Building2 size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{org.name}</div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${planBadgeStyle[org.plan]}`}>{org.plan}</span>
                    </div>
                  </div>
                </div>
                <p className="mb-3 text-xs text-slate-500 leading-relaxed line-clamp-2">{org.description}</p>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-600">
                  <Users size={12} className="text-slate-400" /> {org.memberCount} members
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => openEditOrg(org)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteOrg(org.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredOrgs.length === 0 && (
              <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No organizations found.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statTiles.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${stat.color}15` }}>
                  <stat.icon size={18} style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Tasks by Status</h3>
              <p className="mb-3 text-xs text-slate-500">Distribution across the Kanban pipeline</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tasksByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {tasksByStatus.map((entry, index) => (
                      <Cell key={`status-bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Users by Role</h3>
              <p className="mb-3 text-xs text-slate-500">System role distribution across active users</p>
              <div className="flex items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={usersByRole} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {usersByRole.map((entry, index) => (
                          <Cell key={`role-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {usersByRole.map((r) => (
                    <div key={r.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="flex-1 text-slate-600">{r.name}</span>
                      <span className="font-bold text-slate-800">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
