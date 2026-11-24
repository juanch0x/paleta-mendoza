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
    })
    .strict(),
});

export const collections = { blog, jugadores };
