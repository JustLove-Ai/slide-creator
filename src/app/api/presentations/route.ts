import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateSlideContent } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, prompt } = body

    if (!title || !prompt) {
      return NextResponse.json(
        { error: 'Title and prompt are required' },
        { status: 400 }
      )
    }

    const slideContents = await generateSlideContent(prompt, title)

    const presentation = await prisma.presentation.create({
      data: {
        title,
        description,
        prompt,
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        fontFamily: 'Inter',
        slides: {
          create: slideContents.map(slide => ({
            title: slide.title,
            content: slide.content,
            slideType: slide.slideType,
            layout: slide.layout || 'TEXT_ONLY',
            order: slide.order,
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

    return NextResponse.json(presentation)
  } catch (error) {
    console.error('Error creating presentation:', error)
    return NextResponse.json(
      { error: 'Failed to create presentation' },
      { status: 500 }
    )
  }
}

export async function GET() {
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

    return NextResponse.json(presentations)
  } catch (error) {
    console.error('Error fetching presentations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch presentations' },
      { status: 500 }
    )
  }
}