'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

// Helper function to generate basic speaker notes for slides
function generateSpeakerNotes(slide: any): string {
  const slideTypeNotes = {
    'TITLE': `Welcome everyone to this presentation on "${slide.title}". This opening slide sets the stage for what we'll be covering today.`,
    'INTRO': `This slide introduces the main topic. Take your time to explain the key concepts and make sure the audience understands the context.`,
    'CONTENT': `This is a key content slide. Walk through each point clearly and provide examples where relevant. Engage with the audience and check for understanding.`,
    'CONCLUSION': `We're now reaching the conclusion. Summarize the main points and reinforce the key takeaways from this presentation.`,
    'NEXT_STEPS': `Conclude with clear next steps. Make sure the audience knows what actions to take and provide any necessary resources or contact information.`
  }
  
  return slideTypeNotes[slide.slideType as keyof typeof slideTypeNotes] || 
         `Speaker notes for "${slide.title}": Review the content on this slide and present it clearly to your audience. Take time to explain any complex concepts.`
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
    name: "What-Why-How Framework",
    description: "Perfect for explaining concepts, processes, or solutions. Structures content around what something is, why it matters, and how to implement it.",
    isDefault: true,
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
  try {
    const title = formData.get('title') as string
    const prompt = formData.get('prompt') as string
    const voiceProfileId = formData.get('voiceProfileId') as string
    const frameworkId = formData.get('frameworkId') as string

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

    // Import generateSlideContent
    const { generateSlideContent } = await import('@/lib/ai-service')

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
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter',
        slides: {
          create: slideContents.map(slide => ({
            title: slide.title,
            content: slide.content,
            narration: generateSpeakerNotes(slide),
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

    revalidatePath('/presentations')
    redirect(`/presentations/${presentation.id}`)
  } catch (error) {
    console.error('Error creating presentation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create presentation' }
  }
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

    // Import regenerateSlideContent
    const { regenerateSlideContent } = await import('@/lib/ai-service')

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