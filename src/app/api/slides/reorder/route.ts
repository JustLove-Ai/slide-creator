import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { presentationId, fromOrder, increment } = body

    await prisma.slide.updateMany({
      where: {
        presentationId,
        order: {
          gte: fromOrder,
        },
      },
      data: {
        order: {
          increment,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering slides:', error)
    return NextResponse.json(
      { error: 'Failed to reorder slides' },
      { status: 500 }
    )
  }
}