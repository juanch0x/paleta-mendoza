import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";
export const PLAYERS_PATH = "src/data/jugadores";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: z.string().or(image()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
    }),
});

/** A calendar date as `YYYY-MM-DD`, compared as text. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato AAAA-MM-DD.")
  .refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }, "La fecha no existe.");

/**
 * Player registry: one JSON document per player, named `<id>.json`.
 * An invalid record fails the build and the error names the file.
 */
const jugadores = defineCollection({
  loader: glob({ pattern: "*.json", base: `./${PLAYERS_PATH}` }),
  schema: z
    .object({
      id: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El id debe ser un slug."),
      nombreOficial: z.string().trim().min(1),
      // Other names the player appears under in tournament sheets, so a
      // freeze still resolves them to this id.
      alias: z.array(z.string().trim().min(1)).optional(),
      // Official category history. The category in effect on a date is the
      // latest entry whose `desde` is on or before it.
      categorias: z
        .array(
          z
            .object({
              desde: isoDate,
              categoria: z.string().trim().min(1),
              origen: z.enum(["federacion", "ascenso"]),
            })
            .strict()
        )
        .optional(),
      // One position per year; provisional until the federation list arrives.
      posiciones: z
        .array(
          z
            .object({
              anio: z.number().int().min(2000).max(2100),
              posicion: z.enum(["delantero", "zaguero"]),
              origen: z.enum(["provisoria", "federacion"]),
            })
            .strict()
        )
        .refine(
          entries =>
            new Set(entries.map(entry => entry.anio)).size === entries.length,
          "Hay más de una posición para el mismo año."
        )
        .optional(),
    })
    .strict(),
});

export const collections = { blog, jugadores };
