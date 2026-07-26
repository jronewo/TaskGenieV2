import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "lucide-react";
import { TaskStatus } from "../types";

const schema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.string(),
  deadline: z.string().min(1, "Deadline is required"),
  difficulty: z.string().refine((v) => Number(v) >= 1 && Number(v) <= 5, "Difficulty must be 1-5"),
});
export type CreateTaskFormValues = z.infer<typeof schema>;
type FormValues = CreateTaskFormValues;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (values: FormValues) => Promise<void> | void;
  defaultStatus?: TaskStatus;
  submitting?: boolean;
}

export const CreateTaskModal = ({ open, onClose, onCreate, submitting }: CreateTaskModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", priority: "medium", deadline: "", difficulty: "3" },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    await onCreate(values);
    reset();
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-xs"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-white border-2 border-[#1A237E] rounded-xl w-full max-w-md shadow-2xl overflow-hidden z-10 flex flex-col"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <div className="p-4 bg-[#1A237E] text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={13} /> Create Task
              </span>
              <button type="button" onClick={handleClose} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase text-[10px]">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g., Optimize Database Connection Pooling"
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-[#1A237E]"
                  {...register("title")}
                />
                {errors.title && <p className="text-rose-600">{errors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase text-[10px]">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the work to be done..."
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-[#1A237E] resize-none"
                  {...register("description")}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Priority</label>
                  <select className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]" {...register("priority")}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Difficulty (1-5)</label>
                  <input type="number" min={1} max={5} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]" {...register("difficulty")} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase text-[10px]">Deadline</label>
                <input type="date" className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]" {...register("deadline")} />
                {errors.deadline && <p className="text-rose-600">{errors.deadline.message}</p>}
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button type="button" onClick={handleClose} className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-[#1A237E] text-white font-bold rounded hover:bg-[#0D1757] disabled:opacity-60">
                  {submitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
