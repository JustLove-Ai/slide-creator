'use client'

import { useState } from 'react'
import { deleteIdea } from '@/lib/actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Play, Search } from 'lucide-react'

interface Idea {
  id: string
  title: string
  description: string
  createdAt: Date
  presentations: Array<{
    id: string
    title: string
    createdAt: Date
    selectedAngle?: string
  }>
}

interface IdeasListProps {
  initialIdeas: Idea[]
}

export default function IdeasList({ initialIdeas }: IdeasListProps) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      const result = await deleteIdea(id)
      if (result.success) {
        setIdeas(ideas.filter(idea => idea.id !== id))
      } else {
        console.error('Error deleting idea:', result.error)
        alert('Failed to delete idea')
      }
    } catch (error) {
      console.error('Error deleting idea:', error)
      alert('Failed to delete idea')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-card rounded-lg shadow border">
      {/* Search Bar */}
      <div className="p-6 border-b">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Ideas Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Idea</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Created</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Presentations</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIdeas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  {searchTerm ? 'No ideas match your search.' : 'No ideas yet. Create your first idea to get started!'}
                </td>
              </tr>
            ) : (
              filteredIdeas.map((idea) => (
                <tr key={idea.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <h3 className="font-medium text-card-foreground">{idea.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {idea.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(idea.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="font-medium text-card-foreground">
                        {idea.presentations.length}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        {idea.presentations.length === 1 ? 'presentation' : 'presentations'}
                      </span>
                      {idea.presentations.length > 0 && (
                        <div className="mt-1">
                          {idea.presentations.slice(0, 2).map(presentation => (
                            <div key={presentation.id} className="text-xs text-muted-foreground">
                              <Link
                                href={`/presentations/${presentation.id}`}
                                className="hover:text-foreground hover:underline"
                              >
                                {presentation.title}
                                {presentation.selectedAngle && (
                                  <span className="ml-2 px-1 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                    {presentation.selectedAngle}
                                  </span>
                                )}
                              </Link>
                            </div>
                          ))}
                          {idea.presentations.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{idea.presentations.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/create?ideaId=${idea.id}`}>
                          <Play className="w-3 h-3 mr-1" />
                          Create
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/ideas/${idea.id}/edit`}>
                          <Edit className="w-3 h-3" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(idea.id)}
                        disabled={deletingId === idea.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === idea.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive"></div>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}