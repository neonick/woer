import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lore = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lore' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    order: z.number(),
    emoji: z.string().optional(),
    sourceFile: z.string().optional(),
  }),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/characters' }),
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    description: z.string(),
    avatar: z.string().optional(),
    faction: z.string().optional(),
  }),
});

const factions = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/factions' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    logo: z.string().optional(),
  }),
});

export const collections = { lore, characters, factions };
