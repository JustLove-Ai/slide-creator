'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateSimpleOutline, generateSlidesFromSimpleOutline, generateSlideContent, regenerateSlideContent, generateAnglesFromIdea, generatePresentationFromAngle, type GeneratedAngle } from '@/lib/ai-service'

// Helper function to get placeholder images for layouts that need images
function getPlaceholderImageForLayout(layout: string): string | null {
  const imageLayouts = [
    'TEXT_IMAGE_LEFT', 'TEXT_IMAGE_RIGHT', 'IMAGE_FULL', 'BULLETS_IMAGE', 
    'IMAGE_BACKGROUND', 'IMAGE_OVERLAY', 'SPLIT_CONTENT', 'COMPARISON'
  ]
  
  if (imageLayouts.includes(layout)) {
    // Using a placeholder image service
    return 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80'
  }
  
  return null
}


// Theme presets mapping - matches BackgroundSettings.tsx
const themePresets = {
  light: {
    backgroundColor: '#FFFFFF',
    textColor: '#374151', 
    headingColor: '#111827'
  },
  dark: {
    backgroundColor: '#1F2937',
    textColor: '#D1D5DB',
    headingColor: '#F9FAFB'
  },
  midnight: {
    backgroundColor: '#0F0F23',
    textColor: '#C7D2FE',
    headingColor: '#E0E7FF'
  },
  forest: {
    backgroundColor: '#064E3B',
    textColor: '#A7F3D0',
    headingColor: '#D1FAE5'
  },
  sunset: {
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    headingColor: '#78350F'
  },
  ocean: {
    backgroundColor: '#F0F9FF',
    textColor: '#0C4A6E',
    headingColor: '#0B4B66'
  },
  corporate: {
    backgroundColor: '#F9FAFB',
    textColor: '#4B5563',
    headingColor: '#1F2937'
  }
}

function getThemeDefaults(presentation: any) {
  // Determine theme based on presentation colors
  const { primaryColor, secondaryColor } = presentation
  
  // Match against known theme presets
  if (primaryColor === '#3B82F6' && secondaryColor === '#1E40AF') {
    return themePresets.light
  } else if (primaryColor === '#60A5FA' && secondaryColor === '#93C5FD') {
    return themePresets.dark
  } else if (primaryColor === '#A855F7' && secondaryColor === '#C084FC') {
    return themePresets.midnight
  } else if (primaryColor === '#10B981' && secondaryColor === '#34D399') {
    return themePresets.forest
  } else if (primaryColor === '#F59E0B' && secondaryColor === '#EF4444') {
    return themePresets.sunset
  } else if (primaryColor === '#0EA5E9' && secondaryColor === '#0284C7') {
    return themePresets.ocean
  } else if (primaryColor === '#374151' && secondaryColor === '#6B7280') {
    return themePresets.corporate
  }
  
  // Default to light theme if no match found
  return themePresets.light
}

export async function createSlide(formData: FormData) {
  try {
    const presentationId = formData.get('presentationId') as string
    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const slideType = formData.get('slideType') as string
    const layout = formData.get('layout') as string
    const afterOrder = parseInt(formData.get('order') as string)

    // Fetch presentation to get theme information
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
      select: {
        primaryColor: true,
        secondaryColor: true,
        fontFamily: true,
        theme: true
      }
    })

    if (!presentation) {
      throw new Error('Presentation not found')
    }

    // The new slide should be placed at the position specified (no extra +1 needed)
    const newOrder = afterOrder

    // Get theme defaults based on presentation colors
    const themeDefaults = getThemeDefaults(presentation)

    // Use a transaction to avoid unique constraint conflicts
    const result = await prisma.$transaction(async (tx) => {
      // Get all slides that need to be shifted (order >= newOrder)
      const slidesToShift = await tx.slide.findMany({
        where: {
          presentationId,
          order: { gte: newOrder }
        },
        select: { id: true, order: true },
        orderBy: { order: 'desc' } // Process from highest to lowest to avoid conflicts
      })

      // Shift slides one by one from highest order to lowest
      for (const slide of slidesToShift) {
        await tx.slide.update({
          where: { id: slide.id },
          data: { order: slide.order + 1 }
        })
      }

      // Create the new slide at the desired position
      const newSlide = await tx.slide.create({
        data: {
          title,
          content,
          slideType: slideType as any,
          layout: (layout || 'TEXT_ONLY') as any,
          order: newOrder,
          presentationId,
          backgroundColor: themeDefaults.backgroundColor,
          textColor: themeDefaults.textColor,
          headingColor: themeDefaults.headingColor,
        },
      })

      return newSlide
    })

    revalidatePath(`/presentations/${presentationId}`)
    return { success: true, slide: result }
  } catch (error) {
    console.error('Error creating slide:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create slide' }
  }
}

export async function updateSlide(formData: FormData) {
  try {
    const slideId = formData.get('slideId') as string
    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const narration = formData.get('narration') as string
    const annotations = formData.get('annotations') as string
    const layout = formData.get('layout') as string
    const imageUrl = formData.get('imageUrl') as string
    const backgroundColor = formData.get('backgroundColor') as string
    const textColor = formData.get('textColor') as string
    const headingColor = formData.get('headingColor') as string
    const textAlign = formData.get('textAlign') as string
    const showTitle = formData.get('showTitle') as string
    const showContent = formData.get('showContent') as string

    const slide = await prisma.slide.update({
      where: { id: slideId },
      data: {
        title,
        content,
        narration: narration || null,
        annotations: annotations || null,
        layout: layout as any,
        imageUrl: imageUrl || null,
        backgroundColor: backgroundColor || null,
        textColor: textColor || null,
        headingColor: headingColor || null,
        textAlign: (textAlign as any) || 'LEFT',
        showTitle: showTitle ? showTitle === 'true' : true,
        showContent: showContent ? showContent === 'true' : true,
      },
      include: {
        presentation: true
      }
    })

    revalidatePath(`/presentations/${slide.presentationId}`)
    return { success: true, slide }
  } catch (error) {
    console.error('Error updating slide:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update slide' }
  }
}

export async function duplicateSlide(slideId: string) {
  try {
    const originalSlide = await prisma.slide.findUnique({
      where: { id: slideId },
      include: {
        presentation: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            fontFamily: true,
            theme: true
          }
        }
      }
    })

    if (!originalSlide) {
      throw new Error('Slide not found')
    }

    // Get theme defaults based on presentation colors
    const themeDefaults = getThemeDefaults(originalSlide.presentation)

    // Use a transaction to avoid unique constraint conflicts
    const result = await prisma.$transaction(async (tx) => {
      // Get all slides that need to be shifted (order > originalSlide.order)
      const slidesToShift = await tx.slide.findMany({
        where: {
          presentationId: originalSlide.presentationId,
          order: { gt: originalSlide.order }
        },
        select: { id: true, order: true },
        orderBy: { order: 'desc' } // Process from highest to lowest to avoid conflicts
      })

      // Shift slides one by one from highest order to lowest
      for (const slide of slidesToShift) {
        await tx.slide.update({
          where: { id: slide.id },
          data: { order: slide.order + 1 }
        })
      }

      // Create the duplicate slide right after the original
      const duplicateSlide = await tx.slide.create({
        data: {
          title: originalSlide.title,
          content: originalSlide.content,
          narration: originalSlide.narration,
          slideType: originalSlide.slideType,
          layout: originalSlide.layout,
          order: originalSlide.order + 1,
          presentationId: originalSlide.presentationId,
          backgroundColor: originalSlide.backgroundColor,
          backgroundImage: originalSlide.backgroundImage,
          textColor: originalSlide.textColor,
          headingColor: originalSlide.headingColor,
          imageUrl: originalSlide.imageUrl,
          imagePrompt: originalSlide.imagePrompt,
          imagePosition: originalSlide.imagePosition,
          textAlign: originalSlide.textAlign,
          customStyles: originalSlide.customStyles,
          showTitle: originalSlide.showTitle,
          showContent: originalSlide.showContent,
        },
      })

      return duplicateSlide
    })

    revalidatePath(`/presentations/${originalSlide.presentationId}`)
    return { success: true, slide: result }
  } catch (error) {
    console.error('Error duplicating slide:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to duplicate slide' }
  }
}

export async function deleteSlide(slideId: string) {
  try {
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { presentationId: true }
    })

    if (!slide) {
      throw new Error('Slide not found')
    }

    await prisma.slide.delete({
      where: { id: slideId }
    })

    revalidatePath(`/presentations/${slide.presentationId}`)
    return { success: true }
  } catch (error) {
    console.error('Error deleting slide:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete slide' }
  }
}

export async function updatePresentation(formData: FormData) {
  try {
    const presentationId = formData.get('presentationId') as string
    const updates: any = {}
    
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const primaryColor = formData.get('primaryColor') as string
    const secondaryColor = formData.get('secondaryColor') as string
    const fontFamily = formData.get('fontFamily') as string

    if (title) updates.title = title
    if (description) updates.description = description
    if (primaryColor) updates.primaryColor = primaryColor
    if (secondaryColor) updates.secondaryColor = secondaryColor
    if (fontFamily) updates.fontFamily = fontFamily

    const presentation = await prisma.presentation.update({
      where: { id: presentationId },
      data: updates,
    })

    revalidatePath(`/presentations/${presentationId}`)
    return { success: true, presentation }
  } catch (error) {
    console.error('Error updating presentation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update presentation' }
  }
}

export async function applyThemeToAllSlides(presentationId: string, themeUpdates: {
  backgroundColor?: string
  textColor?: string
  headingColor?: string
}) {
  try {
    const slides = await prisma.slide.findMany({
      where: { presentationId },
      select: { id: true }
    })

    const updatePromises = slides.map(slide => 
      prisma.slide.update({
        where: { id: slide.id },
        data: themeUpdates
      })
    )

    await Promise.all(updatePromises)
    
    revalidatePath(`/presentations/${presentationId}`)
    return { success: true }
  } catch (error) {
    console.error('Error applying theme to all slides:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to apply theme to all slides' }
  }
}

export async function reorderSlides(presentationId: string, slideOrders: { id: string, order: number }[]) {
  try {
    // Use a transaction to update all slide orders atomically
    await prisma.$transaction(
      slideOrders.map(({ id, order }) =>
        prisma.slide.update({
          where: { id },
          data: { order }
        })
      )
    )

    revalidatePath(`/presentations/${presentationId}`)
    return { success: true }
  } catch (error) {
    console.error('Error reordering slides:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reorder slides' }
  }
}

export async function getVoiceProfiles() {
  try {
    const profiles = await prisma.voiceProfile.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    })
    return profiles
  } catch (error) {
    console.error('Error fetching voice profiles:', error)
    return []
  }
}


// Voice Profile CRUD Actions

// Helper function to build structured voice instructions
function buildVoiceInstructions(fields: {
  tone?: string | null
  audience?: string | null
  objective?: string | null
  brandVoice?: string | null
  contentStyle?: string | null
  restrictions?: string | null
  other?: string | null
}): string {
  const sections = []

  if (fields.tone) {
    sections.push(`Tone: ${fields.tone}`)
  }

  if (fields.audience) {
    sections.push(`Target Audience: ${fields.audience}`)
  }

  if (fields.objective) {
    sections.push(`Primary Objective: ${fields.objective}`)
  }

  if (fields.brandVoice) {
    sections.push(`Brand Voice: ${fields.brandVoice}`)
  }

  if (fields.contentStyle) {
    sections.push(`Content Style: ${fields.contentStyle}`)
  }

  if (fields.restrictions) {
    sections.push(`Restrictions: ${fields.restrictions}`)
  }

  if (fields.other) {
    sections.push(`Additional Instructions: ${fields.other}`)
  }

  return sections.length > 0 ? sections.join('\n\n') : 'General purpose voice profile with balanced professional tone.'
}


// Framework CRUD Actions




// Framework Template System
const frameworkTemplates = [
  {
    name: "Hook-Intro-Body-Conclusion Framework",
    description: "Perfect for engaging presentations with strong narrative flow. Uses attention-grabbing hook, clear intro, structured 3-point body (what/why/how for each), and compelling conclusion.",
    isDefault: true,
    slides: [
      {
        title: "Title Slide",
        instructions: "Create a compelling title slide with an intriguing subtitle that hints at the value or transformation the audience will gain.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Hook - Attention Grabber",
        instructions: "Start with a powerful hook: surprising statistic, thought-provoking question, bold statement, or compelling story that directly relates to your topic. Make the audience sit up and pay attention.",
        slideType: "INTRO",
        layout: "QUOTE_LARGE",
        order: 2
      },
      {
        title: "Introduction & Roadmap",
        instructions: "Introduce yourself and the topic. Clearly state what the audience will learn and why it matters to them. Provide a roadmap of the 3 main points you'll cover.",
        slideType: "INTRO",
        layout: "BULLETS_IMAGE",
        order: 3
      },
      {
        title: "Point 1: What (Definition & Scope)",
        instructions: "First main point: Clearly define WHAT the topic is. Provide definitions, scope, key characteristics, and fundamental concepts. Use concrete examples and analogies.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_RIGHT",
        order: 4
      },
      {
        title: "Point 1: Why It Matters",
        instructions: "Explain WHY this first point is important. Include benefits, impact, consequences of ignoring it, and value proposition. Make it personally relevant to the audience.",
        slideType: "CONTENT",
        layout: "TWO_COLUMN",
        order: 5
      },
      {
        title: "Point 1: How to Apply It",
        instructions: "Show HOW to implement or apply this first point. Provide specific, actionable steps, best practices, and practical guidance the audience can use immediately.",
        slideType: "CONTENT",
        layout: "BULLETS_IMAGE",
        order: 6
      },
      {
        title: "Point 2: What (Core Concept)",
        instructions: "Second main point: Define and explain the core concept or component. Build on the first point and show progression. Use visual aids and clear explanations.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_LEFT",
        order: 7
      },
      {
        title: "Point 2: Why It's Critical",
        instructions: "Explain WHY this second point is critical to success. Show the connection to the first point and overall objective. Include evidence, case studies, or proof points.",
        slideType: "CONTENT",
        layout: "STATISTICS_GRID",
        order: 8
      },
      {
        title: "Point 2: How to Implement",
        instructions: "Provide HOW-TO guidance for implementing this second point. Include step-by-step process, tools needed, common pitfalls to avoid, and success metrics.",
        slideType: "CONTENT",
        layout: "TIMELINE",
        order: 9
      },
      {
        title: "Point 3: What (Advanced Application)",
        instructions: "Third main point: Cover the advanced or transformative aspect. Show how this builds on points 1 and 2 to create comprehensive understanding or solution.",
        slideType: "CONTENT",
        layout: "IMAGE_BACKGROUND",
        order: 10
      },
      {
        title: "Point 3: Why It's Transformative",
        instructions: "Explain WHY this third point is transformative or game-changing. Show the compound effect of all three points working together. Paint the vision of success.",
        slideType: "CONTENT",
        layout: "SPLIT_CONTENT",
        order: 11
      },
      {
        title: "Point 3: How to Master It",
        instructions: "Provide HOW-TO guidance for mastering this final point. Include advanced techniques, optimization strategies, and ways to measure and improve results.",
        slideType: "CONTENT",
        layout: "COMPARISON",
        order: 12
      },
      {
        title: "Summary & Key Takeaways",
        instructions: "Summarize the 3 main points and their what/why/how components. Reinforce the key takeaways and how they work together to achieve the desired outcome.",
        slideType: "CONCLUSION",
        layout: "TWO_COLUMN",
        order: 13
      },
      {
        title: "Call to Action & Next Steps",
        instructions: "End with a powerful call to action. Provide specific next steps the audience should take immediately. Include resources, contact information, or ways to continue learning.",
        slideType: "NEXT_STEPS",
        layout: "BULLETS_IMAGE",
        order: 14
      }
    ]
  },
  {
    name: "Russell Brunson Perfect Webinar Framework",
    description: "Based on Russell Brunson's Perfect Webinar script. Designed for high-converting sales presentations and webinars that build authority, provide value, and drive action.",
    isDefault: false,
    slides: [
      {
        title: "Title & Big Promise",
        instructions: "Create a compelling title with a big promise or transformation. Include your name, credentials, and a hook that addresses the audience's biggest desire or problem.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Introduction & Credibility",
        instructions: "Introduce yourself with your origin story that builds credibility and relatability. Explain how you discovered or developed the solution you're about to share.",
        slideType: "INTRO",
        layout: "TEXT_IMAGE_RIGHT",
        order: 2
      },
      {
        title: "What You'll Learn Today",
        instructions: "Present the agenda with 3 main secrets/frameworks you'll reveal. Each should be curiosity-inducing and benefit-driven. Set expectations for transformation.",
        slideType: "INTRO",
        layout: "BULLETS_IMAGE",
        order: 3
      },
      {
        title: "Secret #1: The Big Domino",
        instructions: "Reveal the first secret that acts as the 'big domino' - the one belief that when changed, makes everything else easy. Use the What/Why/How structure with stories and proof.",
        slideType: "CONTENT",
        layout: "IMAGE_BACKGROUND",
        order: 4
      },
      {
        title: "Secret #1: Breaking False Beliefs",
        instructions: "Address and break the false beliefs your audience has about Secret #1. Use stories, social proof, and logical arguments to shift their perspective.",
        slideType: "CONTENT",
        layout: "COMPARISON",
        order: 5
      },
      {
        title: "Secret #1: Implementation Story",
        instructions: "Share a detailed case study or story showing Secret #1 in action. Include specific results, timeline, and how it relates to your audience's situation.",
        slideType: "CONTENT",
        layout: "TIMELINE",
        order: 6
      },
      {
        title: "Secret #2: The Vehicle",
        instructions: "Reveal the second secret about the vehicle or method for achieving the transformation. Explain why this specific approach works when others fail.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_LEFT",
        order: 7
      },
      {
        title: "Secret #2: Why Other Methods Fail",
        instructions: "Explain why other approaches or competitors' methods don't work. Use the 'us vs them' framework to position your method as superior.",
        slideType: "CONTENT",
        layout: "SPLIT_CONTENT",
        order: 8
      },
      {
        title: "Secret #2: Proof of Concept",
        instructions: "Provide proof that Secret #2 works through testimonials, case studies, or data. Show specific examples and results from real people.",
        slideType: "CONTENT",
        layout: "STATISTICS_GRID",
        order: 9
      },
      {
        title: "Secret #3: The Internal Strategy",
        instructions: "Reveal the third secret about the internal strategy or mindset needed for success. This is often the psychological or strategic element.",
        slideType: "CONTENT",
        layout: "QUOTE_LARGE",
        order: 10
      },
      {
        title: "Secret #3: Overcoming Obstacles",
        instructions: "Address the main obstacles or objections people face when implementing Secret #3. Provide solutions and reframe limiting beliefs.",
        slideType: "CONTENT",
        layout: "TWO_COLUMN",
        order: 11
      },
      {
        title: "Secret #3: Success Stories",
        instructions: "Share multiple success stories showing Secret #3 in action. Include diverse examples that your audience can relate to and see themselves in.",
        slideType: "CONTENT",
        layout: "IMAGE_OVERLAY",
        order: 12
      },
      {
        title: "The Stack - What You Get",
        instructions: "Present your offer using 'the stack' method. List everything included, with individual values, building to an overwhelming total value proposition.",
        slideType: "CONTENT",
        layout: "BULLETS_IMAGE",
        order: 13
      },
      {
        title: "Urgency & Scarcity",
        instructions: "Create legitimate urgency and scarcity. Explain why they must act now - limited time, limited spots, price increase, or removal of bonuses.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 14
      },
      {
        title: "Guarantee & Risk Reversal",
        instructions: "Present your guarantee and reverse all risk for the buyer. Make it stronger than any objection and show you're taking all the risk.",
        slideType: "CONTENT",
        layout: "QUOTE_LARGE",
        order: 15
      },
      {
        title: "Call to Action",
        instructions: "Clear, direct call to action with specific instructions on how to take the next step. Include pricing, how to order, and what happens next.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 16
      }
    ]
  },
  {
    name: "Problem-Agitation-Solution Sales Framework",
    description: "Classic sales framework that identifies problems, agitates the pain points, then presents the solution. Perfect for sales presentations and proposals.",
    isDefault: false,
    slides: [
      {
        title: "Title & Audience Connection",
        instructions: "Create a title that speaks directly to your audience's situation or challenge. Make them feel understood and that this presentation is specifically for them.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Are You Experiencing This?",
        instructions: "Start by describing scenarios or situations your audience likely faces. Use 'Have you ever...' or 'Do you find yourself...' to create immediate connection and nodding.",
        slideType: "INTRO",
        layout: "BULLETS_IMAGE",
        order: 2
      },
      {
        title: "The Hidden Problem",
        instructions: "Reveal the underlying problem they may not have fully recognized. Help them understand that their symptoms are actually caused by a deeper issue.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_RIGHT",
        order: 3
      },
      {
        title: "Why This Problem Exists",
        instructions: "Explain the root causes of the problem. Help them understand how the problem developed and why traditional solutions haven't worked.",
        slideType: "CONTENT",
        layout: "TWO_COLUMN",
        order: 4
      },
      {
        title: "The True Cost of Inaction",
        instructions: "Agitate by showing what happens if they don't solve this problem. Include financial costs, opportunity costs, stress, and long-term consequences.",
        slideType: "CONTENT",
        layout: "STATISTICS_GRID",
        order: 5
      },
      {
        title: "It's Getting Worse Over Time",
        instructions: "Show how the problem compounds over time. Use data, trends, or examples to demonstrate that waiting makes the problem more expensive and difficult to solve.",
        slideType: "CONTENT",
        layout: "TIMELINE",
        order: 6
      },
      {
        title: "Failed Solutions & Broken Promises",
        instructions: "Address why other solutions have failed them. Show understanding of their frustration and validate their skepticism about new solutions.",
        slideType: "CONTENT",
        layout: "COMPARISON",
        order: 7
      },
      {
        title: "What You Really Need",
        instructions: "Transition to solution by explaining what they actually need to solve this problem. Set up the criteria for an effective solution.",
        slideType: "CONTENT",
        layout: "SPLIT_CONTENT",
        order: 8
      },
      {
        title: "Introducing Our Solution",
        instructions: "Present your solution as the answer to everything you've just discussed. Show how it specifically addresses each problem and agitation point.",
        slideType: "CONTENT",
        layout: "IMAGE_BACKGROUND",
        order: 9
      },
      {
        title: "How Our Solution Works",
        instructions: "Explain the mechanism or process of your solution. Show why it works when others have failed. Include the unique approach or methodology.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_LEFT",
        order: 10
      },
      {
        title: "Proof It Works",
        instructions: "Provide concrete evidence: case studies, testimonials, before/after comparisons, data, and results. Make the proof undeniable and relevant.",
        slideType: "CONTENT",
        layout: "IMAGE_OVERLAY",
        order: 11
      },
      {
        title: "Investment & Value",
        instructions: "Present the investment required and compare it to the cost of the problem. Show ROI and position price as a smart business decision.",
        slideType: "CONTENT",
        layout: "TWO_COLUMN",
        order: 12
      },
      {
        title: "Next Steps & Guarantee",
        instructions: "Provide clear next steps to get started. Include any guarantees or risk reversals that make the decision easier and safer.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 13
      }
    ]
  },
  {
    name: "Training & Educational Framework",
    description: "Structured learning framework using Tell-Show-Do-Review methodology. Perfect for workshops, training sessions, and educational presentations.",
    isDefault: false,
    slides: [
      {
        title: "Training Title & Objectives",
        instructions: "Create a clear training title with specific learning objectives. Tell participants exactly what they'll be able to do by the end of the session.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Welcome & Introduction",
        instructions: "Welcome participants and introduce yourself as their guide. Set the learning environment and explain the interactive nature of the training.",
        slideType: "INTRO",
        layout: "TEXT_IMAGE_RIGHT",
        order: 2
      },
      {
        title: "Learning Agenda & Roadmap",
        instructions: "Present the learning agenda with clear modules or sections. Show the logical progression and how each part builds on the previous.",
        slideType: "INTRO",
        layout: "TIMELINE",
        order: 3
      },
      {
        title: "Tell: Foundational Concepts",
        instructions: "TELL phase: Explain the foundational concepts and principles. Use clear definitions, frameworks, and theoretical background. Make it digestible and logical.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 4
      },
      {
        title: "Tell: Key Principles & Rules",
        instructions: "TELL phase continued: Present the key principles, rules, or guidelines that govern success in this area. Explain the 'why' behind each principle.",
        slideType: "CONTENT",
        layout: "BULLETS_IMAGE",
        order: 5
      },
      {
        title: "Show: Live Demonstration",
        instructions: "SHOW phase: Demonstrate the concept in action. Use examples, case studies, or live demos. Show exactly how the principles apply in real situations.",
        slideType: "CONTENT",
        layout: "IMAGE_FULL",
        order: 6
      },
      {
        title: "Show: Step-by-Step Process",
        instructions: "SHOW phase continued: Break down the process step-by-step. Show the detailed methodology, sequence, and decision points. Make it reproducible.",
        slideType: "CONTENT",
        layout: "TWO_COLUMN",
        order: 7
      },
      {
        title: "Show: Common Mistakes & Solutions",
        instructions: "SHOW phase: Highlight common mistakes or pitfalls and show how to avoid or correct them. Use real examples and practical solutions.",
        slideType: "CONTENT",
        layout: "COMPARISON",
        order: 8
      },
      {
        title: "Do: Guided Practice",
        instructions: "DO phase: Guide participants through hands-on practice. Provide clear instructions for their first attempt with your guidance and support.",
        slideType: "CONTENT",
        layout: "SPLIT_CONTENT",
        order: 9
      },
      {
        title: "Do: Independent Practice",
        instructions: "DO phase continued: Have participants practice independently or in small groups. Provide worksheets, templates, or exercises to reinforce learning.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_LEFT",
        order: 10
      },
      {
        title: "Review: Key Learnings",
        instructions: "REVIEW phase: Summarize key learnings and insights. Have participants share what they discovered or learned during the practice sessions.",
        slideType: "CONCLUSION",
        layout: "BULLETS_IMAGE",
        order: 11
      },
      {
        title: "Review: Q&A and Troubleshooting",
        instructions: "REVIEW phase: Address questions and troubleshoot any issues that came up during practice. Provide additional clarification and advanced tips.",
        slideType: "CONCLUSION",
        layout: "TEXT_ONLY",
        order: 12
      },
      {
        title: "Action Plan & Next Steps",
        instructions: "Provide a clear action plan for implementing what they learned. Include next steps, resources for continued learning, and how to get additional support.",
        slideType: "NEXT_STEPS",
        layout: "TIMELINE",
        order: 13
      }
    ]
  },
  {
    name: "Story-Driven Presentation Framework",
    description: "Uses narrative storytelling structure based on the Hero's Journey. Perfect for inspirational presentations, case studies, and transformation stories.",
    isDefault: false,
    slides: [
      {
        title: "Title & The Promise",
        instructions: "Create an intriguing title that hints at the transformation or journey ahead. Set up the promise of where this story will take the audience.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "The Ordinary World",
        instructions: "Begin the story by establishing the 'ordinary world' - the starting point or status quo. Help the audience relate to this familiar situation or state.",
        slideType: "INTRO",
        layout: "IMAGE_BACKGROUND",
        order: 2
      },
      {
        title: "The Call to Adventure",
        instructions: "Present the catalyst or challenge that disrupted the ordinary world. This is the problem, opportunity, or moment that demanded change or action.",
        slideType: "INTRO",
        layout: "QUOTE_LARGE",
        order: 3
      },
      {
        title: "Refusal & Fear",
        instructions: "Show the initial resistance or fear about taking on the challenge. Help the audience connect with the natural hesitation and doubt that comes with change.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_RIGHT",
        order: 4
      },
      {
        title: "Meeting the Mentor",
        instructions: "Introduce the mentor, guide, or wisdom that provided direction. This could be a person, method, philosophy, or realization that enabled progress.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_LEFT",
        order: 5
      },
      {
        title: "Crossing the Threshold",
        instructions: "Describe the moment of commitment - when the decision was made to move forward despite the fear. Show the point of no return and first steps taken.",
        slideType: "CONTENT",
        layout: "SPLIT_CONTENT",
        order: 6
      },
      {
        title: "Tests & Trials",
        instructions: "Detail the challenges, obstacles, and setbacks encountered along the journey. Show the struggles that tested resolve and forced growth.",
        slideType: "CONTENT",
        layout: "TIMELINE",
        order: 7
      },
      {
        title: "The Approach to the Ordeal",
        instructions: "Build tension toward the major challenge or crisis point. Set up the biggest obstacle or most difficult moment that had to be overcome.",
        slideType: "CONTENT",
        layout: "IMAGE_OVERLAY",
        order: 8
      },
      {
        title: "The Ordeal & Dark Moment",
        instructions: "Describe the darkest moment or biggest challenge - when failure seemed certain. Show vulnerability and the real risk of not succeeding.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 9
      },
      {
        title: "The Breakthrough",
        instructions: "Reveal the breakthrough moment or key insight that changed everything. Show how the hero found the strength, knowledge, or solution to overcome the ordeal.",
        slideType: "CONTENT",
        layout: "QUOTE_LARGE",
        order: 10
      },
      {
        title: "The Transformation",
        instructions: "Show the transformation or change that resulted from overcoming the challenge. Compare the before and after states, highlighting the growth achieved.",
        slideType: "CONTENT",
        layout: "COMPARISON",
        order: 11
      },
      {
        title: "Return with Wisdom",
        instructions: "Describe the return to the ordinary world with new wisdom, skills, or perspective. Show how the transformation benefited not just the hero but others.",
        slideType: "CONCLUSION",
        layout: "TWO_COLUMN",
        order: 12
      },
      {
        title: "The Lesson & Your Journey",
        instructions: "Extract the key lesson or principle from the story and show how the audience can apply it to their own journey. Make the connection personal and actionable.",
        slideType: "CONCLUSION",
        layout: "BULLETS_IMAGE",
        order: 13
      },
      {
        title: "Your Call to Adventure",
        instructions: "End by presenting the audience with their own call to adventure. Challenge them to begin their own transformation journey and provide the first step.",
        slideType: "NEXT_STEPS",
        layout: "IMAGE_BACKGROUND",
        order: 14
      }
    ]
  },
  {
    name: "What-Why-How Framework",
    description: "Perfect for explaining concepts, processes, or solutions. Structures content around what something is, why it matters, and how to implement it.",
    isDefault: false,
    slides: [
      {
        title: "Title Slide",
        instructions: "Create an engaging title slide that introduces the topic and sets the context for the presentation.",
        slideType: "TITLE",
        layout: "TEXT_ONLY",
        order: 1
      },
      {
        title: "What - Define the Topic",
        instructions: "Clearly explain what the topic is about. Provide definitions, scope, and key characteristics.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 2
      },
      {
        title: "Why - Importance & Benefits",
        instructions: "Explain why this topic matters. Include benefits, problems it solves, and value proposition.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 3
      },
      {
        title: "How - Implementation Steps",
        instructions: "Provide actionable steps or methodology for implementation. Include practical guidance.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 4
      },
      {
        title: "Next Steps",
        instructions: "Summarize key takeaways and provide clear next steps or call-to-action for the audience.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 5
      }
    ]
  },
  {
    name: "Problem-Solution Framework",
    description: "Ideal for pitches, proposals, and product presentations. Establishes a problem and presents your solution.",
    isDefault: false,
    slides: [
      {
        title: "Title & Introduction",
        instructions: "Create an engaging title slide that hints at the problem or solution you'll be addressing.",
        slideType: "TITLE",
        layout: "TEXT_ONLY",
        order: 1
      },
      {
        title: "Problem Statement",
        instructions: "Clearly articulate the problem. Make it relatable and show why it needs to be solved urgently.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 2
      },
      {
        title: "Current State Analysis",
        instructions: "Analyze the current situation, existing approaches, and why they fall short.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 3
      },
      {
        title: "Our Solution",
        instructions: "Present your solution clearly. Explain how it addresses the problem uniquely and effectively.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 4
      },
      {
        title: "Implementation Plan",
        instructions: "Outline how the solution will be implemented, including timeline, resources, and key milestones.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 5
      },
      {
        title: "Expected Results",
        instructions: "Present anticipated outcomes, benefits, and success metrics. Include ROI if applicable.",
        slideType: "CONCLUSION",
        layout: "TEXT_ONLY",
        order: 6
      }
    ]
  },
  {
    name: "Listicle Framework",
    description: "Great for educational content, tips, best practices, or feature highlights. Structures content as numbered points or categories.",
    isDefault: false,
    slides: [
      {
        title: "Introduction",
        instructions: "Create an engaging title slide that introduces the list topic and sets expectations for what the audience will learn.",
        slideType: "TITLE",
        layout: "TEXT_ONLY",
        order: 1
      },
      {
        title: "Overview",
        instructions: "Provide context and brief overview of why these items are important or relevant.",
        slideType: "INTRO",
        layout: "TEXT_ONLY",
        order: 2
      },
      {
        title: "Item 1",
        instructions: "Present the first item in your list. Provide clear explanation and practical examples.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 3
      },
      {
        title: "Item 2",
        instructions: "Present the second item in your list. Maintain consistency in depth and style with item 1.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 4
      },
      {
        title: "Item 3",
        instructions: "Present the third item in your list. Continue the pattern established in previous items.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 5
      },
      {
        title: "Summary & Key Takeaways",
        instructions: "Summarize the main points and highlight the most important takeaways from the list.",
        slideType: "CONCLUSION",
        layout: "TEXT_ONLY",
        order: 6
      }
    ]
  },
  {
    name: "Webinar Framework",
    description: "Structured for educational webinars and training sessions. Includes engagement points and actionable content.",
    isDefault: false,
    slides: [
      {
        title: "Welcome & Agenda",
        instructions: "Create a welcoming title slide that introduces the webinar topic and outlines the agenda.",
        slideType: "TITLE",
        layout: "TEXT_ONLY",
        order: 1
      },
      {
        title: "About the Speaker",
        instructions: "Brief introduction of the presenter, their expertise, and credibility on the topic.",
        slideType: "INTRO",
        layout: "TEXT_ONLY",
        order: 2
      },
      {
        title: "Learning Objectives",
        instructions: "Clearly state what attendees will learn and be able to do after the webinar.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 3
      },
      {
        title: "Main Content Block 1",
        instructions: "Present the first major topic or learning module with detailed explanations and examples.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 4
      },
      {
        title: "Interactive Element",
        instructions: "Include a poll, Q&A prompt, or interactive exercise to engage the audience.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 5
      },
      {
        title: "Main Content Block 2",
        instructions: "Present the second major topic, building on the first content block.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 6
      },
      {
        title: "Practical Application",
        instructions: "Show real-world examples, case studies, or hands-on demonstrations.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 7
      },
      {
        title: "Q&A Session",
        instructions: "Dedicate time for questions and answers. Address common concerns or clarifications.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 8
      },
      {
        title: "Resources & Next Steps",
        instructions: "Provide additional resources, contact information, and clear next steps for continued learning.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 9
      }
    ]
  },
  {
    name: "Storytelling Framework",
    description: "Perfect for engaging presentations that need to connect emotionally. Uses narrative structure to deliver key messages.",
    isDefault: false,
    slides: [
      {
        title: "Setting the Scene",
        instructions: "Create an engaging opening that introduces the story context and main character or situation.",
        slideType: "TITLE",
        layout: "TEXT_ONLY",
        order: 1
      },
      {
        title: "The Challenge",
        instructions: "Introduce the conflict, problem, or challenge that drives the story forward.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 2
      },
      {
        title: "The Journey",
        instructions: "Describe the efforts, attempts, and journey toward solving the challenge. Include obstacles and learning.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 3
      },
      {
        title: "The Resolution",
        instructions: "Present how the challenge was overcome and what solution or approach led to success.",
        slideType: "CONTENT",
        layout: "TEXT_ONLY",
        order: 4
      },
      {
        title: "The Lesson",
        instructions: "Extract the key lesson, principle, or message that the audience should take away from the story.",
        slideType: "CONCLUSION",
        layout: "TEXT_ONLY",
        order: 5
      },
      {
        title: "Application to You",
        instructions: "Help the audience connect the story to their own situation and provide actionable takeaways.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 6
      }
    ]
  },
  // Angle-based frameworks for idea development
  {
    name: "CUB Framework (Contrarian-Useful-Bridge)",
    description: "Challenges common beliefs, provides practical value, then bridges to bigger trends. Perfect for thought-provoking presentations that position you as a thought leader.",
    isDefault: false,
    slides: [
      {
        title: "Title Slide",
        instructions: "Create an engaging title slide that hints at the contrarian perspective you'll present.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Contrarian - Challenge the Common Belief",
        instructions: "Present what's OPPOSITE of common belief. Start with 'What if everything you know about [topic] is wrong?' or 'Here's why [common belief] is actually holding you back.' Be bold and attention-grabbing.",
        slideType: "INTRO",
        layout: "QUOTE_LARGE",
        order: 2
      },
      {
        title: "Useful - The Practical Method",
        instructions: "Present your USEFUL practical tip or method. This is the actionable solution that anyone can try. Be specific with steps, frameworks, or techniques that provide immediate value.",
        slideType: "CONTENT",
        layout: "BULLETS_IMAGE",
        order: 3
      },
      {
        title: "Bridge - Connect to Something Bigger",
        instructions: "Show how this connects to a larger BRIDGE - a trend, future possibility, or mission. Explain how this small change connects to massive transformation in the industry, personal growth, or societal shift.",
        slideType: "CONCLUSION",
        layout: "TWO_COLUMN",
        order: 4
      },
      {
        title: "Your Turn - Take Action",
        instructions: "Challenge the audience to try the contrarian approach. Give them one specific thing they can do today to test this new perspective.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 5
      }
    ]
  },
  {
    name: "PASE Framework (Problem-Agitate-Solve-Expand)",
    description: "Identifies pain points, amplifies urgency, presents solutions, then expands possibilities. Ideal for persuasive presentations that drive action.",
    isDefault: false,
    slides: [
      {
        title: "Title Slide",
        instructions: "Create an compelling title slide that hints at the problem you'll solve.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Problem - What's the Issue?",
        instructions: "Clearly identify the PROBLEM your audience faces. Make it specific, relatable, and urgent. Use data, examples, or stories that make the audience think 'Yes, this is exactly what I'm dealing with!'",
        slideType: "INTRO",
        layout: "TEXT_IMAGE_LEFT",
        order: 2
      },
      {
        title: "Agitate - Why Does This Hurt?",
        instructions: "AGITATE the problem by showing the cost of inaction. What happens if this problem isn't solved? Show the pain, missed opportunities, or consequences. Make them feel the urgency.",
        slideType: "CONTENT",
        layout: "STATISTICS_GRID",
        order: 3
      },
      {
        title: "Solve - Your Solution Method",
        instructions: "Present your SOLUTION method. This is your framework, process, or approach that directly addresses the problem. Make it clear, actionable, and achievable.",
        slideType: "CONTENT",
        layout: "BULLETS_IMAGE",
        order: 4
      },
      {
        title: "Expand - What Else Becomes Possible?",
        instructions: "EXPAND on what becomes possible once they solve this problem. Show the bigger transformation, additional benefits, or new opportunities that open up. Paint the vision of success.",
        slideType: "CONCLUSION",
        layout: "TWO_COLUMN",
        order: 5
      },
      {
        title: "Start Today - First Steps",
        instructions: "Give them concrete first steps to begin solving this problem today. Make the path forward clear and achievable.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 6
      }
    ]
  },
  {
    name: "HEAR Framework (Hook-Empathy-Authority-Roadmap)",
    description: "Grabs attention, shows understanding, establishes credibility, then provides clear direction. Perfect for building trust and guiding audiences.",
    isDefault: false,
    slides: [
      {
        title: "Title Slide",
        instructions: "Create an engaging title slide that sets up your hook and expertise on the topic.",
        slideType: "TITLE",
        layout: "TITLE_COVER",
        order: 1
      },
      {
        title: "Hook - Grab Attention",
        instructions: "Start with a powerful HOOK that grabs attention immediately. Use a surprising statistic, thought-provoking question, bold statement, or compelling story that makes people stop and pay attention.",
        slideType: "INTRO",
        layout: "QUOTE_LARGE",
        order: 2
      },
      {
        title: "Empathy - Show You Get Their Struggle",
        instructions: "Show EMPATHY by demonstrating you understand their specific struggles, challenges, or frustrations. Share your own experience or relate to their situation to build connection and trust.",
        slideType: "CONTENT",
        layout: "TEXT_IMAGE_RIGHT",
        order: 3
      },
      {
        title: "Authority - Share Your Insight/Method",
        instructions: "Establish your AUTHORITY by sharing your unique insight, method, or expertise. This is where you present your framework, approach, or solution. Show why you're qualified to help.",
        slideType: "CONTENT",
        layout: "BULLETS_IMAGE",
        order: 4
      },
      {
        title: "Roadmap - Lay Out the Steps",
        instructions: "Provide a clear ROADMAP showing exactly how your method works. Break it down into simple, logical steps that anyone can follow. Make the path forward crystal clear.",
        slideType: "CONCLUSION",
        layout: "TIMELINE",
        order: 5
      },
      {
        title: "Begin Your Journey - Take Action",
        instructions: "Encourage them to begin their journey with your method. Give them the very first step they can take right now to start seeing results.",
        slideType: "NEXT_STEPS",
        layout: "TEXT_ONLY",
        order: 6
      }
    ]
  }
]

export async function createFrameworkTemplates() {
  try {
    // Check if templates already exist
    const existingCount = await prisma.framework.count()
    if (existingCount > 0) {
      return { success: true, message: 'Templates already exist, skipping creation' }
    }

    // Create all framework templates
    for (const template of frameworkTemplates) {
      await prisma.framework.create({
        data: {
          name: template.name,
          description: template.description,
          isDefault: template.isDefault,
          slides: {
            create: template.slides
          }
        }
      })
    }

    revalidatePath('/frameworks')
    revalidatePath('/create')
    return { success: true, message: `Created ${frameworkTemplates.length} framework templates` }
  } catch (error) {
    console.error('Error creating framework templates:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create templates' }
  }
}

export async function getFrameworkTemplates() {
  return frameworkTemplates.map(template => ({
    name: template.name,
    description: template.description,
    slideCount: template.slides.length
  }))
}

// Default Voice Profile Templates
const defaultVoiceProfiles = [
  {
    name: "Professional Business",
    tone: ["Professional", "Confident", "Authoritative"],
    audience: ["Business Executives", "Stakeholders", "Management"],
    objective: ["Inform", "Persuade", "Drive decisions"],
    brandVoice: ["Authoritative yet approachable", "Data-driven decisions", "Results oriented"],
    contentStyle: ["Use concrete examples", "Include relevant metrics and KPIs", "Clear actionable insights"],
    restrictions: ["Avoid overly technical jargon", "Keep content accessible", "Stay professional"],
    other: ["Include call-to-action in conclusions", "Focus on business outcomes"],
    isDefault: true
  },
  {
    name: "Educational & Training",
    tone: ["Friendly", "Instructional", "Encouraging"],
    audience: ["Students", "Learners", "Trainees"],
    objective: ["Educate", "Build understanding", "Train"],
    brandVoice: ["Supportive teacher", "Encouraging learning", "Patient and helpful"],
    contentStyle: ["Use step-by-step explanations", "Include practical examples", "Use visuals"],
    restrictions: ["Avoid overwhelming with information", "Keep it simple", "Stay encouraging"],
    other: ["Include interactive elements", "Add knowledge checks", "Provide practice opportunities"],
    isDefault: false
  },
  {
    name: "Technical & Scientific",
    tone: ["Technical", "Precise", "Analytical"],
    audience: ["Technical professionals", "Researchers", "Engineers"],
    objective: ["Share technical knowledge", "Present research findings", "Inform"],
    brandVoice: ["Expert authority", "Methodical approach", "Accuracy focused"],
    contentStyle: ["Include detailed methodologies", "Technical specifications", "Use data and metrics"],
    restrictions: ["Maintain technical accuracy", "Cite sources when appropriate", "Avoid oversimplification"],
    other: ["Include technical diagrams", "Detailed appendices", "Reference materials"],
    isDefault: false
  },
  {
    name: "Sales & Marketing",
    tone: ["Persuasive", "Enthusiastic", "Customer focused"],
    audience: ["Potential customers", "Clients", "Prospects"],
    objective: ["Persuade", "Drive action", "Sell"],
    brandVoice: ["Customer-focused", "Solution-oriented", "Benefits driven"],
    contentStyle: ["Highlight benefits over features", "Use customer success stories", "Include testimonials"],
    restrictions: ["Avoid overly promotional language", "Focus on value", "Stay authentic"],
    other: ["Include clear next steps", "Contact information", "Call to action"],
    isDefault: false
  }
]

export async function createDefaultVoiceProfiles() {
  try {
    // Check if default voice profiles already exist
    const existingCount = await prisma.voiceProfile.count()
    if (existingCount > 0) {
      return { success: true, message: 'Voice profiles already exist, skipping creation' }
    }

    // Create all default voice profiles
    for (const profile of defaultVoiceProfiles) {
      await prisma.voiceProfile.create({
        data: profile
      })
    }

    revalidatePath('/voice-profiles')
    revalidatePath('/create')
    return { success: true, message: `Created ${defaultVoiceProfiles.length} default voice profiles` }
  } catch (error) {
    console.error('Error creating default voice profiles:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create default profiles' }
  }
}

export async function seedDefaultData() {
  try {
    const [voiceResult, frameworkResult] = await Promise.all([
      createDefaultVoiceProfiles(),
      createFrameworkTemplates()
    ])

    const messages = [
      voiceResult.message || (voiceResult.success ? 'Voice profiles processed' : 'Failed to create voice profiles'),
      frameworkResult.message || (frameworkResult.success ? 'Framework templates processed' : 'Failed to create framework templates')
    ]

    return { 
      success: voiceResult.success && frameworkResult.success, 
      message: messages.join('; '),
      details: { voiceResult, frameworkResult }
    }
  } catch (error) {
    console.error('Error seeding default data:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to seed default data' }
  }
}

// Presentation CRUD Actions
export async function deletePresentation(id: string) {
  try {
    await prisma.presentation.delete({
      where: { id }
    })

    revalidatePath('/presentations')
    return { success: true }
  } catch (error) {
    console.error('Error deleting presentation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete presentation' }
  }
}

// Voice Profile CRUD Actions
export async function createVoiceProfile(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const tone = JSON.parse(formData.get('tone') as string)
    const audience = JSON.parse(formData.get('audience') as string)
    const objective = JSON.parse(formData.get('objective') as string)
    const brandVoice = JSON.parse(formData.get('brandVoice') as string)
    const contentStyle = JSON.parse(formData.get('contentStyle') as string)
    const restrictions = JSON.parse(formData.get('restrictions') as string)
    const other = JSON.parse(formData.get('other') as string)
    const isDefault = formData.get('isDefault') === 'true'

    // If this is being set as default, unset all other defaults
    if (isDefault) {
      await prisma.voiceProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    const profile = await prisma.voiceProfile.create({
      data: {
        name,
        tone,
        audience,
        objective,
        brandVoice,
        contentStyle,
        restrictions,
        other,
        isDefault
      }
    })

    revalidatePath('/voice-profiles')
    return { success: true, profile }
  } catch (error) {
    console.error('Error creating voice profile:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create voice profile' }
  }
}

export async function updateVoiceProfile(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    const tone = JSON.parse(formData.get('tone') as string)
    const audience = JSON.parse(formData.get('audience') as string)
    const objective = JSON.parse(formData.get('objective') as string)
    const brandVoice = JSON.parse(formData.get('brandVoice') as string)
    const contentStyle = JSON.parse(formData.get('contentStyle') as string)
    const restrictions = JSON.parse(formData.get('restrictions') as string)
    const other = JSON.parse(formData.get('other') as string)
    const isDefault = formData.get('isDefault') === 'true'

    // If this is being set as default, unset all other defaults
    if (isDefault) {
      await prisma.voiceProfile.updateMany({
        where: { 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    const profile = await prisma.voiceProfile.update({
      where: { id },
      data: {
        name,
        tone,
        audience,
        objective,
        brandVoice,
        contentStyle,
        restrictions,
        other,
        isDefault
      }
    })

    revalidatePath('/voice-profiles')
    return { success: true, profile }
  } catch (error) {
    console.error('Error updating voice profile:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update voice profile' }
  }
}

export async function deleteVoiceProfile(id: string) {
  try {
    await prisma.voiceProfile.delete({
      where: { id }
    })

    revalidatePath('/voice-profiles')
    return { success: true }
  } catch (error) {
    console.error('Error deleting voice profile:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete voice profile' }
  }
}

// Framework CRUD Actions
export async function getFrameworks() {
  try {
    const frameworks = await prisma.framework.findMany({
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return frameworks
  } catch (error) {
    console.error('Error fetching frameworks:', error)
    return []
  }
}

export async function createFramework(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isDefault = formData.get('isDefault') === 'true'
    const slides = JSON.parse(formData.get('slides') as string)

    // If this is being set as default, unset all other defaults
    if (isDefault) {
      await prisma.framework.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    // Create slides without temp IDs
    const slidesData = slides.map((slide: any, index: number) => ({
      title: slide.title,
      instructions: slide.instructions,
      slideType: slide.slideType,
      layout: slide.layout,
      order: index + 1
    }))

    const framework = await prisma.framework.create({
      data: {
        name,
        description,
        isDefault,
        slides: {
          create: slidesData
        }
      }
    })

    revalidatePath('/frameworks')
    return { success: true, framework }
  } catch (error) {
    console.error('Error creating framework:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create framework' }
  }
}

export async function updateFramework(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isDefault = formData.get('isDefault') === 'true'
    const slides = JSON.parse(formData.get('slides') as string)

    // If this is being set as default, unset all other defaults
    if (isDefault) {
      await prisma.framework.updateMany({
        where: { 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    // Delete existing slides and create new ones
    await prisma.slide.deleteMany({
      where: { frameworkId: id }
    })

    // Create slides without temp IDs
    const slidesData = slides.map((slide: any, index: number) => ({
      title: slide.title,
      instructions: slide.instructions,
      slideType: slide.slideType,
      layout: slide.layout,
      order: index + 1
    }))

    const framework = await prisma.framework.update({
      where: { id },
      data: {
        name,
        description,
        isDefault,
        slides: {
          create: slidesData
        }
      }
    })

    revalidatePath('/frameworks')
    return { success: true, framework }
  } catch (error) {
    console.error('Error updating framework:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update framework' }
  }
}

export async function deleteFramework(id: string) {
  try {
    await prisma.framework.delete({
      where: { id }
    })

    revalidatePath('/frameworks')
    return { success: true }
  } catch (error) {
    console.error('Error deleting framework:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete framework' }
  }
}

export async function duplicateFramework(id: string) {
  try {
    const originalFramework = await prisma.framework.findUnique({
      where: { id },
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!originalFramework) {
      return { success: false, error: 'Framework not found' }
    }

    // Create slides data for duplication
    const slidesData = originalFramework.slides.map((slide, index) => ({
      title: slide.title,
      instructions: slide.instructions,
      slideType: slide.slideType,
      layout: slide.layout,
      order: index + 1
    }))

    const duplicatedFramework = await prisma.framework.create({
      data: {
        name: `${originalFramework.name} (Copy)`,
        description: originalFramework.description,
        isDefault: false, // Duplicates are never default
        slides: {
          create: slidesData
        }
      }
    })

    revalidatePath('/frameworks')
    return { success: true, framework: duplicatedFramework }
  } catch (error) {
    console.error('Error duplicating framework:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to duplicate framework' }
  }
}

// Presentation CRUD Actions
export async function createPresentation(formData: FormData) {
  let presentationId: string

  try {
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string
    const voiceProfileId = formData.get('voiceProfileId') as string
    const frameworkId = formData.get('frameworkId') as string
    const ideaId = formData.get('ideaId') as string
    const selectedAngle = formData.get('selectedAngle') as string

    if (!title || !prompt) {
      return { success: false, error: 'Title and prompt are required' }
    }

    // Get voice profile and framework if specified
    let voiceProfile = null
    let framework = null

    if (voiceProfileId && voiceProfileId !== 'none') {
      voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId }
      })
    }

    if (frameworkId && frameworkId !== 'none') {
      framework = await prisma.framework.findUnique({
        where: { id: frameworkId },
        include: {
          slides: {
            orderBy: { order: 'asc' }
          }
        }
      })
    }

    // Generate slides based on framework or free-form
    const slideContents = await generateSlideContent(
      prompt,
      title,
      voiceProfile,
      framework
    )

    const presentation = await prisma.presentation.create({
      data: {
        title,
        prompt,
        voiceProfileId: voiceProfileId && voiceProfileId !== 'none' ? voiceProfileId : null,
        frameworkId: frameworkId && frameworkId !== 'none' ? frameworkId : null,
        ideaId: ideaId && ideaId !== 'none' ? ideaId : null,
        selectedAngle: selectedAngle || null,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter',
        slides: {
          create: slideContents.map(slide => ({
            title: slide.title,
            content: slide.content,
            narration: `Speaker notes for "${slide.title}": Review the content on this slide and present it clearly to your audience.`,
            slideType: slide.slideType,
            layout: slide.layout || 'TEXT_ONLY',
            order: slide.order,
            imageUrl: getPlaceholderImageForLayout(slide.layout || 'TEXT_ONLY'),
          }))
        }
      },
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    presentationId = presentation.id
    revalidatePath('/presentations')
  } catch (error) {
    console.error('Error creating presentation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create presentation' }
  }
  
  redirect(`/presentations/${presentationId}`)
}

export async function createOutline(formData: FormData) {
  let outlineData: string
  
  try {
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string
    const voiceProfileId = formData.get('voiceProfileId') as string
    const frameworkId = formData.get('frameworkId') as string

    if (!title || !prompt) {
      return { success: false, error: 'Title and prompt are required' }
    }

    let voiceProfile = null
    if (voiceProfileId && voiceProfileId !== 'none') {
      voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId }
      })
    }

    let framework = null
    if (frameworkId && frameworkId !== 'none') {
      framework = await prisma.framework.findUnique({
        where: { id: frameworkId },
        include: {
          slides: {
            orderBy: { order: 'asc' }
          }
        }
      })
    }

    // Generate outline
    const outline = await generateSimpleOutline(
      prompt, 
      title, 
      voiceProfile, 
      framework
    )

    // Create URL with outline data
    outlineData = encodeURIComponent(JSON.stringify({
      title,
      prompt,
      voiceProfileId: voiceProfileId || 'none',
      frameworkId: frameworkId || 'none',
      outline
    }))

    revalidatePath('/create')
  } catch (error) {
    console.error('Error creating outline:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create outline' }
  }
  
  redirect(`/create/outline-preview?data=${outlineData}`)
}

export async function generateOutlinePreview(formData: FormData) {
  try {
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string
    const voiceProfileId = formData.get('voiceProfileId') as string
    const frameworkId = formData.get('frameworkId') as string

    if (!title || !prompt) {
      return { success: false, error: 'Title and prompt are required' }
    }

    let voiceProfile = null
    if (voiceProfileId && voiceProfileId !== 'none') {
      voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId }
      })
    }

    let framework = null
    if (frameworkId && frameworkId !== 'none') {
      framework = await prisma.framework.findUnique({
        where: { id: frameworkId },
        include: {
          slides: {
            orderBy: { order: 'asc' }
          }
        }
      })
    }

    // Generate simple outline
    const outline = await generateSimpleOutline(
      prompt, 
      title, 
      voiceProfile, 
      framework
    )

    return { 
      success: true, 
      outline,
      title,
      prompt,
      voiceProfileId: voiceProfileId || 'none',
      frameworkId: frameworkId || 'none'
    }
  } catch (error) {
    console.error('Error generating outline preview:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate outline' }
  }
}

export async function generatePresentationFromOutline(formData: FormData) {
  let presentationId: string
  
  try {
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string
    const voiceProfileId = formData.get('voiceProfileId') as string
    const frameworkId = formData.get('frameworkId') as string
    const outlineJson = formData.get('outline') as string

    if (!title || !prompt || !outlineJson) {
      return { success: false, error: 'Title, prompt, and outline are required' }
    }

    let outline
    try {
      outline = JSON.parse(outlineJson)
    } catch (error) {
      return { success: false, error: 'Invalid outline format' }
    }

    let voiceProfile = null
    if (voiceProfileId && voiceProfileId !== 'none') {
      voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId }
      })
    }

    // Generate slides with detailed speaker notes from approved outline
    const slideContents = await generateSlidesFromSimpleOutline(
      outline,
      title, 
      voiceProfile
    )

    const presentation = await prisma.presentation.create({
      data: {
        title,
        prompt,
        voiceProfileId: voiceProfileId && voiceProfileId !== 'none' ? voiceProfileId : null,
        frameworkId: frameworkId && frameworkId !== 'none' ? frameworkId : null,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter',
        slides: {
          create: slideContents.map(slide => ({
            title: slide.title,
            content: slide.content,
            narration: slide.narration || '',
            slideType: slide.slideType,
            layout: slide.layout || 'TEXT_ONLY',
            order: slide.order,
            imageUrl: getPlaceholderImageForLayout(slide.layout || 'TEXT_ONLY'),
          }))
        }
      },
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    presentationId = presentation.id
    revalidatePath('/presentations')
  } catch (error) {
    console.error('Error generating presentation from outline:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate presentation' }
  }
  
  redirect(`/presentations/${presentationId}`)
}

export async function getPresentations() {
  try {
    const presentations = await prisma.presentation.findMany({
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return presentations
  } catch (error) {
    console.error('Error fetching presentations:', error)
    return []
  }
}

export async function getPresentation(id: string) {
  try {
    const presentation = await prisma.presentation.findUnique({
      where: { id },
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        },
        voiceProfile: true,
        framework: {
          include: {
            slides: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    })

    return presentation
  } catch (error) {
    console.error('Error fetching presentation:', error)
    return null
  }
}

export async function regenerateSlide(slideId: string, additionalContext?: string) {
  try {
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      include: {
        presentation: {
          include: {
            voiceProfile: true
          }
        }
      }
    })

    if (!slide) {
      return { success: false, error: 'Slide not found' }
    }

    const regeneratedSlide = await regenerateSlideContent(
      {
        title: slide.title,
        content: slide.content,
        slideType: slide.slideType as any,
        layout: slide.layout as any,
        order: slide.order
      },
      slide.presentation.prompt,
      additionalContext,
      slide.presentation.voiceProfile
    )

    return {
      success: true,
      original: {
        id: slide.id,
        title: slide.title,
        content: slide.content,
        slideType: slide.slideType,
        order: slide.order
      },
      regenerated: regeneratedSlide
    }
  } catch (error) {
    console.error('Error regenerating slide:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to regenerate slide' }
  }
}

// Idea CRUD Actions
export async function getIdeas() {
  try {
    const ideas = await prisma.idea.findMany({
      include: {
        presentations: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            selectedAngle: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return ideas
  } catch (error) {
    console.error('Error fetching ideas:', error)
    return []
  }
}

export async function createIdea(formData: FormData) {
  try {
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!title || !description) {
      return { success: false, error: 'Title and description are required' }
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        description
      }
    })

    revalidatePath('/ideas')
    return { success: true, idea }
  } catch (error) {
    console.error('Error creating idea:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create idea' }
  }
}

export async function updateIdea(id: string, formData: FormData) {
  try {
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!title || !description) {
      return { success: false, error: 'Title and description are required' }
    }

    const idea = await prisma.idea.update({
      where: { id },
      data: {
        title,
        description
      }
    })

    revalidatePath('/ideas')
    return { success: true, idea }
  } catch (error) {
    console.error('Error updating idea:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update idea' }
  }
}

export async function deleteIdea(id: string) {
  try {
    await prisma.idea.delete({
      where: { id }
    })

    revalidatePath('/ideas')
    return { success: true }
  } catch (error) {
    console.error('Error deleting idea:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete idea' }
  }
}

export async function getIdea(id: string) {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        presentations: {
          include: {
            slides: {
              select: {
                id: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    return idea
  } catch (error) {
    console.error('Error fetching idea:', error)
    return null
  }
}

async function ensureAngleFrameworksExist() {
  const existingFrameworks = await prisma.framework.findMany({
    where: {
      OR: [
        { name: { contains: 'CUB Framework' } },
        { name: { contains: 'PASE Framework' } },
        { name: { contains: 'HEAR Framework' } },
        { name: { contains: 'WWH Framework' } }
      ]
    }
  })

  const existingNames = existingFrameworks.map(f => f.name)

  const frameworksToCreate = []

  if (!existingNames.some(name => name.includes('CUB Framework'))) {
    frameworksToCreate.push({
      name: 'CUB Framework',
      description: 'Contrarian-Useful-Bridge: Challenge beliefs, provide utility, connect to trends',
      isDefault: false,
      isCustom: false,
      slides: {
        create: [
          {
            title: 'Title Slide',
            instructions: 'Present the main title and subtitle for the presentation',
            slideType: 'TITLE',
            layout: 'TITLE_COVER',
            order: 1
          },
          {
            title: 'Contrarian - Challenge the Status Quo',
            instructions: 'Present a contrarian viewpoint that challenges common beliefs about the topic',
            slideType: 'INTRO',
            layout: 'TEXT_ONLY',
            order: 2
          },
          {
            title: 'Useful - Practical Solution',
            instructions: 'Provide practical, actionable methods that deliver real value',
            slideType: 'CONTENT',
            layout: 'TEXT_IMAGE_RIGHT',
            order: 3
          },
          {
            title: 'Bridge - Connect to Future',
            instructions: 'Connect your solution to bigger trends and transformations',
            slideType: 'CONCLUSION',
            layout: 'TEXT_ONLY',
            order: 4
          },
          {
            title: 'Next Steps',
            instructions: 'Provide clear action items for the audience',
            slideType: 'NEXT_STEPS',
            layout: 'BULLETS_IMAGE',
            order: 5
          }
        ]
      }
    })
  }

  if (!existingNames.some(name => name.includes('PASE Framework'))) {
    frameworksToCreate.push({
      name: 'PASE Framework',
      description: 'Problem-Agitate-Solve-Expand: Identify problems, show consequences, solve, expand possibilities',
      isDefault: false,
      isCustom: false,
      slides: {
        create: [
          {
            title: 'Title Slide',
            instructions: 'Present the main title and subtitle for the presentation',
            slideType: 'TITLE',
            layout: 'TITLE_COVER',
            order: 1
          },
          {
            title: 'Problem - Identify the Pain Points',
            instructions: 'Identify specific pain points and challenges your audience faces',
            slideType: 'INTRO',
            layout: 'TEXT_ONLY',
            order: 2
          },
          {
            title: 'Agitate - Show the Consequences',
            instructions: 'Show the consequences and costs of not addressing the problem',
            slideType: 'CONTENT',
            layout: 'TEXT_IMAGE_RIGHT',
            order: 3
          },
          {
            title: 'Solve - Present Your Solution',
            instructions: 'Provide your method or approach to solve the identified problems',
            slideType: 'CONTENT',
            layout: 'TEXT_IMAGE_LEFT',
            order: 4
          },
          {
            title: 'Expand - What Becomes Possible',
            instructions: 'Show what becomes possible when the solution is implemented',
            slideType: 'CONCLUSION',
            layout: 'TEXT_ONLY',
            order: 5
          },
          {
            title: 'Next Steps',
            instructions: 'Provide clear action items for the audience',
            slideType: 'NEXT_STEPS',
            layout: 'BULLETS_IMAGE',
            order: 6
          }
        ]
      }
    })
  }

  if (!existingNames.some(name => name.includes('HEAR Framework'))) {
    frameworksToCreate.push({
      name: 'HEAR Framework',
      description: 'Hook-Empathy-Authority-Roadmap: Grab attention, show understanding, establish credibility, provide clear path',
      isDefault: false,
      isCustom: false,
      slides: {
        create: [
          {
            title: 'Title Slide',
            instructions: 'Present the main title and subtitle for the presentation',
            slideType: 'TITLE',
            layout: 'TITLE_COVER',
            order: 1
          },
          {
            title: 'Hook - Grab Attention',
            instructions: 'Start with an attention-grabbing opening that draws the audience in',
            slideType: 'INTRO',
            layout: 'TEXT_ONLY',
            order: 2
          },
          {
            title: 'Empathy - Understand Their Struggles',
            instructions: 'Show deep understanding of your audience\'s challenges and pain points',
            slideType: 'CONTENT',
            layout: 'TEXT_ONLY',
            order: 3
          },
          {
            title: 'Authority - Share Your Expertise',
            instructions: 'Establish credibility by sharing your method, experience, or unique insights',
            slideType: 'CONTENT',
            layout: 'TEXT_IMAGE_RIGHT',
            order: 4
          },
          {
            title: 'Roadmap - Clear Path Forward',
            instructions: 'Provide a clear, step-by-step roadmap for achieving success',
            slideType: 'NEXT_STEPS',
            layout: 'BULLETS_IMAGE',
            order: 5
          }
        ]
      }
    })
  }

  if (!existingNames.some(name => name.includes('WWH Framework'))) {
    frameworksToCreate.push({
      name: 'WWH Framework',
      description: 'What-Why-How: Present the concept, explain the reasoning, provide implementation steps',
      isDefault: false,
      isCustom: false,
      slides: {
        create: [
          {
            title: 'Title Slide',
            instructions: 'Present the main title and subtitle for the presentation',
            slideType: 'TITLE',
            layout: 'TITLE_COVER',
            order: 1
          },
          {
            title: 'What - The Concept',
            instructions: 'Present the concept, method, or solution clearly and concisely',
            slideType: 'INTRO',
            layout: 'TEXT_ONLY',
            order: 2
          },
          {
            title: 'Why - The Reasoning',
            instructions: 'Explain why this matters, the benefits, importance, and urgency',
            slideType: 'CONTENT',
            layout: 'TEXT_IMAGE_RIGHT',
            order: 3
          },
          {
            title: 'How - The Implementation',
            instructions: 'Provide clear, step-by-step guidance for implementation',
            slideType: 'NEXT_STEPS',
            layout: 'BULLETS_IMAGE',
            order: 4
          }
        ]
      }
    })
  }

  // Create the missing frameworks
  for (const frameworkData of frameworksToCreate) {
    await prisma.framework.create({
      data: frameworkData
    })
  }
}

export async function generateAngles(formData: FormData) {
  try {
    const ideaId = formData.get('ideaId') as string
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string

    let ideaTitle: string
    let ideaDescription: string

    if (ideaId) {
      // Generate angles from existing idea
      const idea = await prisma.idea.findUnique({
        where: { id: ideaId }
      })

      if (!idea) {
        return { success: false, error: 'Idea not found' }
      }

      ideaTitle = idea.title
      ideaDescription = idea.description
    } else if (title && prompt) {
      // Generate angles from direct input
      ideaTitle = title
      ideaDescription = prompt
    } else {
      return { success: false, error: 'Either ideaId or title and prompt are required' }
    }

    // Get the frameworks needed for angle generation
    const frameworks = await prisma.framework.findMany({
      where: {
        OR: [
          { name: { contains: 'CUB Framework' } },
          { name: { contains: 'PASE Framework' } },
          { name: { contains: 'HEAR Framework' } },
          { name: { contains: 'WWH Framework' } }
        ]
      }
    })

    if (frameworks.length < 4) {
      // Auto-create missing angle frameworks
      await ensureAngleFrameworksExist()

      // Try to get them again
      const retryFrameworks = await prisma.framework.findMany({
        where: {
          OR: [
            { name: { contains: 'CUB Framework' } },
            { name: { contains: 'PASE Framework' } },
            { name: { contains: 'HEAR Framework' } },
            { name: { contains: 'WWH Framework' } }
          ]
        }
      })

      if (retryFrameworks.length < 4) {
        return { success: false, error: 'Failed to create required angle frameworks.' }
      }

      // Use the newly created frameworks
      frameworks.push(...retryFrameworks)
    }

    // Generate angles using AI
    const angles = await generateAnglesFromIdea(
      ideaTitle,
      ideaDescription,
      frameworks
    )

    return {
      success: true,
      angles,
      idea: ideaId ? {
        id: ideaId,
        title: ideaTitle,
        description: ideaDescription
      } : null
    }
  } catch (error) {
    console.error('Error generating angles:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate angles' }
  }
}

export async function createPresentationFromAngle(formData: FormData) {
  let presentationId: string

  try {
    const title = formData.get('title') as string
    const voiceProfileId = formData.get('voiceProfileId') as string
    const ideaId = formData.get('ideaId') as string
    const selectedAngleJson = formData.get('selectedAngle') as string

    if (!title || !selectedAngleJson) {
      return { success: false, error: 'Title and selected angle are required' }
    }

    let selectedAngle: GeneratedAngle
    try {
      selectedAngle = JSON.parse(selectedAngleJson)
    } catch (error) {
      return { success: false, error: 'Invalid angle format' }
    }

    // Get the idea if provided (as template), otherwise use direct input
    let idea = null
    const prompt = formData.get('prompt') as string
    let contentDescription = prompt || 'Direct content creation'

    if (ideaId) {
      idea = await prisma.idea.findUnique({
        where: { id: ideaId }
      })

      if (idea) {
        contentDescription = idea.description
        // Note: ideas are used as templates, not linked to presentations
      }
    }

    // Get voice profile if specified
    let voiceProfile = null
    if (voiceProfileId && voiceProfileId !== 'none') {
      voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId }
      })
    }

    // Get the framework for the selected angle
    let framework = null
    if (selectedAngle.frameworkId) {
      framework = await prisma.framework.findUnique({
        where: { id: selectedAngle.frameworkId },
        include: {
          slides: {
            orderBy: { order: 'asc' }
          }
        }
      })
    }

    // Generate slides using the selected angle approach
    const slideContents = await generatePresentationFromAngle(
      { title: idea?.title || title, description: contentDescription },
      selectedAngle,
      title,
      voiceProfile,
      framework
    )

    // Create the presentation
    const presentation = await prisma.presentation.create({
      data: {
        title,
        prompt: contentDescription,
        voiceProfileId: voiceProfileId && voiceProfileId !== 'none' ? voiceProfileId : null,
        frameworkId: selectedAngle.frameworkId || null,
        ideaId: null, // Ideas are used as templates, not linked
        selectedAngle: selectedAngle.angleTitle,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter',
        slides: {
          create: slideContents.map(slide => ({
            title: slide.title,
            content: slide.content,
            narration: slide.narration || `Speaking notes for "${slide.title}": Present the content clearly and engage with your audience.`,
            slideType: slide.slideType,
            layout: slide.layout || 'TEXT_ONLY',
            order: slide.order,
            imageUrl: getPlaceholderImageForLayout(slide.layout || 'TEXT_ONLY'),
          }))
        }
      },
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    presentationId = presentation.id
    revalidatePath('/presentations')
    revalidatePath('/ideas')
    // Auto-save brainstorm to ideas if it doesn't already exist
    if (!ideaId && prompt) {
      try {
        await prisma.idea.create({
          data: {
            title: title,
            description: contentDescription
          }
        })
      } catch (error) {
        // If it fails to create idea, continue anyway - don't block presentation creation
        console.log('Could not auto-save idea, continuing with presentation creation')
      }
    }

    revalidatePath('/presentations')
    revalidatePath('/ideas')
  } catch (error) {
    console.error('Error creating presentation from angle:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create presentation' }
  }

  redirect(`/presentations/${presentationId}`)
}