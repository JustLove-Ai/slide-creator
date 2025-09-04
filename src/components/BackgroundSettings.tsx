'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  X, 
  Palette, 
  Type, 
  Layout,
  Check,
  Sun,
  Moon,
  Zap
} from 'lucide-react'

interface ThemePreset {
  id: string
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  backgroundColor: string
  textColor: string
  headingColor: string
  icon: React.ReactNode
}

const themePresets: ThemePreset[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Clean and professional',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF', 
    fontFamily: 'Inter',
    backgroundColor: '#FFFFFF',
    textColor: '#374151',
    headingColor: '#111827',
    icon: <Sun className="w-4 h-4" />
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Modern and sleek',
    primaryColor: '#60A5FA',
    secondaryColor: '#93C5FD',
    fontFamily: 'Inter',
    backgroundColor: '#1F2937',
    textColor: '#D1D5DB',
    headingColor: '#F9FAFB',
    icon: <Moon className="w-4 h-4" />
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep black elegance',
    primaryColor: '#A855F7',
    secondaryColor: '#C084FC',
    fontFamily: 'Inter',
    backgroundColor: '#0F0F23',
    textColor: '#C7D2FE',
    headingColor: '#E0E7FF',
    icon: <Moon className="w-4 h-4" />
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural and calming',
    primaryColor: '#10B981',
    secondaryColor: '#34D399',
    fontFamily: 'Inter',
    backgroundColor: '#064E3B',
    textColor: '#A7F3D0',
    headingColor: '#D1FAE5',
    icon: <Sun className="w-4 h-4" />
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm and inviting',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    fontFamily: 'Inter',
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    headingColor: '#78350F',
    icon: <Zap className="w-4 h-4" />
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool and refreshing',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0284C7',
    fontFamily: 'Inter',
    backgroundColor: '#F0F9FF',
    textColor: '#0C4A6E',
    headingColor: '#0B4B66',
    icon: <Sun className="w-4 h-4" />
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional business',
    primaryColor: '#374151',
    secondaryColor: '#6B7280',
    fontFamily: 'Times',
    backgroundColor: '#F9FAFB',
    textColor: '#4B5563',
    headingColor: '#1F2937',
    icon: <Sun className="w-4 h-4" />
  }
]

const fontFamilies = [
  { value: 'Inter', label: 'Inter (Sans-serif)' },
  { value: 'Times', label: 'Times (Serif)' },
  { value: 'Courier', label: 'Courier (Monospace)' }
]

interface Presentation {
  id: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
}

interface Slide {
  id: string
  backgroundColor?: string
  textColor?: string
  headingColor?: string
}

interface BackgroundSettingsProps {
  presentation: Presentation
  slide?: Slide
  onUpdatePresentation: (updates: Partial<Presentation>) => Promise<void>
  onUpdateSlide?: (updates: Partial<Slide>) => Promise<void>
  onApplyThemeToAllSlides?: (themeUpdates: { backgroundColor?: string, textColor?: string, headingColor?: string }) => Promise<void>
  applyToAllSlides: boolean
  onApplyToAllChange: (apply: boolean) => void
  isOpen: boolean
  onClose: () => void
}

export default function BackgroundSettings({
  presentation,
  slide,
  onUpdatePresentation,
  onUpdateSlide,
  onApplyThemeToAllSlides,
  applyToAllSlides,
  onApplyToAllChange,
  isOpen,
  onClose
}: BackgroundSettingsProps) {
  const [activeTab, setActiveTab] = useState<'themes' | 'colors' | 'fonts'>('themes')
  const [customPrimaryColor, setCustomPrimaryColor] = useState(presentation.primaryColor)
  const [customSecondaryColor, setCustomSecondaryColor] = useState(presentation.secondaryColor)
  const [customFontFamily, setCustomFontFamily] = useState(presentation.fontFamily)
  const [slideBackgroundColor, setSlideBackgroundColor] = useState(slide?.backgroundColor || '#ffffff')

  const handleThemeSelect = async (theme: ThemePreset) => {
    // Always reset to theme defaults when theme is clicked
    const themeColors = {
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      fontFamily: theme.fontFamily
    }
    
    const slideThemeUpdates = {
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      headingColor: theme.headingColor
    }
    
    if (applyToAllSlides) {
      // Update presentation defaults
      await onUpdatePresentation(themeColors)
      
      // Apply theme to all slides using the dedicated function
      if (onApplyThemeToAllSlides) {
        await onApplyThemeToAllSlides(slideThemeUpdates)
      }
    } else {
      // Only update current slide with complete theme, no presentation changes
      if (onUpdateSlide && slide) {
        await onUpdateSlide(slideThemeUpdates)
        setSlideBackgroundColor(theme.backgroundColor)
      }
      
      // Update local state for preview purposes only (don't save to presentation)
      setCustomPrimaryColor(theme.primaryColor)
      setCustomSecondaryColor(theme.secondaryColor)
      setCustomFontFamily(theme.fontFamily)
    }
  }

  const handleColorChange = async (type: 'primary' | 'secondary', color: string) => {
    const updates = type === 'primary' 
      ? { primaryColor: color }
      : { secondaryColor: color }
    
    // Only update presentation if applying to all slides
    if (applyToAllSlides) {
      await onUpdatePresentation(updates)
    }
    
    if (type === 'primary') {
      setCustomPrimaryColor(color)
    } else {
      setCustomSecondaryColor(color)
    }
  }

  const handleFontChange = async (fontFamily: string) => {
    // Only update presentation if applying to all slides
    if (applyToAllSlides) {
      await onUpdatePresentation({ fontFamily })
    }
    setCustomFontFamily(fontFamily)
  }

  const handleSlideBackgroundChange = async (backgroundColor: string) => {
    if (onUpdateSlide && slide) {
      await onUpdateSlide({ backgroundColor })
      setSlideBackgroundColor(backgroundColor)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Presentation Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Apply to All Toggle */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={applyToAllSlides}
                  onChange={(e) => onApplyToAllChange(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  applyToAllSlides ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                    applyToAllSlides ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Apply to All Slides</div>
                <div className="text-sm text-gray-500">Changes will affect all slides in the presentation</div>
              </div>
            </label>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {['themes', 'colors', 'fonts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-6 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'themes' && <Palette className="w-4 h-4 inline mr-2" />}
                {tab === 'colors' && <Layout className="w-4 h-4 inline mr-2" />}
                {tab === 'fonts' && <Type className="w-4 h-4 inline mr-2" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'themes' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Choose a Theme</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {themePresets.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme)}
                        className="flex flex-col p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-all text-left group relative"
                        style={{ backgroundColor: theme.backgroundColor }}
                      >
                        {/* Theme preview */}
                        <div className="h-16 rounded-md mb-3 relative overflow-hidden" style={{ 
                          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` 
                        }}>
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            {theme.icon}
                          </div>
                        </div>
                        
                        {/* Theme info */}
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1" style={{ 
                            color: theme.backgroundColor === '#FFFFFF' || theme.backgroundColor === '#F9FAFB' || theme.backgroundColor === '#F0F9FF' || theme.backgroundColor === '#FEF3C7' ? '#1F2937' : '#FFFFFF' 
                          }}>
                            {theme.name}
                          </div>
                          <div className="text-xs opacity-75" style={{ 
                            color: theme.backgroundColor === '#FFFFFF' || theme.backgroundColor === '#F9FAFB' || theme.backgroundColor === '#F0F9FF' || theme.backgroundColor === '#FEF3C7' ? '#6B7280' : '#D1D5DB' 
                          }}>
                            {theme.description}
                          </div>
                        </div>
                        
                        {/* Selection indicator */}
                        {(presentation.primaryColor === theme.primaryColor && 
                          presentation.secondaryColor === theme.secondaryColor) && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-green-600 bg-white rounded-full p-0.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Custom Colors</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customPrimaryColor}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customPrimaryColor}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customSecondaryColor}
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customSecondaryColor}
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          placeholder="#1E40AF"
                        />
                      </div>
                    </div>

                    {slide && onUpdateSlide && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          This Slide Background Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={slideBackgroundColor}
                            onChange={(e) => handleSlideBackgroundChange(e.target.value)}
                            className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={slideBackgroundColor}
                            onChange={(e) => handleSlideBackgroundChange(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                            placeholder="#ffffff"
                          />
                          <button
                            onClick={() => handleSlideBackgroundChange('#ffffff')}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Color Preview */}
                <div className="p-4 rounded-lg border-2 border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div 
                    className="h-24 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ 
                      background: `linear-gradient(135deg, ${customPrimaryColor}, ${customSecondaryColor})` 
                    }}
                  >
                    Sample Slide Background
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Font Family</h3>
                  <div className="space-y-2">
                    {fontFamilies.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleFontChange(font.value)}
                        className={`w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left ${
                          customFontFamily === font.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <span 
                          className="font-medium"
                          style={{ 
                            fontFamily: font.value === 'Inter' ? 'system-ui, sans-serif' :
                                       font.value === 'Times' ? 'serif' :
                                       font.value === 'Courier' ? 'monospace' : 'inherit'
                          }}
                        >
                          {font.label}
                        </span>
                        {customFontFamily === font.value && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Preview */}
                <div className="p-4 rounded-lg border-2 border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div 
                    className="space-y-2"
                    style={{ 
                      fontFamily: customFontFamily === 'Inter' ? 'system-ui, sans-serif' :
                                 customFontFamily === 'Times' ? 'serif' :
                                 customFontFamily === 'Courier' ? 'monospace' : 'inherit'
                    }}
                  >
                    <div className="text-2xl font-bold" style={{ color: customPrimaryColor }}>
                      Sample Slide Title
                    </div>
                    <div className="text-gray-700">
                      This is how your slide content will appear with the selected font family.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}