import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSlideContent } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { presentationId, prompt, slideType, insertAfterOrder } = body

    // Get the presentation details
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
    })

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      )
    }

    // Generate slide content
    const slideContents = await generateSlideContent(
      `${presentation.prompt}\n\nSpecific request: ${prompt}`,
      presentation.title
    )

    // Find the appropriate slide content based on type
    let selectedSlide = slideContents.find(slide => slide.slideType === slideType)
    
    // If no matching type found, create a generic content slide
    if (!selectedSlide) {
      selectedSlide = {
        title: extractTitleFromPrompt(prompt),
        content: generateCustomSlideContent(prompt),
        slideType: slideType as any,
        order: 1,
      }
    }

    // Update orders for slides that come after the insertion point
    await prisma.slide.updateMany({
      where: {
        presentationId,
        order: {
          gt: insertAfterOrder,
        },
      },
      data: {
        order: {
          increment: 1,
        },
      },
    })

    // Create the new slide
    const newSlide = await prisma.slide.create({
      data: {
        title: selectedSlide.title,
        content: selectedSlide.content,
        slideType: selectedSlide.slideType,
        order: insertAfterOrder + 1,
        presentationId,
      },
    })

    return NextResponse.json(newSlide)
  } catch (error) {
    console.error('Error generating slide:', error)
    return NextResponse.json(
      { error: 'Failed to generate slide' },
      { status: 500 }
    )
  }
}

function extractTitleFromPrompt(prompt: string): string {
  // Extract the first few words as title
  const words = prompt.trim().split(/\s+/)
  const title = words.slice(0, 4).join(' ')
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
}

function generateCustomSlideContent(prompt: string): string {
  const title = extractTitleFromPrompt(prompt)
  
  return `## ${title}

### Overview
${prompt}

### Key Points
- Main concept and its importance
- Practical applications and use cases
- Benefits and expected outcomes
- Implementation considerations

### Details
This slide addresses the specific request: "${prompt}"

The content is designed to provide comprehensive coverage of the topic while maintaining focus on practical, actionable insights that align with the overall presentation objectives.

### Next Considerations
- How this relates to other presentation topics
- Action items for the audience
- Follow-up questions or discussion points`
}