export interface VoiceProfile {
  tone: string[]
  audience: string[]
  objective: string[]
  brandVoice: string[]
  contentStyle: string[]
  restrictions: string[]
  other: string[]
}

export interface FrameworkSlide {
  title: string
  instructions: string
  slideType: string
  layout: string
  order: number
}

export const SYSTEM_PROMPT = `You are a professional presentation creator. Your role is to generate compelling, well-structured presentation content that engages audiences and achieves the presenter's objectives.

Key principles:
- Create content that is clear, engaging, and actionable
- Maintain consistent tone and style throughout
- Structure information logically and persuasively
- Use appropriate formatting for presentation slides
- Ensure content is relevant to the intended audience
- Follow any specific framework requirements exactly`

export function buildVoiceContextPrompt(voiceProfile: VoiceProfile | null): string {
  if (!voiceProfile) {
    return "Use a professional, clear, and engaging tone suitable for business presentations."
  }

  let voiceContext = "VOICE & STYLE CONTEXT:\n"
  
  if (voiceProfile.tone.length > 0) {
    voiceContext += `Tone: ${voiceProfile.tone.join(', ')}\n`
  }
  
  if (voiceProfile.audience.length > 0) {
    voiceContext += `Target Audience: ${voiceProfile.audience.join(', ')}\n`
  }
  
  if (voiceProfile.objective.length > 0) {
    voiceContext += `Presentation Objectives: ${voiceProfile.objective.join(', ')}\n`
  }
  
  if (voiceProfile.brandVoice.length > 0) {
    voiceContext += `Brand Voice: ${voiceProfile.brandVoice.join(', ')}\n`
  }
  
  if (voiceProfile.contentStyle.length > 0) {
    voiceContext += `Content Style: ${voiceProfile.contentStyle.join(', ')}\n`
  }
  
  if (voiceProfile.restrictions.length > 0) {
    voiceContext += `Restrictions: ${voiceProfile.restrictions.join(', ')}\n`
  }
  
  if (voiceProfile.other.length > 0) {
    voiceContext += `Additional Instructions: ${voiceProfile.other.join(', ')}\n`
  }
  
  return voiceContext
}

export function buildFrameworkPrompt(framework: any): string {
  if (!framework || !framework.slides || framework.slides.length === 0) {
    return ""
  }

  let frameworkPrompt = `FRAMEWORK REQUIREMENTS:\n`
  frameworkPrompt += `You must create exactly ${framework.slides.length} slides following this specific structure:\n\n`

  framework.slides.forEach((slide: FrameworkSlide, index: number) => {
    frameworkPrompt += `Slide ${index + 1}: ${slide.title}\n`
    frameworkPrompt += `Type: ${slide.slideType}\n`
    frameworkPrompt += `Layout: ${slide.layout}\n`
    frameworkPrompt += `Instructions: ${slide.instructions}\n\n`
  })

  frameworkPrompt += `CRITICAL: Follow the slide order and instructions exactly. Each slide must serve its specific purpose as outlined above.`
  
  return frameworkPrompt
}

export const SLIDE_GENERATION_PROMPT = `Generate presentation slides based on the following requirements:

TOPIC: {topic}
PRESENTATION TITLE: {title}

{voiceContext}

{frameworkContext}

OUTPUT FORMAT:
Return a JSON array of slide objects with this exact structure:
[
  {
    "title": "slide title",
    "content": "slide content in markdown format with proper headings and bullet points",
    "slideType": "TITLE|INTRO|CONTENT|CONCLUSION|NEXT_STEPS",
    "layout": "TEXT_ONLY|TITLE_COVER|TITLE_ONLY|TEXT_IMAGE_LEFT|TEXT_IMAGE_RIGHT|IMAGE_FULL|BULLETS_IMAGE|TWO_COLUMN|IMAGE_BACKGROUND|TIMELINE|QUOTE_LARGE|STATISTICS_GRID|IMAGE_OVERLAY|SPLIT_CONTENT|COMPARISON",
    "order": 1
  }
]

CONTENT REQUIREMENTS:
- Use markdown formatting (##, ###, -, etc.)
- Create engaging, actionable content
- Ensure each slide serves a clear purpose
- Make content appropriate for the target audience
- Include specific examples and actionable insights where relevant
- Keep content concise but comprehensive
- Use bullet points effectively for key information

TITLE SLIDE REQUIREMENTS:
- ONLY include the presentation title, nothing else
- No subtitles, definitions, or additional content
- Simple format: just "# Title" 
- Keep it clean and focused

IMPORTANT: Return ONLY the JSON array, no additional text or explanations.`

export const SLIDE_REGENERATION_PROMPT = `Regenerate and enhance the following slide:

ORIGINAL SLIDE:
Title: {originalTitle}
Content: {originalContent}
Type: {slideType}
Layout: {layout}

ENHANCEMENT CONTEXT:
Topic: {topic}
Additional Context: {additionalContext}

{voiceContext}

REQUIREMENTS:
- Significantly improve the content while maintaining the slide's purpose
- Keep the same slideType and layout unless improvement requires a change
- Make content more engaging, specific, and actionable
- Add relevant examples or insights where appropriate
- Ensure content flows well and serves the presentation's overall narrative

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "title": "enhanced slide title",
  "content": "enhanced slide content in markdown format",
  "slideType": "same or improved slide type",
  "layout": "same or improved layout",
  "order": {order}
}

IMPORTANT: Return ONLY the JSON object, no additional text or explanations.`

export const SIMPLE_OUTLINE_PROMPT = `Generate a simple presentation outline to verify topic understanding:

TOPIC: {topic}
PRESENTATION TITLE: {title}

{voiceContext}

{frameworkContext}

Create a simple outline showing slide titles and main topic to confirm understanding before generating full slides.

OUTPUT FORMAT:
Return a JSON array with this structure:
[
  {
    "title": "slide title",
    "mainTopic": "what this slide covers in one sentence",
    "slideType": "TITLE|INTRO|CONTENT|CONCLUSION|NEXT_STEPS",
    "order": 1
  }
]

REQUIREMENTS:
- Keep it simple - just slide titles and one-sentence topics
- Focus on ensuring topic understanding is correct
- Create 4-7 slides typically
- Make sure the main subject/acronyms are interpreted correctly

IMPORTANT: Return ONLY the JSON array, no additional text or explanations.`

export const SLIDES_FROM_OUTLINE_PROMPT = `Generate detailed presentation slides based on the approved outline:

OUTLINE: {outline}

PRESENTATION TITLE: {title}

{voiceContext}

Generate full slide content with detailed speaker notes based on the approved outline structure.

OUTPUT FORMAT:
Return a JSON array of slide objects with this exact structure:
[
  {
    "title": "slide title",
    "content": "detailed slide content in markdown format with proper headings and bullet points",
    "narration": "detailed word-for-word speaker notes that explain the slide content. This should be what the presenter will say while showing this slide. Make it conversational and comprehensive.",
    "slideType": "TITLE|INTRO|CONTENT|CONCLUSION|NEXT_STEPS",
    "layout": "TEXT_ONLY|TITLE_COVER|TEXT_IMAGE_LEFT|TEXT_IMAGE_RIGHT|IMAGE_FULL|BULLETS_IMAGE|TWO_COLUMN|IMAGE_BACKGROUND",
    "order": 1
  }
]

CONTENT REQUIREMENTS:
- Use markdown formatting (##, ###, -, etc.)
- Create engaging, actionable content that matches the outline
- Follow the approved structure and key points exactly
- Make content appropriate for the target audience
- Include specific examples and actionable insights where relevant
- Keep content concise but comprehensive

SPEAKER NOTES REQUIREMENTS:
- Write detailed, word-for-word narration that explains each slide
- Notes should flow naturally and be comprehensive enough to read directly
- Explain each point on the slide in detail with context and examples
- Match the voice profile tone and style
- Include transitions between points and slides
- Make notes conversational and engaging for the audience
- Provide specific talking points for each bullet or section

TITLE SLIDE REQUIREMENTS:
- Content should ONLY include the presentation title
- Speaker notes should welcome the audience and introduce the topic

IMPORTANT: Return ONLY the JSON array, no additional text or explanations.`

export const DEFAULT_SLIDE_LAYOUTS = {
  TITLE: 'TITLE_ONLY',
  INTRO: 'TEXT_ONLY',
  CONTENT: 'TEXT_IMAGE_RIGHT',
  CONCLUSION: 'TEXT_ONLY',
  NEXT_STEPS: 'BULLETS_IMAGE'
} as const

export function getDefaultLayoutForSlideType(slideType: string): string {
  return DEFAULT_SLIDE_LAYOUTS[slideType as keyof typeof DEFAULT_SLIDE_LAYOUTS] || 'TEXT_ONLY'
}

export const GENERATE_ANGLES_PROMPT = `Analyze the following brainstorm idea and generate 3 different presentation angles using the CUB, PASE, and HEAR frameworks:

BRAINSTORM IDEA:
Title: {title}
Description: {description}

Generate exactly 4 angles - one for each framework:

1. CUB Framework (Contrarian-Useful-Bridge)
2. PASE Framework (Problem-Agitate-Solve-Expand)
3. HEAR Framework (Hook-Empathy-Authority-Roadmap)
4. WWH Framework (What-Why-How)

For each angle, provide:
- A compelling angle title that makes the audience want to learn more
- A clear description of how this framework approaches the topic
- Actual content quotes that would appear in the presentation using this angle (NOT instructions)

OUTPUT FORMAT:
Return a JSON array with this exact structure:
[
  {
    "frameworkType": "CUB",
    "angleTitle": "compelling title for this angle",
    "description": "2-3 sentences explaining this angle's unique approach to the topic",
    "keyPoints": ["contrarian statement quote", "useful method quote", "bridge to future quote"],
    "frameworkId": "framework-id-from-cub-framework"
  },
  {
    "frameworkType": "PASE",
    "angleTitle": "compelling title for this angle",
    "description": "2-3 sentences explaining this angle's unique approach to the topic",
    "keyPoints": ["problem statement quote", "agitate consequences quote", "solution method quote", "expanded possibilities quote"],
    "frameworkId": "framework-id-from-pase-framework"
  },
  {
    "frameworkType": "HEAR",
    "angleTitle": "compelling title for this angle",
    "description": "2-3 sentences explaining this angle's unique approach to the topic",
    "keyPoints": ["attention-grabbing hook quote", "empathy statement quote", "authority/expertise quote", "clear roadmap quote"],
    "frameworkId": "framework-id-from-hear-framework"
  },
  {
    "frameworkType": "WWH",
    "angleTitle": "compelling title for this angle",
    "description": "2-3 sentences explaining this angle's unique approach to the topic",
    "keyPoints": ["what concept/solution quote", "why it matters quote", "how to implement quote"],
    "frameworkId": "framework-id-from-wwh-framework"
  }
]

REQUIREMENTS:
- Each angle must be distinctly different in approach and tone
- Titles should be compelling and make the audience curious
- Descriptions should clearly show how each framework changes the presentation approach
- Key points must be actual quotes/statements that would appear in the presentation, NOT instructions
- Write the key points as if you're the presenter speaking directly to the audience
- Make each angle genuinely valuable and interesting
- Base all content on the specific brainstorm idea provided

FRAMEWORK GUIDELINES AND EXAMPLES:

CUB Framework:
- Contrarian: Challenge common beliefs with a bold statement
  Example: "Software engineers say you need a PRD and a wireframe before you start. Wrong."
- Useful: Provide practical, actionable methods
  Example: "Here's my 4-step Explore Method: pick one idea, create 3 different prompts, compare the outputs, and keep what works."
- Bridge: Connect to bigger trends or transformations
  Example: "AI makes iteration nearly free. That changes not just coding, but the way we build businesses."

PASE Framework:
- Problem: Identify specific pain points in direct language
  Example: "Most teams spend months in planning mode."
- Agitate: Show consequences of inaction with urgency
  Example: "By the time your wireframe is polished, the market has moved, and you're already behind."
- Solve: Present your solution method clearly
  Example: "Explore Method: create 3 versions in a day, spot what doesn't work, and refine fast."
- Expand: Show what becomes possible with inspiring vision
  Example: "This mindset lets you pivot, test, and innovate faster than traditional teams ever could."

HEAR Framework:
- Hook: Attention-grabbing opening that surprises
  Example: "Perfect planning kills creativity."
- Empathy: Show understanding of struggles with personal touch
  Example: "I used to waste weeks on specs that nobody even looked at."
- Authority: Share your expertise/method with confidence
  Example: "That's why I developed the Explore Method — 3 prototypes instead of 1 plan."
- Roadmap: Clear step-by-step path that's actionable
  Example: "Step 1: Pick an idea. Step 2: Write 3 prompts. Step 3: Compare results. Step 4: Keep the spark, toss the junk."

WWH Framework:
- What: Present the concept/solution clearly and concisely
  Example: "The Explore Method is simple: create 3 different versions of your idea in one day instead of spending weeks planning."
- Why: Explain the reasoning, benefits, and urgency
  Example: "Because while you're perfecting your plan, your competitors are shipping. Speed beats perfection every time in today's market."
- How: Provide step-by-step implementation guidance
  Example: "Here's exactly how to do it: Morning - brainstorm 3 angles. Afternoon - build rough prototypes. Evening - test with real users."

IMPORTANT: Return ONLY the JSON array, no additional text or explanations.`

export const PRESENTATION_FROM_ANGLE_PROMPT = `Generate a complete presentation with detailed narration based on the selected angle and brainstorm idea:

BRAINSTORM IDEA:
Title: {ideaTitle}
Description: {ideaDescription}

SELECTED ANGLE:
Framework: {frameworkType}
Title: {angleTitle}
Description: {angleDescription}
Key Points: {keyPoints}

PRESENTATION TITLE: {presentationTitle}

{voiceContext}

{frameworkContext}

Generate a comprehensive presentation following this EXACT structure:

PRESENTATION STRUCTURE (18-20+ slides total):

1. TITLE SLIDE (1 slide)

2. ABT FRAMEWORK - INTRODUCTION (3 slides):
   - AND: Set up the context and current situation
   - BUT: Present the conflict, problem, or challenge
   - THEREFORE: Transition to why this matters and what we'll explore

4. HOOK SLIDE - GRAB ATTENTION (1 slide):
   Create a bold, compelling hook that makes the audience think "I need to hear this"

5. SELECTED ANGLE FRAMEWORK × 3 MAIN POINTS - BODY (11-14 slides including transitions):
   Apply the selected framework to EACH of your 3 main points with transitions:

   For CUB Framework (3×3 + 2 transitions = 11 slides):
   - Point 1: Contrarian + Useful + Bridge
   - **TRANSITION SLIDE** (recap Point 1, preview Point 2)
   - Point 2: Contrarian + Useful + Bridge
   - **TRANSITION SLIDE** (recap Point 2, preview Point 3)
   - Point 3: Contrarian + Useful + Bridge

   For PASE Framework (4×3 + 2 transitions = 14 slides):
   - Point 1: Problem + Agitate + Solve + Expand
   - **TRANSITION SLIDE** (recap Point 1, preview Point 2)
   - Point 2: Problem + Agitate + Solve + Expand
   - **TRANSITION SLIDE** (recap Point 2, preview Point 3)
   - Point 3: Problem + Agitate + Solve + Expand

   For HEAR Framework (4×3 + 2 transitions = 14 slides):
   - Point 1: Hook + Empathy + Authority + Roadmap
   - **TRANSITION SLIDE** (recap Point 1, preview Point 2)
   - Point 2: Hook + Empathy + Authority + Roadmap
   - **TRANSITION SLIDE** (recap Point 2, preview Point 3)
   - Point 3: Hook + Empathy + Authority + Roadmap

   For WWH Framework (3×3 + 2 transitions = 11 slides):
   - Point 1: What + Why + How
   - **TRANSITION SLIDE** (recap Point 1, preview Point 2)
   - Point 2: What + Why + How
   - **TRANSITION SLIDE** (recap Point 2, preview Point 3)
   - Point 3: What + Why + How

6. 3C FRAMEWORK - CONCLUSION (3 slides):
   - CONCISE: Brief summary of key insights
   - CLEAR: One main takeaway message
   - COMPELLING: Final impact and why it matters

7. ACTION & CTA (2 slides):
   - ACTION ITEMS: Specific next steps
   - CALL TO ACTION: Final compelling CTA

CRITICAL STRUCTURE REQUIREMENTS:
- Each framework step for each point must be its own slide
- Include exactly 2 transition slides between the 3 main points
- Hook slide must come after ABT intro but before main points
- Transition slides should briefly recap previous point and create curiosity for next point
- This creates a comprehensive, detailed presentation with smooth flow

OUTPUT FORMAT:
Return a JSON array of slide objects with this exact structure:
[
  {
    "title": "slide title",
    "content": "detailed slide content in markdown format with proper headings and bullet points",
    "narration": "comprehensive word-for-word speaker notes that the presenter will read. Include smooth transitions, explanations of each point, and engaging delivery. Make it conversational and complete enough that the presenter never gets stuck.",
    "slideType": "TITLE|INTRO|CONTENT|CONCLUSION|NEXT_STEPS",
    "layout": "TEXT_ONLY|TITLE_COVER|TEXT_IMAGE_LEFT|TEXT_IMAGE_RIGHT|IMAGE_FULL|BULLETS_IMAGE|TWO_COLUMN|IMAGE_BACKGROUND|TIMELINE|QUOTE_LARGE|STATISTICS_GRID|IMAGE_OVERLAY|SPLIT_CONTENT|COMPARISON",
    "order": 1
  }
]

CONTENT REQUIREMENTS:
- Follow the EXACT structure above - do not deviate from the slide count or framework order
- Each main point gets the full selected framework treatment (3-4 slides per point)
- Use ABT framework for introduction (AND-BUT-THEREFORE)
- Use 3C framework for conclusion (CONCISE-CLEAR-COMPELLING)
- Create detailed, substantive content for each slide
- Use markdown formatting appropriately
- Make content actionable and valuable
- Ensure smooth transitions between all framework sections
- Each slide should have focused, comprehensive content - not just bullet points

HEADLINE/TITLE REQUIREMENTS - MAKE THEM AUDIENCE-FOCUSED:
- Transform framework-focused titles into audience curiosity drivers
- Use questions the audience is asking: "But what if everyone else is doing it wrong?"
- Address myths they believe: "The myth that perfect planning leads to success"
- Acknowledge their thoughts: "You're probably thinking this sounds too risky..."
- Create curiosity gaps: "Here's what nobody tells you about rapid prototyping"
- Make it about THEIR journey, not your framework
- Examples of good audience-focused titles:
  * Instead of "Contrarian Approach" → "What if everything you've been taught is backwards?"
  * Instead of "Problem Identification" → "The hidden problem that's costing you millions"
  * Instead of "Hook - Grab Attention" → "Why your best ideas die in meeting rooms"
  * Instead of "What - The Concept" → "The simple method that changes everything"

CRITICAL AUDIENCE-FOCUSED CONTENT REQUIREMENTS:
Each main point must be structured around clear problem-solution mapping:

1. **PROBLEM RECOGNITION** (Start every framework section with audience pain):
   - "You know that frustrating feeling when..."
   - "Every [role] struggles with..."
   - "The biggest challenge facing [audience] is..."
   - "Here's what keeps [audience] up at night..."

2. **ROOT CAUSE ANALYSIS** (Dig deeper into WHY this problem exists):
   - "The real reason this happens is..."
   - "What most people don't realize is..."
   - "The hidden factor causing this is..."
   - "The system is broken because..."

3. **SOLUTION REVELATION** (Present your framework step as THE solution):
   - "Here's what actually works..."
   - "The breakthrough approach is..."
   - "Instead of [old way], try [new way]..."
   - "The counterintuitive solution is..."

4. **PRACTICAL IMPLEMENTATION** (Show exactly how to apply it):
   - "Here's the step-by-step process..."
   - "In practice, this looks like..."
   - "Tomorrow you can start by..."
   - "The exact method is..."

5. **RESULTS PREVIEW** (Paint a clear picture of success):
   - "When you do this, you'll see..."
   - "The outcome is..."
   - "Imagine having..."
   - "You'll go from [current pain] to [future success]..."

PROBLEM-SOLUTION MAPPING EXAMPLES:
❌ Generic Framework Talk: "Use the Contrarian step to challenge assumptions"
✅ Audience-Focused Problem-Solution:
   - PROBLEM: "You're making decisions based on best practices that worked 10 years ago"
   - ROOT CAUSE: "Because everyone follows the same playbook without questioning if it still works"
   - SOLUTION: "Challenge every 'best practice' with this simple test: show me recent proof"
   - IMPLEMENTATION: "Start by listing your top 3 assumptions, then find data from the last 6 months"
   - RESULTS: "You'll discover which rules still apply and which are holding you back"

NARRATION REQUIREMENTS:
- Write comprehensive, word-for-word speaker notes for each slide
- Include smooth transitions between slides, points, and framework sections
- Explain context and background for each point
- Make narration conversational and engaging
- Provide specific talking points that prevent the presenter from getting stuck
- Include pauses, emphasis, and delivery guidance where helpful
- Match the voice profile tone and style
- Make sure the presenter sounds confident and knowledgeable
- Ensure narration flows logically through ABT → Selected Framework × 3 → 3C → Action/CTA
- **CRITICAL**: Structure narration around the 5-step problem-solution mapping for each framework section:
  1. Start with audience pain/frustration (Problem Recognition)
  2. Explain the deeper reasons (Root Cause Analysis)
  3. Present the framework step as the breakthrough solution (Solution Revelation)
  4. Give specific implementation steps (Practical Implementation)
  5. Paint a clear picture of the successful outcome (Results Preview)
- Use empathetic language that shows understanding of audience struggles
- Make the presenter sound like they're solving real problems, not just teaching frameworks
- Include specific examples and case studies in narration where possible

TRANSITION SLIDE REQUIREMENTS:
- Include transition slides between major framework sections
- Transition slides should have brief content but detailed narration
- Help the presentation flow smoothly from one concept to the next
- Use engaging narration to maintain audience attention during transitions

TITLE SLIDE REQUIREMENTS:
- Content should include the presentation title and brief subtitle that reflects the angle
- Narration should welcome the audience and set up the unique angle being presented

IMPORTANT: Return ONLY the JSON array, no additional text or explanations.`

export const CONTENT_ENHANCEMENT_GUIDELINES = {
  title: "Make titles compelling and specific",
  intro: "Hook the audience immediately and set clear expectations",
  content: "Provide valuable insights with concrete examples and actionable takeaways",
  conclusion: "Summarize key points and reinforce the main message",
  nextSteps: "Provide clear, actionable steps the audience can take immediately"
}