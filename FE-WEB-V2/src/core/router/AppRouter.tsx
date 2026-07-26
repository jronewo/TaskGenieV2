import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { RequireAuth, PublicOnly } from "./RequireAuth";
import { AppShell } from "../../shared/layout/AppShell";
import LandingPage from "../../features/landing/pages/LandingPage";
import LoginPage from "../../features/auth/pages/LoginPage";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import ForgotPasswordPage from "../../features/auth/pages/ForgotPasswordPage";
import DashboardPage from "../../features/dashboard/pages/DashboardPage";
import ProfilePage from "../../features/profile/pages/ProfilePage";
import ProjectsPage from "../../features/projects/pages/ProjectsPage";
import ProjectDetailPage from "../../features/projects/pages/ProjectDetailPage";
import TasksIndexPage from "../../features/tasks/pages/TasksIndexPage";
import TaskBoardPage from "../../features/tasks/pages/TaskBoardPage";
import TeamsPage from "../../features/teams/pages/TeamsPage";
import NotificationsPage from "../../features/notifications/pages/NotificationsPage";
import OrganizationsPage from "../../features/organizations/pages/OrganizationsPage";
import InvitationsPage from "../../features/invitations/pages/InvitationsPage";
import SkillsPage from "../../features/skills/pages/SkillsPage";
import MeetingsPage from "../../features/meetings/pages/MeetingsPage";
import EvaluationsPage from "../../features/evaluations/pages/EvaluationsPage";
import RewardsPage from "../../features/rewards/pages/RewardsPage";
import ActivityLogPage from "../../features/activitylogs/pages/ActivityLogPage";
import AdminDashboardPage from "../../features/admin/pages/AdminDashboardPage";
import AiInsightsPage from "../../features/ai/pages/AiInsightsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="tasks" element={<TasksIndexPage />} />
            <Route path="tasks/:projectId" element={<TaskBoardPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="evaluations" element={<EvaluationsPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="activity-log" element={<ActivityLogPage />} />
            <Route path="ai-insights" element={<AiInsightsPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
