export type HealthCoachChatActionState = {
  error: string | null;
  message: string;
  success: string | null;
};

export function getHealthCoachChatActionState(
  message = "",
): HealthCoachChatActionState {
  return {
    error: null,
    message,
    success: null,
  };
}
