import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { regenerateSlideContent } from '@/lib/ai-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { additionalContext } = body

    const slide = await prisma.slide.findUnique({
      where: { id: params.id },
      include: {
        presentation: true
      }
    })

    if (!slide) {
      return NextResponse.json(
        { error: 'Slide not found' },
        { status: 404 }
      )
    }

    const regeneratedSlide = await regenerateSlideContent(
      {
        title: slide.title,
        content: slide.content,
        slideType: slide.slideType as any,
        order: slide.order
      },
      slide.presentation.prompt,
      additionalContext
    )

    return NextResponse.json({
      original: {
        id: slide.id,
        title: slide.title,
        content: slide.content,
        slideType: slide.slideType,
        order: slide.order
      },
      regenerated: regeneratedSlide
    })
  } catch (error) {
    console.error('Error regenerating slide:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate slide' },
      { status: 500 }
    )
  }
}