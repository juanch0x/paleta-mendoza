export const clubs = {
  "gimnasia-y-esgrima": {
    name: "Gimnasia y Esgrima",
    logo: "/images/clubs/gimnasia-y-esgrima.png",
    markClassName: "border-accent/70 bg-white p-0.5",
  },
  regatas: {
    name: "Regatas",
    logo: "/images/clubs/regatas.png",
    markClassName: "border-accent/70 bg-white p-1.5",
  },
} as const;

export type ClubId = keyof typeof clubs;
