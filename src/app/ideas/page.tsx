import { getIdeas } from '@/lib/actions'
import IdeasList from '@/components/IdeasList'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function IdeasPage() {
  const ideas = await getIdeas()

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Ideas
            </h1>
            <p className="text-muted-foreground">
              Manage your presentation ideas and create presentations from them
            </p>
          </div>
          <Button asChild>
            <Link href="/ideas/new">
              <Plus className="w-4 h-4 mr-2" />
              Add New Idea
            </Link>
          </Button>
        </div>

        <IdeasList initialIdeas={ideas} />
      </div>
    </main>
  )
}