const PlanningSchema = {
  name: "presentation_planning",
  strict: true,

  schema: {
    type: "object",

    additionalProperties: false,

    required: [
      "project",
      "globalDesign",
      "masterTemplate",
      "slides"
    ],

    properties: {
      project: {
        type: "object",

        additionalProperties: false,

        required: [
          "title",
          "topic",
          "purpose",
          "audience",
          "language",
          "slideCount"
        ],

        properties: {
          title: {
            type: "string"
          },

          topic: {
            type: "string"
          },

          purpose: {
            type: "string"
          },

          audience: {
            type: "string"
          },

          language: {
            type: "string"
          },

          slideCount: {
            type: "integer",
            minimum: 1
          }
        }
      },

      globalDesign: {
        type: "object",

        additionalProperties: false,

        required: [
          "theme",
          "primary_color",
          "secondary_color",
          "accent_color",
          "background_color",
          "text_color",
          "heading_font",
          "subHeading_font",
          "body_font",
          "designConcepts",
          "overallGuidelines"
        ],

        properties: {
          theme: {
            type: "string"
          },

          // Colors (flattened from former colorTheme object)
          primary_color: {
            type: "string"
          },

          secondary_color: {
            type: "string"
          },

          accent_color: {
            type: "string"
          },

          background_color: {
            type: "string"
          },

          text_color: {
            type: "string"
          },

          // Fonts (flattened from former fontStyle object)
          heading_font: {
            type: "string"
          },

          subHeading_font: {
            type: "string"
          },

          body_font: {
            type: "string"
          },

          designConcepts: {
            type: "string"
          },

          overallGuidelines: {
            type: "string"
          }
        }
      },

      masterTemplate: {
        type: "object",

        additionalProperties: false,

        required: [
          "backgroundType",
          "backgroundDescription",
          "persistentElements"
        ],

        properties: {
          backgroundType: {
            type: "string"
          },

          backgroundDescription: {
            type: "string"
          },

          persistentElements: {
            type: "array",

            items: {
              type: "object",

              additionalProperties: false,

              required: [
                "type",
                "position"
              ],

              properties: {
                type: {
                  type: "string"
                },

                position: {
                  type: "string"
                }
              }
            }
          },

          image: {
            type: "object",
            additionalProperties: false,
            required: ["src"],
            properties: {
              src: { type: "string" },
              purpose: { type: "string" }
            }
          }
        }
      },

      slides: {
        type: "array",

        minItems: 1,

        items: {
          type: "object",

          additionalProperties: false,

          required: [
            "number",
            "title",
            "objective",
            "content",
            "layout",
            "background",
            "elementPlacement",
            "visualHierarchy",
            "stylingNotes",
            "images"
          ],

          properties: {
            number: {
              type: "integer",
              minimum: 1
            },

            title: {
              type: "string"
            },

            objective: {
              type: "string"
            },

            content: {
              type: "string",
              description: "Presentation-ready Markdown."
            },

            // Design guidelines flattened directly into slide
            layout: {
              type: "string"
            },

            background: {
              type: "string"
            },

            elementPlacement: {
              type: "string"
            },

            visualHierarchy: {
              type: "string"
            },

            stylingNotes: {
              type: "string"
            },

            images: {
              type: "array",

              items: {
                type: "object",

                additionalProperties: false,

                required: [
                  "purpose",
                  "keyword",
                  "orientation"
                ],

                properties: {
                  purpose: {
                    type: "string"
                  },

                  keyword: {
                    type: "string"
                  },

                  orientation: {
                    type: "string",
                    enum: [
                      "landscape",
                      "portrait",
                      "square"
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default PlanningSchema;
