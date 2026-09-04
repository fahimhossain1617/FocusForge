import React from "react";
import DashboardSkeleton from "./pages/DashboardSkeleton";
import MyMindSkeleton from "./pages/MyMindSkeleton";
import DiarySkeleton from "./pages/DiarySkeleton";
import WorkspaceSkeleton from "./pages/WorkspaceSkeleton";
import FocusSkeleton from "./pages/FocusSkeleton";
import PlannerSkeleton from "./pages/PlannerSkeleton";
import ProfileSkeleton from "./pages/ProfileSkeleton";
import SettingsSkeleton from "./pages/SettingsSkeleton";
import LearningHubSkeleton from "./pages/LearningHubSkeleton";

export interface PageSkeletonProps {
  page?: string;
}

export default function PageSkeleton({ page = "today" }: PageSkeletonProps) {
  switch (page) {
    case "today":
      return <DashboardSkeleton />;
    case "mind":
      return <MyMindSkeleton />;
    case "diary":
      return <DiarySkeleton />;
    case "tasks":
      return <WorkspaceSkeleton />;
    case "focus":
      return <FocusSkeleton />;
    case "planner":
      return <PlannerSkeleton />;
    case "profile":
      return <ProfileSkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    case "learning":
      return <LearningHubSkeleton />;
    default:
      return <DashboardSkeleton />;
  }
}
