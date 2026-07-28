/** Utilisateur courant (stub auth — a remplacer par une vraie session). */
export const CURRENT_USER = {
  email: "bendjibril789@gmail.com",
  name: "Ben Djibril",
  initials: "B",
} as const;

export type CurrentUser = typeof CURRENT_USER;
