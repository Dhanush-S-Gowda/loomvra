import { z } from "zod";

/**
 * Zod schema for the `{ css, html }` output produced by both the
 * master-template and per-slide generation steps.
 *
 * - `css`  : a single `<style>` tag containing all styling.
 * - `html` : the complete markup starting with `<div class="slide">...</div>`.
 */
export const SlideOutputSchema = z.object({
  css: z.string().min(1, "css must be a non-empty string"),
  html: z.string().min(1, "html must be a non-empty string"),
});

export default SlideOutputSchema;
