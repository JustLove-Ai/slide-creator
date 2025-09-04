'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
    const layout = formData.get('layout') as string
    const imageUrl = formData.get('imageUrl') as string
    const backgroundColor = formData.get('backgroundColor') as string
    const textColor = formData.get('textColor') as string
    const headingColor = formData.get('headingColor') as string
    const textAlign = formData.get('textAlign') as string

    const slide = await prisma.slide.update({
      where: { id: slideId },
      data: {
        title,
        content,
        layout: layout as any,
        imageUrl: imageUrl || null,
        backgroundColor: backgroundColor || null,
        textColor: textColor || null,
        headingColor: headingColor || null,
        textAlign: (textAlign as any) || 'LEFT',
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