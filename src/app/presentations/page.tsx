import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { getPresentations } from '@/lib/actions'
import PresentationsList from '@/components/PresentationsList'


export default async function PresentationsPage() {
  const presentations = await getPresentations()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Presentations
          </h1>
          <p className="text-muted-foreground">
            {presentations.length} presentation{presentations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Presentation
          </Link>
        </Button>
      </div>

      <PresentationsList initialPresentations={presentations} />
    </div>
  )
}