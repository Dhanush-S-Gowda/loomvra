const mockPlanData = {
  projectId: 'proj-1',
  state: 'design',
  project: {
    title: "Impact of Fertilizers in Indian Agriculture",
    topic: "Fertilizers in Agriculture",
    purpose: "Educational and Awareness Presentation",
    audience: "Agricultural Students, Policy Makers, Farmers, General Public",
    language: "English",
    slideCount: 10
  },
  globalDesign: {
    theme: "Agriculture and Sustainability",
    primary_color: "#2E7D32",
    secondary_color: "#66BB6A",
    accent_color: "#F9A825",
    background_color: "#F1F8E9",
    text_color: "#1B5E20",
    heading_font: "Georgia Bold",
    subHeading_font: "Georgia SemiBold",
    body_font: "Georgia Regular",
    designConcepts: "Earthy tones, Organic shapes, Nature-inspired textures, Clean modern layout, Subtle botanical accents",
    overallGuidelines: "Maintain a natural and grounded aesthetic throughout. Use earthy greens as the dominant palette with warm accents. Keep slides uncluttered with generous whitespace. Use subtle leaf or soil-textured background elements sparingly. Ensure high contrast for readability. All slides should feel cohesive, professional, and rooted in an agricultural theme."
  },
  masterTemplate: {
    backgroundType: "Light gradient with organic pattern",
    backgroundDescription: "Soft gradient from light cream to very pale green. A faint, repeating leaf or soil pattern overlay in extremely low opacity (around 5%) to add subtle texture without distracting.",
    persistentElements: [
      { type: "Logo", position: "Top Left" },
      { type: "Slide Number", position: "Bottom Right" },
      { type: "Subtle Botanical Accent Line", position: "Bottom Edge (thin decorative line)" }
    ]
  },
  slides: [
    {
      number: 1,
      title: "Impact of Fertilizers in Indian Agriculture",
      objective: "Introduce the presentation topic and establish its relevance to India.",
      content: "# Impact of Fertilizers in Indian Agriculture\n### A Journey from Past to Future\n\n- Understanding fertilizer use in India\n- Historical context\n- Current scenario\n- Future implications",
      layout: "Hero Layout",
      background: "Warm gradient from deep green to earthy brown with a subtle overlay of agricultural patterns.",
      elementPlacement: "Large title positioned centrally-left with a subtitle below. A large, high-impact image of Indian farmland occupies the right half. Minimal text to keep the slide powerful and inviting.",
      visualHierarchy: "The main title is the absolute focal point. Subtitle supports it. The image provides emotional context. Bullet points are secondary and subtle.",
      stylingNotes: "Premium, cinematic feel. Use strong contrast between text and background. The image should be vibrant and evocative of Indian agriculture.",
      images: [
        "https://images.pexels.com/photos/36331060/pexels-photo-36331060.jpeg"
      ]
    },
    {
      number: 2,
      title: "History of Fertilizers in India",
      objective: "Provide historical background on fertilizer use in Indian agriculture.",
      content: "## Early Practices (Pre-1960s)\n\n- Traditional organic fertilizers: cow dung, compost, green manure\n- Reliance on natural soil fertility cycles\n- Low crop yields but sustainable practices\n\n## The Green Revolution Era (1960s-1980s)\n\n- Introduction of chemical fertilizers (NPK)\n- High-yielding variety seeds\n- Government subsidies and distribution networks\n- Drastic increase in food grain production",
      layout: "Timeline",
      background: "Light gradient background with subtle organic shapes representing soil layers.",
      elementPlacement: "Title at the top-left. A horizontal timeline divides the slide into two eras. Left side (Early Practices) and right side (Green Revolution Era). Each era has a colored card with bullet points. A connecting line with dots illustrates the progression.",
      visualHierarchy: "The timeline itself is the central visual anchor. The two era cards are equally important. Bullet points are supporting details.",
      stylingNotes: "Timeline line should be a muted brown or green. Era cards should have a slightly off-white background with a subtle shadow. Each era card can have a small icon (e.g., a leaf for organic, a factory for chemical).",
      images: []
    },
    {
      number: 3,
      title: "The Green Revolution: A Double-Edged Sword",
      objective: "Explain the transformative but also problematic impact of the Green Revolution.",
      content: "## Achievements\n\n- Food self-sufficiency achieved\n- Dramatic yield increases (wheat, rice)\n- Reduced dependence on imports\n\n## Unintended Consequences\n\n- Soil degradation\n- Water pollution (eutrophication)\n- Loss of soil biodiversity\n- Farmer debt cycles",
      layout: "Comparison Layout",
      background: "Split background: left half soft green, right half muted orange.",
      elementPlacement: "Title centered at the top. Left column (Achievements) with a green accent bar. Right column (Unintended Consequences) with an orange accent bar. Both columns have a card with bullet points. A subtle divider line separates them.",
      visualHierarchy: "Both columns should have equal visual weight. The title is the primary element. The two columns are secondary and of equal importance.",
      stylingNotes: "Use icons at the top of each column (e.g., a rising arrow for achievements, a warning sign for consequences). Maintain consistent spacing. The contrasting background colors reinforce the dual nature of the topic.",
      images: []
    },
    {
      number: 4,
      title: "Current Fertilizer Consumption Patterns",
      objective: "Show the scale and distribution of fertilizer use in India today.",
      content: "## India's Fertilizer Use (2023-24)\n\n- Total consumption: ~60 million tonnes\n- Urea dominates (~30 million tonnes)\n- Imbalanced NPK ratio (10:2.6:1 vs ideal 4:2:1)\n- High usage in Punjab, Haryana, Uttar Pradesh, Andhra Pradesh",
      layout: "Data Visualization Layout",
      background: "Clean light background with a subtle map outline of India in the background (low opacity).",
      elementPlacement: "Title at the top-left. A large bar chart or pie chart showing NPK consumption occupies the center-right. Key statistics are placed in a card on the left side. A small map of India highlights high-usage states.",
      visualHierarchy: "The chart is the primary visual element. The key statistics card is secondary. The map is a supporting background detail.",
      stylingNotes: "The chart should use the primary green and accent yellow colors. Keep data labels clear and readable. The map outline should be very faint so it doesn't compete with the chart.",
      images: []
    },
    {
      number: 5,
      title: "Environmental Impact on Indian Soils",
      objective: "Highlight the negative environmental consequences of over-fertilization.",
      content: "## Soil Health Crisis\n\n- Soil organic carbon declined in 70% of samples\n- Micronutrient deficiencies (zinc, iron)\n- Increased soil salinity and acidity\n- Groundwater contamination (nitrates)\n\n## Water Bodies Affected\n\n- Eutrophication in lakes and ponds\n- Algal blooms in rivers\n- Dead zones in coastal areas",
      layout: "Two Column with Images",
      background: "Earthy gradient background with subtle crackled soil texture.",
      elementPlacement: "Title centered at the top. Left column has a large image of cracked, degraded soil with bullet points below. Right column has an image of a polluted water body with bullet points below. Both columns are balanced.",
      visualHierarchy: "The images are the primary visual anchors, drawing attention to the problems. The bullet points are secondary explanations.",
      stylingNotes: "Images should be impactful but not overly graphic. Desaturated tones can convey the seriousness. Use a warm, concerned palette. Cards should have a slight transparency to allow the background texture to show.",
      images: [
        "https://images.pexels.com/photos/36767372/pexels-photo-36767372.jpeg",
        "https://images.pexels.com/photos/16778035/pexels-photo-16778035.jpeg"
      ]
    },
    {
      number: 6,
      title: "Socio-Economic Impact on Farmers",
      objective: "Discuss how fertilizer dependency affects farmers' livelihoods.",
      content: "## Economic Burden\n\n- Rising input costs\n- Debt and farmer distress\n- Subsidy dependency (₹1.6 lakh crore in 2023-24)\n\n## Health Impacts\n\n- Respiratory issues from handling\n- Waterborne diseases from nitrate contamination\n- Long-term soil infertility\n- Reduced farm profitability",
      layout: "Alternating Image Layout",
      background: "Soft warm gradient with a subtle texture resembling burlap or cloth.",
      elementPlacement: "Large portrait image of an Indian farmer on the left side. Text content on the right side, organized into two distinct sections (Economic Burden and Health Impacts). Each section has a small icon and bullet points.",
      visualHierarchy: "The farmer's portrait is the emotional anchor, humanizing the data. The text sections are secondary but equally important for conveying the message.",
      stylingNotes: "The image should be respectful and evocative. Use a vignette effect on the image to focus on the farmer's face. Text sections should be in clean cards with subtle separators.",
      images: [
        "https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg"
      ]
    },
    {
      number: 7,
      title: "Government Policies & Initiatives",
      objective: "Outline current government measures to address fertilizer issues.",
      content: "## Key Initiatives\n\n- **Neem Coating of Urea** (2015): Slow release, reduced diversion\n- **Soil Health Card Scheme** (2015): Soil testing for balanced fertilization\n- **PM-Kisan Samman Nidhi**: Direct income support\n- **Nutrient Based Subsidy (NBS)**: Encourages balanced NPK use\n- **Promotion of Organic Farming**: Paramparagat Krishi Vikas Yojana (PKVY)",
      layout: "Vertical Information Cards",
      background: "Clean light background with a faint pattern of government documents.",
      elementPlacement: "Title at the top. Five vertically stacked cards, each representing one initiative. Each card has a small icon on the left, the initiative name in bold, and a brief description. Cards are evenly spaced.",
      visualHierarchy: "The title is primary. The initiative cards are secondary, each with equal visual importance. The icons help differentiate them quickly.",
      stylingNotes: "Use government-inspired colors (blue, white, saffron) sparingly. Cards should have a light shadow and rounded corners. The icons should be simple and recognizable.",
      images: []
    },
    {
      number: 8,
      title: "Sustainable Alternatives & Solutions",
      objective: "Present eco-friendly alternatives to chemical fertilizers.",
      content: "## Promising Alternatives\n\n- **Organic Fertilizers**: Compost, vermicompost, biochar\n- **Biofertilizers**: Rhizobium, Azotobacter, Mycorrhiza\n- **Precision Farming**: Site-specific nutrient management\n- **Crop Rotation & Intercropping**: Natural nitrogen fixation\n- **Integrated Nutrient Management (INM)**: Combining organic & inorganic",
      layout: "Grid Layout",
      background: "Fresh green gradient with subtle leaf patterns.",
      elementPlacement: "Title centered at the top. A 2x3 grid of cards (one card for each alternative). Each card has a large icon or illustration, the alternative name in bold, and a 1-line description. The grid is evenly spaced and centered.",
      visualHierarchy: "The title is primary. Each card in the grid is equally weighted, promoting the idea of multiple viable alternatives. Icons make the slide visually engaging.",
      stylingNotes: "Use bright, optimistic colors (greens, yellows). Cards should have a white background with a subtle green border. Icons should be modern and clean.",
      images: []
    },
    {
      number: 9,
      title: "Future Implications & Recommendations",
      objective: "Discuss the long-term outlook and provide actionable recommendations.",
      content: "## The Path Forward\n\n- Reduce subsidy distortion favoring urea\n- Scale up soil testing and awareness\n- Invest in agri-tech and precision agriculture\n- Promote farmer cooperatives for bulk organic inputs\n- Shift towards ** regenerative agriculture**\n\n## Vision 2047\n\n- 50% reduction in chemical fertilizer use\n- 100% soil health coverage\n- Net-zero emissions from agriculture\n- Doubled farmer income",
      layout: "Process Flow",
      background: "Clean light background with a forward-moving arrow or path illustration (low opacity).",
      elementPlacement: "Title at the top-left. A horizontal process flow shows the steps from current state (left) to future vision (right). Key recommendations are placed along the path as cards. The 'Vision 2047' section is highlighted at the end with a distinct card.",
      visualHierarchy: "The process flow is the central visual narrative. The recommendations are intermediate steps. The 'Vision 2047' card is the ultimate destination and should be visually prominent.",
      stylingNotes: "Use a gradient arrow or path line connecting the steps. The 'Vision 2047' card should have a star or target icon and a slightly different color (accent yellow or gold) to signify the goal. Keep the flow direction clear.",
      images: []
    },
    {
      number: 10,
      title: "Key Takeaways & Call to Action",
      objective: "Summarize the presentation and inspire action.",
      content: "## Summary\n\n- Fertilizers fueled the Green Revolution but created environmental & social costs.\n- Current consumption is imbalanced and unsustainable.\n- Government policies are evolving but need greater impact.\n- Sustainable alternatives exist and must be scaled.\n- The future of Indian agriculture depends on balanced, regenerative practices.\n\n## Call to Action\n\n- **Farmers**: Adopt soil testing and INM\n- **Policymakers**: Reform subsidies and promote research\n- **Consumers**: Support organic and sustainably grown food\n- **All**: Advocate for a greener, fairer agricultural future",
      layout: "Centered Summary with Call to Action",
      background: "Warm, optimistic gradient (green to golden yellow) with a subtle rising sun or sprout pattern.",
      elementPlacement: "Centered layout. A large summary card occupies the upper half with concise bullet points. Below it, a distinct 'Call to Action' section with four audience-specific action items, each with a small icon. Strong, clear visual separation between summary and CTA.",
      visualHierarchy: "The summary bullet points are the primary takeaway. The Call to Action is the final, actionable message. The title should be large and commanding.",
      stylingNotes: "Premium, inspiring final slide. Use a prominent accent color for the CTA section (e.g., a button-like background). Ensure all text is highly readable. The overall feel should be hopeful and empowering.",
      images: []
    }
  ]
};

const mockGeneratedContent = {
  projectId: 'proj-1',
  state: 'generated',
  slides: [
    {
      index: 0,
      content: `
      <!doctype html>
      <html lang="en">
          <head>
              <meta charset="UTF-8" />
              <style>
                  * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                  }

                  html,
                  body {
                      width: 1280px;
                      height: 720px;
                      overflow: hidden;
                      font-family: Inter, "Segoe UI", sans-serif;
                      background: #f5f7fb;
                      color: #111827;
                  }

                  .slide {
                      position: relative;
                      width: 1280px;
                      height: 720px;
                      overflow: hidden;
                      background: #f5f7fb;
                  }

                  /* ===========================
                 BACKGROUND
              =========================== */

                  .bg {
                      position: absolute;
                      inset: 0;
                  }

                  .circle {
                      position: absolute;
                      border-radius: 50%;
                  }

                  .c1 {
                      width: 720px;
                      height: 720px;
                      background: #e8f0ff;
                      right: -350px;
                      top: -320px;
                  }

                  .c2 {
                      width: 430px;
                      height: 430px;
                      background: #ecfdf5;
                      left: -210px;
                      bottom: -210px;
                  }

                  .c3 {
                      width: 180px;
                      height: 180px;
                      background: #dbeafe;
                      right: 120px;
                      bottom: 90px;
                  }

                  .c4 {
                      width: 90px;
                      height: 90px;
                      background: #bfdbfe;
                      left: 560px;
                      top: 120px;
                  }

                  /* decorative bars */

                  .bar {
                      position: absolute;
                      border-radius: 100px;
                  }

                  .b1 {
                      width: 180px;
                      height: 14px;
                      background: #2563eb;
                      right: 220px;
                      top: 85px;
                  }

                  .b2 {
                      width: 110px;
                      height: 10px;
                      background: #14b8a6;
                      right: 180px;
                      top: 115px;
                  }

                  /* ===========================
                 TYPOGRAPHY
              =========================== */

                  .kicker {
                      position: absolute;
                      left: 80px;
                      top: 70px;

                      font-size: 18px;
                      font-weight: 700;
                      letter-spacing: 2px;
                      color: #2563eb;
                      text-transform: uppercase;
                  }

                  .title {
                      position: absolute;

                      left: 80px;
                      top: 120px;

                      width: 540px;

                      font-size: 72px;
                      line-height: 0.95;
                      letter-spacing: -3px;
                      font-weight: 800;
                  }

                  .subtitle {
                      position: absolute;

                      left: 80px;
                      top: 400px;

                      width: 470px;

                      font-size: 22px;
                      line-height: 1.4;
                      color: #64748b;
                  }

                  /* ===========================
                 IMAGE
              =========================== */

                  .hero-image {
                      position: absolute;

                      right: 70px;
                      top: 70px;

                      width: 530px;
                      height: 530px;

                      border-radius: 34px;

                      overflow: hidden;
                  }

                  .hero-image img {
                      width: 100%;
                      height: 100%;
                      object-fit: cover;
                  }

                  /* ===========================
                 METRICS
              =========================== */

                  .metrics {
                      position: absolute;

                      left: 80px;
                      bottom: 55px;

                      display: flex;

                      gap: 22px;
                  }

                  .metric {
                      width: 150px;

                      border-top: 4px solid #2563eb;

                      padding-top: 18px;
                  }

                  .metric h2 {
                      font-size: 42px;

                      line-height: 1;

                      font-weight: 800;
                  }

                  .metric p {
                      margin-top: 8px;

                      color: #64748b;

                      line-height: 1.4;

                      font-size: 15px;
                  }

                  /* ===========================
                 FLOATING SHAPES
              =========================== */

                  .square {
                      position: absolute;

                      border-radius: 18px;
                  }

                  .s1 {
                      width: 70px;
                      height: 70px;

                      background: #2563eb;

                      right: 610px;

                      top: 170px;
                  }

                  .s2 {
                      width: 34px;
                      height: 34px;

                      background: #14b8a6;

                      right: 560px;

                      top: 260px;
                  }

                  .s3 {
                      width: 22px;
                      height: 22px;

                      background: #2563eb;

                      left: 620px;

                      bottom: 150px;
                  }

                  .line {
                      position: absolute;

                      width: 180px;
                      height: 5px;

                      background: #2563eb;

                      border-radius: 100px;

                      left: 560px;
                      bottom: 105px;
                  }

                  .dot {
                      position: absolute;

                      width: 18px;
                      height: 18px;

                      background: #2563eb;

                      border-radius: 50%;
                  }

                  .d1 {
                      left: 730px;
                      bottom: 98px;
                  }

                  .d2 {
                      left: 548px;
                      bottom: 98px;
                  }
              </style>
          </head>
          <body>
              <div class="slide">
                  <!-- Background -->

                  <div class="bg">
                      <div class="circle c1"></div>
                      <div class="circle c2"></div>
                      <div class="circle c3"></div>
                      <div class="circle c4"></div>

                      <div class="bar b1"></div>
                      <div class="bar b2"></div>

                      <div class="square s1"></div>
                      <div class="square s2"></div>
                      <div class="square s3"></div>

                      <div class="line"></div>
                      <div class="dot d1"></div>
                      <div class="dot d2"></div>
                  </div>

                  <!-- Left Content -->

                  <div class="kicker">AI PRESENTATION</div>

                  <div class="title">
                      Build<br />
                      Beautiful<br />
                      Slides<br />
                      from HTML.
                  </div>

                  <div class="subtitle">
                      Design rich presentations using familiar HTML and CSS. Render
                      them with Playwright, extract every visual element into a scene
                      graph and generate editable PowerPoint presentations
                      automatically.
                  </div>

                  <!-- Image -->

                  <div class="hero-image">
                      <img
                          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
                          alt=""
                      />

                  </div>

                  <!-- Metrics -->

                  <div class="metrics">
                      <div class="metric">
                          <h2>98%</h2>
                          <p>Rendering Accuracy</p>
                      </div>

                      <div class="metric">
                          <h2>4×</h2>
                          <p>Faster Generation</p>
                      </div>

                      <div class="metric">
                          <h2>100%</h2>
                          <p>Editable Objects</p>
                      </div>
                  </div>
              </div>
          </body>
      </html>
    `
    },
    {
      index: 0,
      content: `
      <!doctype html>
      <html lang="en">
          <head>
              <meta charset="UTF-8" />
              <style>
                  * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                  }

                  html,
                  body {
                      width: 1280px;
                      height: 720px;
                      overflow: hidden;
                      font-family: Inter, "Segoe UI", sans-serif;
                      background: #f5f7fb;
                      color: #111827;
                  }

                  .slide {
                      position: relative;
                      width: 1280px;
                      height: 720px;
                      overflow: hidden;
                      background: #f5f7fb;
                  }

                  /* ===========================
                 BACKGROUND
              =========================== */

                  .bg {
                      position: absolute;
                      inset: 0;
                  }

                  .circle {
                      position: absolute;
                      border-radius: 50%;
                  }

                  .c1 {
                      width: 720px;
                      height: 720px;
                      background: #e8f0ff;
                      right: -350px;
                      top: -320px;
                  }

                  .c2 {
                      width: 430px;
                      height: 430px;
                      background: #ecfdf5;
                      left: -210px;
                      bottom: -210px;
                  }

                  .c3 {
                      width: 180px;
                      height: 180px;
                      background: #dbeafe;
                      right: 120px;
                      bottom: 90px;
                  }

                  .c4 {
                      width: 90px;
                      height: 90px;
                      background: #bfdbfe;
                      left: 560px;
                      top: 120px;
                  }

                  /* decorative bars */

                  .bar {
                      position: absolute;
                      border-radius: 100px;
                  }

                  .b1 {
                      width: 180px;
                      height: 14px;
                      background: #2563eb;
                      right: 220px;
                      top: 85px;
                  }

                  .b2 {
                      width: 110px;
                      height: 10px;
                      background: #14b8a6;
                      right: 180px;
                      top: 115px;
                  }

                  /* ===========================
                 TYPOGRAPHY
              =========================== */

                  .kicker {
                      position: absolute;
                      left: 80px;
                      top: 70px;

                      font-size: 18px;
                      font-weight: 700;
                      letter-spacing: 2px;
                      color: #2563eb;
                      text-transform: uppercase;
                  }

                  .title {
                      position: absolute;

                      left: 80px;
                      top: 120px;

                      width: 540px;

                      font-size: 72px;
                      line-height: 0.95;
                      letter-spacing: -3px;
                      font-weight: 800;
                  }

                  .subtitle {
                      position: absolute;

                      left: 80px;
                      top: 400px;

                      width: 470px;

                      font-size: 22px;
                      line-height: 1.4;
                      color: #64748b;
                  }

                  /* ===========================
                 IMAGE
              =========================== */

                  .hero-image {
                      position: absolute;

                      right: 70px;
                      top: 70px;

                      width: 530px;
                      height: 530px;

                      border-radius: 34px;

                      overflow: hidden;
                  }

                  .hero-image img {
                      width: 100%;
                      height: 100%;
                      object-fit: cover;
                  }

                  /* ===========================
                 METRICS
              =========================== */

                  .metrics {
                      position: absolute;

                      left: 80px;
                      bottom: 55px;

                      display: flex;

                      gap: 22px;
                  }

                  .metric {
                      width: 150px;

                      border-top: 4px solid #2563eb;

                      padding-top: 18px;
                  }

                  .metric h2 {
                      font-size: 42px;

                      line-height: 1;

                      font-weight: 800;
                  }

                  .metric p {
                      margin-top: 8px;

                      color: #64748b;

                      line-height: 1.4;

                      font-size: 15px;
                  }

                  /* ===========================
                 FLOATING SHAPES
              =========================== */

                  .square {
                      position: absolute;

                      border-radius: 18px;
                  }

                  .s1 {
                      width: 70px;
                      height: 70px;

                      background: #2563eb;

                      right: 610px;

                      top: 170px;
                  }

                  .s2 {
                      width: 34px;
                      height: 34px;

                      background: #14b8a6;

                      right: 560px;

                      top: 260px;
                  }

                  .s3 {
                      width: 22px;
                      height: 22px;

                      background: #2563eb;

                      left: 620px;

                      bottom: 150px;
                  }

                  .line {
                      position: absolute;

                      width: 180px;
                      height: 5px;

                      background: #2563eb;

                      border-radius: 100px;

                      left: 560px;
                      bottom: 105px;
                  }

                  .dot {
                      position: absolute;

                      width: 18px;
                      height: 18px;

                      background: #2563eb;

                      border-radius: 50%;
                  }

                  .d1 {
                      left: 730px;
                      bottom: 98px;
                  }

                  .d2 {
                      left: 548px;
                      bottom: 98px;
                  }
              </style>
          </head>
          <body>
              <div class="slide">
                  <!-- Background -->

                  <div class="bg">
                      <div class="circle c1"></div>
                      <div class="circle c2"></div>
                      <div class="circle c3"></div>
                      <div class="circle c4"></div>

                      <div class="bar b1"></div>
                      <div class="bar b2"></div>

                      <div class="square s1"></div>
                      <div class="square s2"></div>
                      <div class="square s3"></div>

                      <div class="line"></div>
                      <div class="dot d1"></div>
                      <div class="dot d2"></div>
                  </div>

                  <!-- Left Content -->

                  <div class="kicker">AI PRESENTATION</div>

                  <div class="title">
                      Build<br />
                      Beautiful<br />
                      Slides<br />
                      from HTML.
                  </div>

                  <div class="subtitle">
                      Design rich presentations using familiar HTML and CSS. Render
                      them with Playwright, extract every visual element into a scene
                      graph and generate editable PowerPoint presentations
                      automatically.
                  </div>

                  <!-- Image -->

                  <div class="hero-image">
                      <img
                          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
                          alt=""
                      />

                  </div>

                  <!-- Metrics -->

                  <div class="metrics">
                      <div class="metric">
                          <h2>98%</h2>
                          <p>Rendering Accuracy</p>
                      </div>

                      <div class="metric">
                          <h2>4×</h2>
                          <p>Faster Generation</p>
                      </div>

                      <div class="metric">
                          <h2>100%</h2>
                          <p>Editable Objects</p>
                      </div>
                  </div>
              </div>
          </body>
      </html>
    `
    }
  ]
};

export function fetchProjectAPI(projectId) {
  if (projectId === "proj-1") {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...mockPlanData, projectId });
      }, 500);
    });
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockGeneratedContent);
    }, 500);
  });
}
