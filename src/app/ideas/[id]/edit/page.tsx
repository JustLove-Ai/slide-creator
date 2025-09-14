import { getIdea } from '@/lib/actions'
import IdeaForm from '@/components/IdeaForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

interface EditIdeaPageProps {
  params: {
    id: string
  }
}

export default async function EditIdeaPage({ params }: EditIdeaPageProps) {
  const idea = await getIdea(params.id)

  if (!idea) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/ideas">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ideas
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Edit Idea
          </h1>
          <p className="text-muted-foreground">
            Update your presentation idea
          </p>
        </div>

        <IdeaForm
          idea={{
            id: idea.id,
            title: idea.title,
            description: idea.description
          }}
          mode="edit"
        />
      </div>
    </main>
  )
}