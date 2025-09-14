import OpenAI from 'openai'
import {
  SYSTEM_PROMPT,
  SLIDE_GENERATION_PROMPT,
  SLIDE_REGENERATION_PROMPT,
  SIMPLE_OUTLINE_PROMPT,
  SLIDES_FROM_OUTLINE_PROMPT,
  GENERATE_ANGLES_PROMPT,
  PRESENTATION_FROM_ANGLE_PROMPT,
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

export interface GeneratedAngle {
  frameworkType: 'CUB' | 'PASE' | 'HEAR'
  angleTitle: string
  description: string
  keyPoints: string[]
  frameworkId: string
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
  const validSlideTypes = ['TITLE', 'INTRO', 'CONTENT', 'CONCLUSION', 'NEXT_STEPS']

  return slides.map((slide, index) => {
    // Ensure slideType is valid
    let slideType = slide.slideType || 'CONTENT'
    if (!validSlideTypes.includes(slideType)) {
      // Map invalid slide types to valid ones based on position and content
      if (index === 0) {
        slideType = 'TITLE'
      } else if (index === 1 || slide.title.toLowerCase().includes('intro')) {
        slideType = 'INTRO'
      } else if (index >= slides.length - 2 && (slide.title.toLowerCase().includes('conclusion') || slide.title.toLowerCase().includes('summary'))) {
        slideType = 'CONCLUSION'
      } else if (index === slides.length - 1 || slide.title.toLowerCase().includes('next') || slide.title.toLowerCase().includes('action')) {
        slideType = 'NEXT_STEPS'
      } else {
        slideType = 'CONTENT'
      }
    }

    return {
      ...slide,
      order: slide.order || index + 1,
      layout: slide.layout || getDefaultLayoutForSlideType(slideType),
      slideType
    }
  })
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


export async function generateAnglesFromIdea(
  title: string,
  description: string,
  frameworks: any[]
): Promise<GeneratedAngle[]> {
  try {
    // Find the angle framework IDs
    const cubFramework = frameworks.find(f => f.name.includes('CUB Framework'))
    const paseFramework = frameworks.find(f => f.name.includes('PASE Framework'))
    const hearFramework = frameworks.find(f => f.name.includes('HEAR Framework'))

    // Construct the prompt
    const finalPrompt = GENERATE_ANGLES_PROMPT
      .replace('{title}', title)
      .replace('{description}', description)

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response - handle both raw JSON and markdown code blocks
    let angles: GeneratedAngle[]
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText
      const codeBlockMatch = responseText.match(/```json\s*\n?([\s\S]*?)\n?```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1]
      }

      angles = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse OpenAI angles response:', responseText)
      throw new Error('Invalid angles format from AI')
    }

    // Update with actual framework IDs
    angles = angles.map(angle => ({
      ...angle,
      frameworkId: angle.frameworkType === 'CUB' ? (cubFramework?.id || '') :
                   angle.frameworkType === 'PASE' ? (paseFramework?.id || '') :
                   angle.frameworkType === 'HEAR' ? (hearFramework?.id || '') : ''
    }))

    return angles

  } catch (error) {
    console.error('Error generating angles from idea:', error)

    // Fallback angles if OpenAI fails
    return generateFallbackAngles(title, description, frameworks)
  }
}

export async function generatePresentationFromAngle(
  idea: { title: string; description: string },
  selectedAngle: GeneratedAngle,
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
    const finalPrompt = PRESENTATION_FROM_ANGLE_PROMPT
      .replace('{ideaTitle}', idea.title)
      .replace('{ideaDescription}', idea.description)
      .replace('{frameworkType}', selectedAngle.frameworkType)
      .replace('{angleTitle}', selectedAngle.angleTitle)
      .replace('{angleDescription}', selectedAngle.description)
      .replace('{keyPoints}', selectedAngle.keyPoints.join(', '))
      .replace('{presentationTitle}', presentationTitle)
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
      max_tokens: 8000
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
      console.error('Failed to parse OpenAI presentation response:', responseText)
      throw new Error('Invalid presentation format from AI')
    }

    // Validate and ensure proper slide structure
    return validateAndFixSlides(slides)

  } catch (error) {
    console.error('Error generating presentation from angle:', error)

    // Fallback to basic slides if OpenAI fails
    if (error instanceof Error && error.message.includes('API')) {
      console.warn('OpenAI API failed, using fallback content')
      return generateFallbackSlidesWithNarration(idea, selectedAngle, presentationTitle, framework)
    }

    throw error
  }
}

function generateFallbackAngles(title: string, description: string, frameworks: any[]): GeneratedAngle[] {
  const cubFramework = frameworks.find(f => f.name.includes('CUB Framework'))
  const paseFramework = frameworks.find(f => f.name.includes('PASE Framework'))
  const hearFramework = frameworks.find(f => f.name.includes('HEAR Framework'))

  return [
    {
      frameworkType: 'CUB',
      angleTitle: `Contrarian Approach to ${title}`,
      description: `Challenge conventional wisdom about ${title} with a fresh perspective that provides practical value.`,
      keyPoints: ['Challenge common beliefs', 'Provide practical alternatives', 'Connect to bigger trends'],
      frameworkId: cubFramework?.id || ''
    },
    {
      frameworkType: 'PASE',
      angleTitle: `Solving the ${title} Problem`,
      description: `Identify and solve the key problems related to ${title} with actionable solutions.`,
      keyPoints: ['Identify core problems', 'Show consequences of inaction', 'Present effective solutions'],
      frameworkId: paseFramework?.id || ''
    },
    {
      frameworkType: 'HEAR',
      angleTitle: `Your Guide to ${title}`,
      description: `Build trust and provide clear guidance on mastering ${title} with empathy and authority.`,
      keyPoints: ['Hook attention immediately', 'Show understanding of struggles', 'Provide clear roadmap'],
      frameworkId: hearFramework?.id || ''
    }
  ]
}

function generateFallbackSlidesWithNarration(
  idea: { title: string; description: string },
  selectedAngle: GeneratedAngle,
  presentationTitle: string,
  framework?: any
): SlideContent[] {
  const slides: SlideContent[] = [
    {
      title: presentationTitle,
      content: `# ${presentationTitle}\n\n## ${selectedAngle.angleTitle}`,
      narration: `Welcome everyone, and thank you for joining today's presentation. I'm excited to share with you "${presentationTitle}" - and we're going to approach this topic from a unique angle: ${selectedAngle.angleTitle}. ${selectedAngle.description} Let's dive in.`,
      slideType: 'TITLE',
      layout: 'TITLE_COVER',
      order: 1
    },
    {
      title: 'Overview',
      content: `## Overview\n\nToday we'll explore:\n\n${selectedAngle.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}`,
      narration: `Before we get into the details, let me give you a roadmap of what we'll cover today. We have three main areas to explore: ${selectedAngle.keyPoints.join(', ')}. Each of these builds on the previous one to give you a complete understanding of ${idea.title}.`,
      slideType: 'INTRO',
      layout: 'BULLETS_IMAGE',
      order: 2
    },
    {
      title: selectedAngle.keyPoints[0] || 'Main Point',
      content: `## ${selectedAngle.keyPoints[0] || 'Main Point'}\n\n### Key Insights\n- Important concept related to ${idea.title}\n- How this applies in real situations\n- Why this matters for your success\n\n### Practical Applications\nSpecific ways to implement this in your context.`,
      narration: `Let's start with our first key point: ${selectedAngle.keyPoints[0] || 'Main Point'}. This is fundamental to understanding ${idea.title}. Based on our original concept - ${idea.description} - we can see that this point is crucial because it sets the foundation for everything else we'll discuss. Let me explain how this applies in real situations and why it matters for your success.`,
      slideType: 'CONTENT',
      layout: 'TEXT_IMAGE_RIGHT',
      order: 3
    },
    {
      title: 'Next Steps',
      content: `## Next Steps\n\n### Immediate Actions\n1. Apply the first key insight\n2. Implement the practical applications\n3. Monitor your progress\n\n### Long-term Strategy\nContinue developing your understanding of ${idea.title}`,
      narration: `As we wrap up today's session, I want to leave you with clear next steps. Don't let this information just sit in your notes - take action. Start with applying that first key insight we discussed. Then implement the practical applications in your own context. Monitor your progress and adjust as needed. Remember, mastering ${idea.title} is a journey, and today's presentation has given you the roadmap to get started. Thank you for your attention, and I'm happy to take any questions.`,
      slideType: 'NEXT_STEPS',
      layout: 'BULLETS_IMAGE',
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

