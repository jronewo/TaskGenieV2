import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../app/components/ui/button";
import { Input } from "../../../app/components/ui/input";
import { Label } from "../../../app/components/ui/label";
import { Textarea } from "../../../app/components/ui/textarea";

export const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  deadline: z.string().optional(),
});
export type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: ProjectFormValues) => void;
  onCancel?: () => void;
}

export const ProjectForm = ({ defaultValues, submitLabel, submitting, onSubmit, onCancel }: ProjectFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", description: "", deadline: "", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" placeholder="e.g. AI Operations" {...register("name")} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-description">Description</Label>
        <Textarea id="project-description" rows={3} placeholder="Summarize the goal of the project" {...register("description")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-deadline">Deadline</Label>
        <Input id="project-deadline" type="date" {...register("deadline")} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};
