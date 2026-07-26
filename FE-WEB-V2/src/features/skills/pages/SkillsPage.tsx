import React, { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Loader2, Plus, X } from "lucide-react";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";
import { useSkillCatalog, useCreateSkill, useUserSkills, useAddUserSkill, useUpdateUserSkill, useRemoveUserSkill } from "../hooks/useSkills";

export default function SkillsPage() {
  const { user } = useAuth();
  const { data: catalog, isLoading: loadingCatalog } = useSkillCatalog();
  const createSkill = useCreateSkill();
  const { data: mySkills, isLoading: loadingMine } = useUserSkills(user?.userId ?? null);
  const addUserSkill = useAddUserSkill(user?.userId ?? 0);
  const updateUserSkill = useUpdateUserSkill(user?.userId ?? 0);
  const removeUserSkill = useRemoveUserSkill(user?.userId ?? 0);

  const [newSkillName, setNewSkillName] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState(3);

  const availableSkills = (catalog ?? []).filter((s) => !(mySkills ?? []).some((us) => us.skillId === s.skillId));

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    try {
      await createSkill.mutateAsync({ skillName: newSkillName.trim() });
      setNewSkillName("");
      toast.success("Skill added to catalog.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tạo skill thất bại.");
    }
  };

  const handleAddMySkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSkillId) return;
    try {
      await addUserSkill.mutateAsync({ userId: user.userId, skillId: Number(selectedSkillId), level: selectedLevel });
      setSelectedSkillId("");
      setSelectedLevel(3);
      toast.success("Đã thêm kỹ năng.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thêm kỹ năng thất bại.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <GraduationCap size={12} /> Skills
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Skill catalog &amp; my proficiency</h2>
        <p className="mt-1 text-sm text-slate-500">Used by AI task-assignment (skill match, 40% weight).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Skill Catalog</h3>
          <form onSubmit={handleCreateSkill} className="mb-3 flex gap-2">
            <input
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="New skill name..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <button type="submit" disabled={createSkill.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              <Plus size={14} /> Add
            </button>
          </form>
          {loadingCatalog ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={15} /> Loading...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(catalog ?? []).map((s) => (
                <span key={s.skillId} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {s.skillName}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">My Skills</h3>
          <form onSubmit={handleAddMySkill} className="mb-3 flex flex-wrap items-end gap-2">
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-slate-500 bg-input-background"
            >
              <option value="">Select skill...</option>
              {availableSkills.map((s) => (
                <option key={s.skillId} value={s.skillId}>
                  {s.skillName}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Level</span>
              <input type="range" min={1} max={5} value={selectedLevel} onChange={(e) => setSelectedLevel(Number(e.target.value))} className="accent-slate-700" />
              <span className="w-4 text-center text-xs font-semibold text-slate-800">{selectedLevel}</span>
            </div>
            <button type="submit" disabled={!selectedSkillId || addUserSkill.isPending} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Add
            </button>
          </form>

          {loadingMine ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={15} /> Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {(mySkills ?? []).map((us) => (
                <div key={us.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-800">{us.skillName}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      defaultValue={us.level ?? 1}
                      onMouseUp={(e) => updateUserSkill.mutate({ userSkillId: us.id, level: Number((e.target as HTMLInputElement).value) })}
                      className="accent-slate-700"
                    />
                    <span className="w-4 text-center text-xs font-semibold text-slate-800">{us.level}</span>
                    <button onClick={() => removeUserSkill.mutate(us.id)} className="text-slate-400 hover:text-rose-600">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {(mySkills ?? []).length === 0 && <p className="text-xs text-slate-400">Bạn chưa khai báo kỹ năng nào.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
