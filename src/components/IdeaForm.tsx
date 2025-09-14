'use client'

import { useState } from 'react'
import { createIdea, updateIdea } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Idea {
  id: string
  title: string
  description: string
}

interface IdeaFormProps {
  idea?: Idea
  mode?: 'create' | 'edit'
}

export default function IdeaForm({ idea, mode = 'create' }: IdeaFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(idea?.title || '')
  const [description, setDescription] = useState(idea?.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)

      const result = mode === 'edit' && idea
        ? await updateIdea(idea.id, formData)
        : await createIdea(formData)

      if (result.success) {
        router.push('/ideas')
      } else {
        console.error('Error saving idea:', result.error)
        alert('Failed to save idea')
      }
    } catch (error) {
      console.error('Error saving idea:', error)
      alert('Failed to save idea')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg shadow border p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
            Idea Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            placeholder="Enter a clear, descriptive title for your idea"
            required
            maxLength={100}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {title.length}/100 characters
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground resize-none"
            placeholder="Describe your presentation idea in detail. Include key points, target audience, objectives, and any specific requirements or angles you want to explore."
            required
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {description.length}/2000 characters
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="flex-1"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                {mode === 'edit' ? 'Updating...' : 'Saving...'}
              </div>
            ) : (
              mode === 'edit' ? 'Update Idea' : 'Save Idea'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ideas')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}