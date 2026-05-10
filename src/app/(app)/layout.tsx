import { requireUser } from "@/features/auth/session";
import { getOpenWorkoutSessionForUser } from "@/features/workouts/queries";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await requireUser();
  const openSession = await getOpenWorkoutSessionForUser(user.id);

  const workoutHref = openSession ? `/workouts/${openSession.id}` : "/";

  return (
    <AppShell email={user.email} workoutHref={workoutHref}>
      {children}
    </AppShell>
  );
}
