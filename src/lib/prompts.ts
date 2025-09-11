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

export const CONTENT_ENHANCEMENT_GUIDELINES = {
  title: "Make titles compelling and specific",
  intro: "Hook the audience immediately and set clear expectations",
  content: "Provide valuable insights with concrete examples and actionable takeaways",
  conclusion: "Summarize key points and reinforce the main message",
  nextSteps: "Provide clear, actionable steps the audience can take immediately"
}