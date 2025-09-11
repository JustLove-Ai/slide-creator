import OpenAI from 'openai'
import { 
  SYSTEM_PROMPT,
  SLIDE_GENERATION_PROMPT,
  SLIDE_REGENERATION_PROMPT,
  SIMPLE_OUTLINE_PROMPT,
  SLIDES_FROM_OUTLINE_PROMPT,
  buildVoiceContextPrompt,
  buildFrameworkPrompt,
  getDefaultLayoutForSlideType,
  type VoiceProfile
} from './prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface SlideContent {
  title: string
  content: string
  slideType: 'TITLE' | 'INTRO' | 'CONTENT' | 'CONCLUSION' | 'NEXT_STEPS'
  layout: 'TEXT_ONLY' | 'TITLE_COVER' | 'TITLE_ONLY' | 'TEXT_IMAGE_LEFT' | 'TEXT_IMAGE_RIGHT' | 'IMAGE_FULL' | 'BULLETS_IMAGE' | 'TWO_COLUMN' | 'IMAGE_BACKGROUND' | 'TIMELINE' | 'QUOTE_LARGE' | 'STATISTICS_GRID' | 'IMAGE_OVERLAY' | 'SPLIT_CONTENT' | 'COMPARISON'
  order: number
  narration?: string
}

export interface SimpleOutlineItem {
  title: string
  mainTopic: string
  slideType: 'TITLE' | 'INTRO' | 'CONTENT' | 'CONCLUSION' | 'NEXT_STEPS'
  order: number
}

export async function generateSlideContent(
  prompt: string, 
  presentationTitle: string,
  voiceProfile?: any,
  framework?: any
): Promise<SlideContent[]> {
  try {
    // Build voice context from structured voice profile
    const voiceContext = buildVoiceContextPrompt(voiceProfile)
    
    // Build framework context if provided
    const frameworkContext = buildFrameworkPrompt(framework)
    
    // Construct the final prompt
    const finalPrompt = SLIDE_GENERATION_PROMPT
      .replace('{topic}', prompt)
      .replace('{title}', presentationTitle)
      .replace('{voiceContext}', voiceContext)
      .replace('{frameworkContext}', frameworkContext)
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })
    
    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }
    
    // Parse JSON response - handle both raw JSON and markdown code blocks
    let slides: SlideContent[]
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText
      const codeBlockMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1]
      }
      
      slides = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText)
      throw new Error('Invalid response format from AI')
    }
    
    // Validate and ensure proper slide structure
    return validateAndFixSlides(slides)
    
  } catch (error) {
    console.error('Error generating slide content:', error)
    
    // Fallback to basic slides if OpenAI fails
    if (error instanceof Error && error.message.includes('API')) {
      console.warn('OpenAI API failed, using fallback content')
      return generateFallbackSlides(prompt, presentationTitle, framework)
    }
    
    throw error
  }
}

export async function generateSimpleOutline(
  prompt: string, 
  presentationTitle: string,
  voiceProfile?: any,
  framework?: any
): Promise<SimpleOutlineItem[]> {
  try {
    // Build voice context from structured voice profile
    const voiceContext = buildVoiceContextPrompt(voiceProfile)
    
    // Build framework context if provided
    const frameworkContext = buildFrameworkPrompt(framework)
    
    // Construct the final prompt
    const finalPrompt = SIMPLE_OUTLINE_PROMPT
      .replace('{topic}', prompt)
      .replace('{title}', presentationTitle)
      .replace('{voiceContext}', voiceContext)
      .replace('{frameworkContext}', frameworkContext)
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })
    
    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }
    
    // Parse JSON response - handle both raw JSON and markdown code blocks
    let outline: SimpleOutlineItem[]
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText
      const codeBlockMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1]
      }
      
      outline = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse OpenAI outline response:', responseText)
      throw new Error('Invalid outline format from AI')
    }
    
    // Validate and ensure proper outline structure
    return validateAndFixSimpleOutline(outline)
    
  } catch (error) {
    console.error('Error generating outline:', error)
    
    // Fallback to basic outline if OpenAI fails
    if (error instanceof Error && error.message.includes('API')) {
      console.warn('OpenAI API failed, using fallback outline')
      return generateFallbackSimpleOutline(prompt, presentationTitle, framework)
    }
    
    throw error
  }
}

export async function generateSlidesFromSimpleOutline(
  outline: SimpleOutlineItem[],
  presentationTitle: string,
  voiceProfile?: any
): Promise<SlideContent[]> {
  try {
    // Build voice context from structured voice profile
    const voiceContext = buildVoiceContextPrompt(voiceProfile)
    
    // Construct the final prompt
    const finalPrompt = SLIDES_FROM_OUTLINE_PROMPT
      .replace('{outline}', JSON.stringify(outline, null, 2))
      .replace('{title}', presentationTitle)
      .replace('{voiceContext}', voiceContext)
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 6000
    })
    
    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }
    
    // Parse JSON response - handle both raw JSON and markdown code blocks
    let slides: SlideContent[]
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText
      const codeBlockMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1]
      }
      
      slides = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse OpenAI slides response:', responseText)
      throw new Error('Invalid slides format from AI')
    }
    
    // Validate and ensure proper slide structure
    return validateAndFixSlides(slides)
    
  } catch (error) {
    console.error('Error generating slides from outline:', error)
    throw error
  }
}

function validateAndFixSimpleOutline(outline: SimpleOutlineItem[]): SimpleOutlineItem[] {
  return outline.map((item, index) => ({
    ...item,
    order: item.order || index + 1,
    slideType: item.slideType || 'CONTENT',
    mainTopic: item.mainTopic || 'Main topic for this slide'
  }))
}

function generateFallbackSimpleOutline(prompt: string, title: string, framework?: any): SimpleOutlineItem[] {
  const outline: SimpleOutlineItem[] = [
    {
      title,
      mainTopic: `Title slide for presentation about ${prompt}`,
      slideType: 'TITLE',
      order: 1
    },
    {
      title: 'Overview',
      mainTopic: `Introduction and overview of ${prompt}`,
      slideType: 'INTRO',
      order: 2
    },
    {
      title: 'Main Content',
      mainTopic: `Key points and details about ${prompt}`,
      slideType: 'CONTENT',
      order: 3
    },
    {
      title: 'Conclusion',
      mainTopic: `Summary and takeaways from ${prompt}`,
      slideType: 'CONCLUSION',
      order: 4
    }
  ]
  
  return outline
}

function validateAndFixSlides(slides: SlideContent[]): SlideContent[] {
  return slides.map((slide, index) => ({
    ...slide,
    order: slide.order || index + 1,
    layout: slide.layout || getDefaultLayoutForSlideType(slide.slideType),
    slideType: slide.slideType || 'CONTENT'
  }))
}

function generateFallbackSlides(prompt: string, title: string, framework?: any): SlideContent[] {
  const slides: SlideContent[] = [
    {
      title,
      content: `# ${title}`,
      slideType: 'TITLE',
      layout: 'TITLE_COVER',
      order: 1
    },
    {
      title: 'Overview',
      content: `## Overview\n\nThis presentation covers key aspects of: ${prompt}\n\n### Key Topics\n- Introduction to main concepts\n- Detailed analysis\n- Practical applications\n- Next steps`,
      slideType: 'INTRO',
      layout: 'TEXT_ONLY',
      order: 2
    },
    {
      title: 'Main Content',
      content: `## Main Content\n\n### Key Points\n- Important concept 1\n- Important concept 2\n- Important concept 3\n\n### Details\nDetailed exploration of ${prompt} and its implications.`,
      slideType: 'CONTENT',
      layout: 'TEXT_IMAGE_RIGHT',
      order: 3
    },
    {
      title: 'Conclusion',
      content: `## Conclusion\n\n### Summary\nWe have explored the key aspects of ${prompt}.\n\n### Key Takeaways\n- Main insight 1\n- Main insight 2\n- Path forward`,
      slideType: 'CONCLUSION',
      layout: 'TEXT_ONLY',
      order: 4
    }
  ]
  
  return slides
}


export async function regenerateSlideContent(
  originalSlide: SlideContent,
  prompt: string,
  additionalContext?: string,
  voiceProfile?: any
): Promise<SlideContent> {
  try {
    // Build voice context
    const voiceContext = buildVoiceContextPrompt(voiceProfile)
    
    // Construct the regeneration prompt
    const finalPrompt = SLIDE_REGENERATION_PROMPT
      .replace('{originalTitle}', originalSlide.title)
      .replace('{originalContent}', originalSlide.content)
      .replace('{slideType}', originalSlide.slideType)
      .replace('{layout}', originalSlide.layout)
      .replace('{topic}', prompt)
      .replace('{additionalContext}', additionalContext || 'None')
      .replace('{voiceContext}', voiceContext)
      .replace('{order}', originalSlide.order.toString())
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1500
    })
    
    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }
    
    // Parse JSON response
    let enhancedSlide: SlideContent
    try {
      enhancedSlide = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse regeneration response:', responseText)
      throw new Error('Invalid response format from AI')
    }
    
    // Ensure the slide maintains its order and basic structure
    return {
      ...enhancedSlide,
      order: originalSlide.order
    }
    
  } catch (error) {
    console.error('Error regenerating slide content:', error)
    
    // Fallback to enhanced version of original slide
    return {
      ...originalSlide,
      title: `Enhanced: ${originalSlide.title}`,
      content: originalSlide.content + '\n\n*Content enhanced with additional context and improvements.*'
    }
  }
}

