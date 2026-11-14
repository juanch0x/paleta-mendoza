import { z } from "zod";

/** Shared statistics input for application callers and AI tools. */
export const playerStatsSchema = z
  .strictObject({
    playerName: z
      .string()
      .regex(/\S/, "Player name must not be blank")
      .describe("Exact player name returned by findPlayers"),
    category: z
      .enum(["Primera", "Segunda", "Tercera", "Cuarta"])
      .nullable()
      .optional()
      .describe(
        "Apply only when the user explicitly requests a category. Use null or omit for all categories."
      ),
    dateFrom: z.iso
      .date()
      .optional()
      .describe(
        "Inclusive start date in YYYY-MM-DD format; filters overlapping whole tournaments"
      ),
    dateTo: z.iso
      .date()
      .optional()
      .describe(
        "Inclusive end date in YYYY-MM-DD format; must not precede dateFrom"
      ),
  })
  .refine(
    ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo,
    {
      message: "dateFrom must not be after dateTo",
      path: ["dateTo"],
    }
  );

export type PlayerStatsInput = z.infer<typeof playerStatsSchema>;
