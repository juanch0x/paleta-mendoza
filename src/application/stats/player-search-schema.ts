import { z } from "zod";

/** Shared input contract for application callers and AI tool parameters. */
export const playerSearchSchema = z.strictObject({
  name: z
    .string()
    .regex(/\S/, "Name must not be blank")
    .describe("Player name as written by the user"),
});

export type PlayerSearchInput = z.infer<typeof playerSearchSchema>;
