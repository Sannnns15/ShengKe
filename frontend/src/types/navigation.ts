// ══ Navigation Route Params ══════════════════════════════

export type RootStackParamList = {
  "(auth)": undefined;
  "(tabs)": undefined;
  "home/[id]": { id: string };
  "moment/detail": { momentId: string };
  "user/profile": { userId: string };
  "ai/chat": undefined;
};
