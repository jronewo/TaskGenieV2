import React from "react";
import { Navigate, Link, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { useProjects } from "../../projects/hooks/useProjects";

export default function TasksIndexPage() {
  const { data: projects, isLoading } = useProjects();
  const [searchParams] = useSearchParams();
  const createSuffix = searchParams.get("create") === "1" ? "?create=1" : "";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm gap-2">
        <Loader2 className="animate-spin" size={16} /> Loading projects...
      </div>
    );
  }

  if (projects && projects.length > 0) {
    return <Navigate to={`/app/tasks/${projects[0].projectId}${createSuffix}`} replace />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
      <p className="text-sm text-gray-500">You need a project before you can create tasks.</p>
      <Link to="/app/projects" className="text-sm font-semibold text-[#1A237E] hover:text-[#0D1757]">
        Create a project →
      </Link>
    </div>
  );
}
