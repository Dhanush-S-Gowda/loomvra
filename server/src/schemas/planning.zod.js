import { z } from "zod";

/**
 * Zod schema mirroring the OpenRouter `PlanningSchema` used during the
 * design phase. Used to validate the parsed design plan before it is
 * persisted and before slide generation begins.
 */

export const ProjectSchema = z.object({
  title: z.string(),
  topic: z.string(),
  purpose: z.string(),
  audience: z.string(),
  language: z.string(),
  slideCount: z.number().int().min(1),
});

export const GlobalDesignSchema = z.object({
  theme: z.string(),
  primary_color: z.string(),
  secondary_color: z.string(),
  accent_color: z.string(),
  background_color: z.string(),
  text_color: z.string(),
  heading_font: z.string(),
  subHeading_font: z.string(),
  body_font: z.string(),
  designConcepts: z.string(),
  overallGuidelines: z.string(),
});

export const PersistentElementSchema = z.object({
  type: z.string(),
  position: z.string(),
});

export const MasterTemplateSchema = z.object({
  backgroundType: z.string(),
  backgroundDescription: z.string(),
  persistentElements: z.array(PersistentElementSchema),
  image: z.object({ src: z.string(), purpose: z.string().nullable() }).nullable(),
});

export const SlideImageSchema = z.object({
  purpose: z.string(),
  keyword: z.string(),
  orientation: z.enum(["landscape", "portrait", "square"]),
  // `src` is added by the design job after Pexels enrichment.
  src: z.string().optional(),
});

export const SlidePlanSchema = z.object({
  number: z.number().int().min(1),
  title: z.string(),
  objective: z.string(),
  content: z.string(),
  layout: z.string(),
  background: z.string(),
  elementPlacement: z.string(),
  visualHierarchy: z.string(),
  stylingNotes: z.string(),
  images: z.array(SlideImageSchema),
});

export const PlanningZodSchema = z.object({
  project: ProjectSchema,
  globalDesign: GlobalDesignSchema,
  masterTemplate: MasterTemplateSchema,
  slides: z.array(SlidePlanSchema).min(1),
});

export default PlanningZodSchema;
