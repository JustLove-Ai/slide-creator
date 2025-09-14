import IdeaForm from '@/components/IdeaForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewIdeaPage() {
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
            Add New Idea
          </h1>
          <p className="text-muted-foreground">
            Capture your presentation idea to develop later
          </p>
        </div>

        <IdeaForm />
      </div>
    </main>
  )
}