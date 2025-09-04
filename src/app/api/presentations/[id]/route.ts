import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const presentation = await prisma.presentation.findUnique({
      where: { id: params.id },
      include: {
        slides: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!presentation) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(presentation)
  } catch (error) {
    console.error('Error fetching presentation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch presentation' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, description } = body

    const presentation = await prisma.presentation.update({
      where: { id: params.id },
      data: { title, description },
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
    console.error('Error updating presentation:', error)
    return NextResponse.json(
      { error: 'Failed to update presentation' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, description, primaryColor, secondaryColor, fontFamily } = body

    const presentation = await prisma.presentation.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(fontFamily && { fontFamily }),
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
    console.error('Error updating presentation:', error)
    return NextResponse.json(
      { error: 'Failed to update presentation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.presentation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting presentation:', error)
    return NextResponse.json(
      { error: 'Failed to delete presentation' },
      { status: 500 }
    )
  }
}