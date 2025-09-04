'use client'

import { useState } from 'react'
import { Edit3, Trash2, RefreshCw, Image as ImageIcon, Palette } from 'lucide-react'
import LayoutSelector, { SlideLayoutType } from './LayoutSelector'
import SlidePreview from './SlidePreview'

interface Slide {
  id: string
  title: string
  content: string
  slideType: string
  layout: SlideLayoutType
  order: number
  imageUrl?: string
  backgroundColor?: string
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'
  customStyles?: string
}

interface Presentation {
  id: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
}

interface ModernSlideEditorProps {
  slide: Slide
  presentation: Presentation
  onSave: (slide: Slide) => Promise<void>
  onDelete: (slideId: string) => Promise<void>
  onRegenerate: (slideId: string) => Promise<void>
}

export default function ModernSlideEditor({ 
  slide, 
  presentation,
  onSave, 
  onDelete, 
  onRegenerate 
}: ModernSlideEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(slide.title)
  const [content, setContent] = useState(slide.content)
  const [layout, setLayout] = useState<SlideLayoutType>(slide.layout || 'TEXT_ONLY')
  const [imageUrl, setImageUrl] = useState(slide.imageUrl || '')
  const [backgroundColor, setBackgroundColor] = useState(slide.backgroundColor || '')
  const [textAlign, setTextAlign] = useState<'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'>(slide.textAlign || 'LEFT')
  const [isLoading, setIsLoading] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave({
        ...slide,
        title,
        content,
        layout,
        imageUrl,
        backgroundColor,
        textAlign,
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
    setLayout(slide.layout || 'TEXT_ONLY')
    setImageUrl(slide.imageUrl || '')
    setBackgroundColor(slide.backgroundColor || '')
    setTextAlign(slide.textAlign || 'LEFT')
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
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-500">
            Slide {slide.order}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSlideTypeColor(slide.slideType)}`}>
            {slide.slideType.replace('_', ' ')}
          </span>
          {!isEditing && (
            <LayoutSelector 
              currentLayout={layout} 
              onLayoutChange={(newLayout) => {
                setLayout(newLayout)
                if (!isEditing) {
                  handleSave()
                }
              }} 
            />
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium px-3 py-1 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => onDelete(slide.id)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Editor Panel */}
        <div className="space-y-6">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slide Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter slide title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Enter your content here. Use ## for headings, - for bullet points..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports: ## Headings, - Bullet points, **Bold**, *Italic*
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Layout
                  </label>
                  <LayoutSelector currentLayout={layout} onLayoutChange={setLayout} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Alignment
                  </label>
                  <select
                    value={textAlign}
                    onChange={(e) => setTextAlign(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LEFT">Left</option>
                    <option value="CENTER">Center</option>
                    <option value="RIGHT">Right</option>
                    <option value="JUSTIFY">Justify</option>
                  </select>
                </div>
              </div>

              {(layout.includes('IMAGE') || layout.includes('BULLETS')) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    <button
                      onClick={() => setShowImageUpload(true)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#ffffff or transparent"
                  />
                  <button
                    onClick={() => setBackgroundColor('')}
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {slide.title}
                </h3>
                <div className="text-sm text-gray-600 mb-4">
                  Layout: {layout.replace('_', ' ').toLowerCase()}
                  {slide.imageUrl && ' • Has image'}
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {slide.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Live Preview</h4>
            <div className="text-xs text-gray-500">
              16:9 aspect ratio
            </div>
          </div>
          
          <SlidePreview
            title={title}
            content={content}
            layout={layout}
            imageUrl={imageUrl}
            backgroundColor={backgroundColor}
            primaryColor={presentation.primaryColor}
            secondaryColor={presentation.secondaryColor}
            fontFamily={presentation.fontFamily}
            textAlign={textAlign}
            className="shadow-md"
          />
        </div>
      </div>
    </div>
  )
}