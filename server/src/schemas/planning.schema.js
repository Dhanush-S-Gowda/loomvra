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
          "tone",
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

          tone: {
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
          "colorTheme",
          "fontStyle",
          "designConcepts",
          "overallGuidelines"
        ],

        properties: {
          theme: {
            type: "string"
          },

          colorTheme: {
            type: "object",

            additionalProperties: false,

            required: [
              "primary",
              "secondary",
              "accent",
              "background",
              "text"
            ],

            properties: {
              primary: {
                type: "string"
              },

              secondary: {
                type: "string"
              },

              accent: {
                type: "string"
              },

              background: {
                type: "string"
              },

              text: {
                type: "string"
              }
            }
          },

          fontStyle: {
            type: "object",

            additionalProperties: false,

            required: [
              "heading",
              "subHeading",
              "body"
            ],

            properties: {
              heading: {
                type: "string"
              },

              subHeading: {
                type: "string"
              },

              body: {
                type: "string"
              }
            }
          },

          designConcepts: {
            type: "array",

            items: {
              type: "string"
            }
          },

          overallGuidelines: {
            type: "array",

            items: {
              type: "string"
            }
          }
        }
      },

      masterTemplate: {
        type: "object",

        additionalProperties: false,

        required: [
          "background",
          "persistentElements"
        ],

        properties: {
          background: {
            type: "object",

            additionalProperties: false,

            required: [
              "type",
              "description"
            ],

            properties: {
              type: {
                type: "string"
              },

              description: {
                type: "string"
              }
            }
          },

          persistentElements: {
            type: "array",

            items: {
              type: "object",

              additionalProperties: false,

              required: [
                "type",
                "position",
                "description"
              ],

              properties: {
                type: {
                  type: "string"
                },

                position: {
                  type: "string"
                },

                description: {
                  type: "string"
                }
              }
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
            "designGuidelines",
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

            designGuidelines: {
              type: "object",

              additionalProperties: false,

              required: [
                "layout",
                "background",
                "elementPlacement",
                "visualHierarchy",
                "stylingNotes"
              ],

              properties: {
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
                }
              }
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
