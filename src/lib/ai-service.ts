export interface SlideContent {
  title: string
  content: string
  slideType: 'TITLE' | 'INTRO' | 'CONTENT' | 'CONCLUSION' | 'NEXT_STEPS'
  layout: 'TEXT_ONLY' | 'TITLE_COVER' | 'TEXT_IMAGE_LEFT' | 'TEXT_IMAGE_RIGHT' | 'IMAGE_FULL' | 'BULLETS_IMAGE' | 'TWO_COLUMN' | 'IMAGE_BACKGROUND'
  order: number
}

export async function generateSlideContent(prompt: string, presentationTitle: string): Promise<SlideContent[]> {
  try {
    const slides: SlideContent[] = [
      {
        title: presentationTitle,
        content: `# ${presentationTitle}\n\nA comprehensive presentation covering key insights and actionable strategies.`,
        slideType: 'TITLE',
        layout: 'TITLE_COVER',
        order: 1
      },
      {
        title: 'Introduction',
        content: generateIntroContent(prompt),
        slideType: 'INTRO',
        layout: 'TEXT_ONLY',
        order: 2
      }
    ]

    const contentSlides = generateContentSlides(prompt)
    slides.push(...contentSlides.map((slide, index) => ({
      ...slide,
      order: index + 3
    })))

    slides.push({
      title: 'Conclusion',
      content: generateConclusionContent(prompt),
      slideType: 'CONCLUSION',
      layout: 'TEXT_ONLY',
      order: slides.length + 1
    })

    slides.push({
      title: 'Next Steps',
      content: generateNextStepsContent(prompt),
      slideType: 'NEXT_STEPS',
      layout: 'BULLETS_IMAGE',
      order: slides.length + 1
    })

    return slides
  } catch (error) {
    console.error('Error generating slide content:', error)
    throw new Error('Failed to generate slide content')
  }
}

function generateIntroContent(prompt: string): string {
  const topics = extractTopics(prompt)
  return `## Welcome & Overview

### Today's Agenda
- ${topics.slice(0, 3).join('\n- ')}

### Why This Matters
This presentation addresses critical challenges and opportunities in our field, providing actionable insights for immediate implementation.

### What You'll Learn
By the end of this session, you'll have a clear understanding of key concepts and practical strategies to move forward.`
}

function generateContentSlides(prompt: string): Omit<SlideContent, 'order'>[] {
  const topics = extractTopics(prompt)
  const layouts = ['TEXT_IMAGE_LEFT', 'TEXT_IMAGE_RIGHT', 'BULLETS_IMAGE', 'TWO_COLUMN'] as const
  
  return topics.slice(0, 4).map((topic, index) => ({
    title: topic,
    content: `## ${topic}

### Key Points
- ${generateKeyPoints(topic, prompt).join('\n- ')}

### Details
${generateDetailedContent(topic, prompt)}

### Why It Matters
This concept is crucial because it directly impacts our ability to achieve our objectives and create meaningful results.`,
    slideType: 'CONTENT' as const,
    layout: layouts[index % layouts.length]
  }))
}

function generateConclusionContent(prompt: string): string {
  return `## Key Takeaways

### Summary of Main Points
- We've explored the fundamental concepts and their applications
- Discussed practical strategies for implementation
- Identified key opportunities for growth and improvement

### Remember This
The insights shared today provide a foundation for moving forward with confidence and clarity.

### Questions & Discussion
Let's discuss how these concepts apply to your specific situation.`
}

function generateNextStepsContent(prompt: string): string {
  return `## Action Items

### Immediate Actions (Next 7 Days)
1. Review and prioritize the key concepts discussed
2. Identify specific areas for immediate implementation
3. Gather necessary resources and stakeholders

### Short-term Goals (Next 30 Days)
1. Develop detailed implementation plans
2. Begin pilot programs or test implementations
3. Establish metrics for measuring success

### Long-term Vision (Next 90 Days)
1. Full implementation of strategies
2. Regular review and optimization
3. Scale successful approaches across the organization

### Resources & Support
- Documentation and reference materials
- Follow-up sessions and check-ins
- Community and peer support networks`
}

function extractTopics(prompt: string): string[] {
  const commonKeywords = ['about', 'on', 'for', 'with', 'in', 'to', 'and', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being']
  
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const topics: string[] = []
  
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/).filter(word => 
      word.length > 3 && !commonKeywords.includes(word.toLowerCase())
    )
    
    if (words.length >= 2) {
      const topic = words.slice(0, 3).join(' ').replace(/[^\w\s]/g, '').trim()
      if (topic && !topics.some(existing => existing.toLowerCase().includes(topic.toLowerCase()))) {
        topics.push(topic)
      }
    }
  })
  
  if (topics.length < 3) {
    topics.push(
      'Key Concepts and Fundamentals',
      'Implementation Strategies',
      'Best Practices and Guidelines',
      'Common Challenges and Solutions'
    )
  }
  
  return topics.slice(0, 4)
}

function generateKeyPoints(topic: string, prompt: string): string[] {
  return [
    `Understanding the core principles of ${topic.toLowerCase()}`,
    `Practical applications and real-world examples`,
    `Benefits and expected outcomes`,
    `Implementation considerations and requirements`
  ]
}

function generateDetailedContent(topic: string, prompt: string): string {
  return `This section covers the essential aspects of ${topic.toLowerCase()}, providing both theoretical foundation and practical guidance.

The content builds upon established best practices while adapting to current needs and constraints. Key considerations include resource allocation, timing, stakeholder engagement, and measurable outcomes.

Success in this area requires a systematic approach combined with flexibility to adapt as circumstances change.`
}

export async function regenerateSlideContent(
  originalSlide: SlideContent,
  prompt: string,
  additionalContext?: string
): Promise<SlideContent> {
  const enhancedPrompt = additionalContext 
    ? `${prompt}\n\nAdditional context: ${additionalContext}`
    : prompt

  switch (originalSlide.slideType) {
    case 'TITLE':
      return {
        ...originalSlide,
        content: `# ${originalSlide.title}\n\nAn enhanced presentation with deeper insights and refined strategies.`,
        title: originalSlide.title
      }
    case 'INTRO':
      return {
        ...originalSlide,
        content: generateIntroContent(enhancedPrompt),
        title: 'Enhanced Introduction'
      }
    case 'CONTENT':
      return {
        ...originalSlide,
        content: generateEnhancedContentSlide(originalSlide.title, enhancedPrompt),
        title: `Enhanced: ${originalSlide.title}`
      }
    case 'CONCLUSION':
      return {
        ...originalSlide,
        content: generateConclusionContent(enhancedPrompt),
        title: 'Enhanced Conclusion'
      }
    case 'NEXT_STEPS':
      return {
        ...originalSlide,
        content: generateNextStepsContent(enhancedPrompt),
        title: 'Enhanced Next Steps'
      }
    default:
      return originalSlide
  }
}

function generateEnhancedContentSlide(topic: string, prompt: string): string {
  return `## ${topic} - Enhanced Version

### Advanced Concepts
- ${generateKeyPoints(topic, prompt).join('\n- ')}

### Deep Dive Analysis
${generateDetailedContent(topic, prompt)}

### Case Studies and Examples
Real-world applications demonstrate the effectiveness of these approaches across various contexts and industries.

### Advanced Implementation
This enhanced version includes additional considerations for complex scenarios and advanced use cases.`
}