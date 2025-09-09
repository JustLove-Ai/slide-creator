'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from 'framer-motion'
import { Plus, Eye, Edit, Trash2, Search } from 'lucide-react'
import { deletePresentation } from '@/lib/actions'

interface Presentation {
  id: string
  title: string
  prompt?: string
  createdAt: string
  updatedAt: string
  slides: Array<{
    id: string
    title: string
    order: number
  }>
  voiceProfile?: {
    id: string
    name: string
  }
  framework?: {
    id: string
    name: string
  }
}

interface PresentationsListProps {
  initialPresentations: Presentation[]
}

export default function PresentationsList({ initialPresentations }: PresentationsListProps) {
  const [presentations, setPresentations] = useState<Presentation[]>(initialPresentations)
  const [filteredPresentations, setFilteredPresentations] = useState<Presentation[]>(initialPresentations)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'updatedAt' | 'slides'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let filtered = presentations.filter(presentation =>
      presentation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (presentation.prompt && presentation.prompt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (presentation.voiceProfile?.name && presentation.voiceProfile.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (presentation.framework?.name && presentation.framework.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Sort filtered results
    filtered = filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'slides':
          aValue = a.slides.length
          bValue = b.slides.length
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredPresentations(filtered)
  }, [presentations, searchTerm, sortBy, sortOrder])

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this presentation?')) return
    
    const result = await deletePresentation(id)
    
    if (result.success) {
      setPresentations(prev => prev.filter(p => p.id !== id))
    } else {
      alert(result.error || 'Failed to delete presentation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (presentations.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 bg-muted/30 rounded-lg border border-dashed"
      >
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">
          No presentations yet
        </h2>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first AI-powered presentation
        </p>
        <Button asChild size="lg">
          <Link href="/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Presentation
          </Link>
        </Button>
      </motion.div>
    )
  }

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search presentations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [column, order] = e.target.value.split('-')
              setSortBy(column as typeof sortBy)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          >
            <option value="updatedAt-desc">Last Updated</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="slides-desc">Most Slides</option>
            <option value="slides-asc">Fewest Slides</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Slides
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Voice Profile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Framework
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPresentations.map((presentation, index) => (
                <motion.tr
                  key={presentation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-muted/50"
                >
                  <td className="px-6 py-4">
                    <Link 
                      href={`/presentations/${presentation.id}`}
                      className="block group"
                    >
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {presentation.title}
                      </div>
                      {presentation.prompt && (
                        <div className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                          {presentation.prompt}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {presentation.slides.length} slides
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {presentation.voiceProfile?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {presentation.framework?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(presentation.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(presentation.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/presentations/${presentation.id}/view`}>
                          <Eye className="w-3 h-3" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/presentations/${presentation.id}`}>
                          <Edit className="w-3 h-3" />
                        </Link>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => handleDelete(presentation.id, e)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredPresentations.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-foreground mb-2">No presentations found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or create a new presentation.
            </p>
          </div>
        )}
      </div>
    </>
  )
}