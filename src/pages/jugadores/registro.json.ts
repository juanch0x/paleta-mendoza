import type { APIRoute } from "astro";

import { jsonPlayerRepository } from "@/data/repositories/json";

/**
 * Static copy of the player registry for the tournament diagnostics function,
 * which runs outside the Astro build and cannot read the content collection.
 */
export const GET: APIRoute = async () =>
  Response.json(await jsonPlayerRepository.list());
