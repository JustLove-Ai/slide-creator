import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { 
      title, 
      content, 
      layout, 
      imageUrl, 
      backgroundColor, 
      textColor,
      headingColor,
      textAlign 
    } = body

    const slide = await prisma.slide.update({
      where: { id: params.id },
      data: { 
        title, 
        content,
        layout: layout || 'TEXT_ONLY',
        imageUrl,
        backgroundColor,
        textColor,
        headingColor,
        textAlign: textAlign || 'LEFT'
      },
    })

    return NextResponse.json(slide)
  } catch (error) {
    console.error('Error updating slide:', error)
    return NextResponse.json(
      { error: 'Failed to update slide' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slide = await prisma.slide.findUnique({
      where: { id: params.id },
      select: { presentationId: true, order: true }
    })

    if (!slide) {
      return NextResponse.json(
        { error: 'Slide not found' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.slide.delete({
        where: { id: params.id }
      })

      await tx.slide.updateMany({
        where: {
          presentationId: slide.presentationId,
          order: {
            gt: slide.order
          }
        },
        data: {
          order: {
            decrement: 1
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting slide:', error)
    return NextResponse.json(
      { error: 'Failed to delete slide' },
      { status: 500 }
    )
  }
}