'use client'

import { useState } from 'react'

interface Slide {
  id: string
  title: string
  content: string
  slideType: string
  order: number
}

interface SlideEditorProps {
  slide: Slide
  presentationId: string
  onSave: (slide: Slide) => Promise<void>
  onDelete: (slideId: string) => Promise<void>
  onRegenerate: (slideId: string) => Promise<void>
}

export default function SlideEditor({ 
  slide, 
  presentationId, 
  onSave, 
  onDelete, 
  onRegenerate 
}: SlideEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(slide.title)
  const [content, setContent] = useState(slide.content)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave({
        ...slide,
        title,
        content,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving slide:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setTitle(slide.title)
    setContent(slide.content)
    setIsEditing(false)
  }

  const handleRegenerate = async () => {
    setIsLoading(true)
    try {
      await onRegenerate(slide.id)
    } catch (error) {
      console.error('Error regenerating slide:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSlideTypeColor = (type: string) => {
    switch (type) {
      case 'TITLE': return 'bg-purple-100 text-purple-800'
      case 'INTRO': return 'bg-blue-100 text-blue-800'
      case 'CONTENT': return 'bg-green-100 text-green-800'
      case 'CONCLUSION': return 'bg-orange-100 text-orange-800'
      case 'NEXT_STEPS': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-500">
            Slide {slide.order}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSlideTypeColor(slide.slideType)}`}>
            {slide.slideType.replace('_', ' ')}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
              >
                {isLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => onDelete(slide.id)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {slide.title}
            </h3>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {slide.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}