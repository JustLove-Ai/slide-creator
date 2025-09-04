'use client'

import { useState } from 'react'
import { Layout, Type, Image, FileText, Grid, Presentation } from 'lucide-react'

export type SlideLayoutType = 
  | 'TEXT_ONLY' 
  | 'TITLE_COVER' 
  | 'TEXT_IMAGE_LEFT' 
  | 'TEXT_IMAGE_RIGHT' 
  | 'IMAGE_FULL' 
  | 'BULLETS_IMAGE' 
  | 'TWO_COLUMN' 
  | 'IMAGE_BACKGROUND'

interface LayoutOption {
  id: SlideLayoutType
  name: string
  description: string
  icon: React.ReactNode
  preview: string
}

interface LayoutSelectorProps {
  currentLayout: SlideLayoutType
  onLayoutChange: (layout: SlideLayoutType) => void
}

const layoutOptions: LayoutOption[] = [
  {
    id: 'TEXT_ONLY',
    name: 'Text Only',
    description: 'Simple text-based slide',
    icon: <Type className="w-4 h-4" />,
    preview: 'bg-gradient-to-br from-gray-100 to-gray-200'
  },
  {
    id: 'TITLE_COVER',
    name: 'Title Cover',
    description: 'Large title slide with subtitle',
    icon: <Presentation className="w-4 h-4" />,
    preview: 'bg-gradient-to-br from-blue-500 to-purple-600'
  },
  {
    id: 'TEXT_IMAGE_LEFT',
    name: 'Text + Image Left',
    description: 'Image on left, text on right',
    icon: <Layout className="w-4 h-4" />,
    preview: 'bg-gradient-to-r from-green-200 to-blue-200'
  },
  {
    id: 'TEXT_IMAGE_RIGHT',
    name: 'Text + Image Right',
    description: 'Text on left, image on right',
    icon: <Layout className="w-4 h-4 scale-x-[-1]" />,
    preview: 'bg-gradient-to-r from-blue-200 to-green-200'
  },
  {
    id: 'IMAGE_FULL',
    name: 'Full Image',
    description: 'Image covers entire slide',
    icon: <Image className="w-4 h-4" />,
    preview: 'bg-gradient-to-br from-purple-400 to-pink-400'
  },
  {
    id: 'BULLETS_IMAGE',
    name: 'Bullets + Image',
    description: 'Bullet points with supporting image',
    icon: <FileText className="w-4 h-4" />,
    preview: 'bg-gradient-to-br from-orange-300 to-red-300'
  },
  {
    id: 'TWO_COLUMN',
    name: 'Two Columns',
    description: 'Side-by-side content layout',
    icon: <Grid className="w-4 h-4" />,
    preview: 'bg-gradient-to-r from-teal-200 to-cyan-200'
  },
  {
    id: 'IMAGE_BACKGROUND',
    name: 'Image Background',
    description: 'Text over background image',
    icon: <Image className="w-4 h-4 opacity-50" />,
    preview: 'bg-gradient-to-br from-indigo-400 to-purple-500'
  }
]

export default function LayoutSelector({ currentLayout, onLayoutChange }: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentLayoutOption = layoutOptions.find(option => option.id === currentLayout)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        {currentLayoutOption?.icon}
        <span className="text-sm font-medium">{currentLayoutOption?.name}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Choose Layout</h3>
            <div className="grid grid-cols-2 gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onLayoutChange(option.id)
                    setIsOpen(false)
                  }}
                  className={`p-3 rounded-lg border-2 transition-all hover:border-blue-300 ${
                    currentLayout === option.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-full h-16 rounded ${option.preview} mb-2 flex items-center justify-center`}>
                    <div className="text-white/80">
                      {option.icon}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-medium text-gray-900 mb-1">
                      {option.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}