import { HealthCoachOverlayDialog } from "@/components/app/HealthCoachOverlayDialog";

import { HealthCoachChatView } from "../../../health-coach/health-coach-chat-view";

export default function HealthCoachChatModalPage() {
  return (
    <HealthCoachOverlayDialog>
      <HealthCoachChatView embedded />
    </HealthCoachOverlayDialog>
  );
}
