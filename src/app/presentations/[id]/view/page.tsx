import { notFound } from 'next/navigation'
import { getPresentation } from '@/lib/actions'
import PresentationViewer from '@/components/PresentationViewer'

export default async function ViewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const presentation = await getPresentation(id)
  
  if (!presentation) {
    notFound()
  }

  return (
    <PresentationViewer 
      slides={presentation.slides} 
      presentation={presentation}
      presentationId={id}
    />
  )
}