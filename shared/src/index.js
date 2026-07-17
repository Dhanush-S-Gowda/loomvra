import { z } from "zod";

// ============================================================
// ColorTheme
// ============================================================

export const ColorThemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  text: z.string(),
});

// ============================================================
// FontStyle
// ============================================================

export const FontStyleSchema = z.object({
  heading: z.string(),
  subHeading: z.string(),
  body: z.string(),
});

// ============================================================
// GlobalDesign
// ============================================================

export const GlobalDesignSchema = z.object({
  theme: z.string(),
  colorTheme: ColorThemeSchema,
  fontStyle: FontStyleSchema,
  designConcepts: z.string(),
  overallGuidelines: z.string(),
});

// ============================================================
// Background
// ============================================================

export const BackgroundSchema = z.object({
  type: z.string(),
  description: z.string(),
});

// ============================================================
// PersistentElement
// ============================================================

export const PersistentElementSchema = z.object({
  type: z.string(),
  position: z.string(),
  description: z.string(),
});

// ============================================================
// MasterTemplate
// ============================================================

export const MasterTemplateSchema = z.object({
  background: BackgroundSchema,
  persistentElements: z.array(PersistentElementSchema),
});

// ============================================================
// Image
// ============================================================

export const ImageSchema = z.object({
  purpose: z.string(),
  keyword: z.string(),
  orientation: z.enum(["landscape", "portrait", "square"]),
});

// ============================================================
// DesignGuidelines
// ============================================================

export const DesignGuidelinesSchema = z.object({
  layout: z.string(),
  background: z.string(),
  elementPlacement: z.string(),
  visualHierarchy: z.string(),
  stylingNotes: z.string(),
});

// ============================================================
// Slide
// ============================================================

export const SlideSchema = z.object({
  number: z.number().int().min(1),
  title: z.string(),
  objective: z.string(),
  content: z.string(),
  designGuidelines: DesignGuidelinesSchema,
  images: z.array(ImageSchema),
});

// ============================================================
// Project
// ============================================================

export const ProjectSchema = z.object({
  title: z.string(),
  topic: z.string(),
  purpose: z.string(),
  audience: z.string(),
  tone: z.string(),
  language: z.string(),
  slideCount: z.number().int().min(1),
});

// ============================================================
// PlanningModel — top-level schema
// ============================================================

export const PlanningSchema = z.object({
  project: ProjectSchema,
  globalDesign: GlobalDesignSchema,
  masterTemplate: MasterTemplateSchema,
  slides: z.array(SlideSchema).min(1),
});