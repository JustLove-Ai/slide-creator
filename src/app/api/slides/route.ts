import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { presentationId, title, content, slideType, layout, order } = body

    const slide = await prisma.slide.create({
      data: {
        title,
        content,
        slideType,
        layout: layout || 'TEXT_ONLY',
        order,
        presentationId,
      },
    })

    return NextResponse.json(slide)
  } catch (error) {
    console.error('Error creating slide:', error)
    return NextResponse.json(
      { error: 'Failed to create slide' },
      { status: 500 }
    )
  }
}