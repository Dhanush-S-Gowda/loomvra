import { z } from "zod";

export const SlideOutputSchema = z.object({
  css: z.string().min(1, "css must be a non-empty string"),
  html: z.string().min(1, "html must be a non-empty string"),
});

export default SlideOutputSchema;
