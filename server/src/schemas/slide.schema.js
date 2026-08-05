const SlideSchema = {
  name: "slide_output",
  strict: true,

  schema: {
    type: "object",

    additionalProperties: false,

    required: ["css", "html"],

    properties: {
      css: {
        type: "string",
        description:
          'A single <style> tag containing all CSS styling for the slide (e.g. "<style>...</style>").',
      },

      html: {
        type: "string",
        description:
          'The complete slide markup starting with a root <div class="slide">...</div>.',
      },
    },
  },
};

export default SlideSchema;
