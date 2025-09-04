'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize, X } from 'lucide-react'
import { parseMarkdownToHtml } from '@/lib/markdown-utils'

interface Slide {
  id: string
  title: string
  content: string
  slideType: string
  layout: 'TEXT_ONLY' | 'TITLE_COVER' | 'TEXT_IMAGE_LEFT' | 'TEXT_IMAGE_RIGHT' | 'IMAGE_FULL' | 'BULLETS_IMAGE' | 'TWO_COLUMN' | 'IMAGE_BACKGROUND'
  order: number
  imageUrl?: string
  backgroundColor?: string
  textColor?: string
  headingColor?: string
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'
}

interface Presentation {
  id: string
  title: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
}

interface PresentationViewerProps {
  slides: Slide[]
  presentation: Presentation
  presentationId: string
}

export default function PresentationViewer({ 
  slides, 
  presentation,
  presentationId 
}: PresentationViewerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentSlide = slides[currentSlideIndex]
  const totalSlides = slides.length

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault()
          nextSlide()
          break
        case 'ArrowLeft':
          event.preventDefault()
          previousSlide()
          break
        case 'Escape':
          setIsFullscreen(false)
          break
        case 'f':
        case 'F11':
          event.preventDefault()
          toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentSlideIndex])

  // Prevent scrolling in presentation mode
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => 
      prev < totalSlides - 1 ? prev + 1 : prev
    )
  }

  const previousSlide = () => {
    setCurrentSlideIndex((prev) => 
      prev > 0 ? prev - 1 : prev
    )
  }

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const getSlideBackground = (slide: Slide) => {
    if (slide.backgroundColor) {
      return { backgroundColor: slide.backgroundColor }
    }
    
    switch (slide.layout) {
      case 'TITLE_COVER':
        return { 
          background: `linear-gradient(135deg, ${presentation?.primaryColor || '#3b82f6'}, ${presentation?.secondaryColor || '#1e40af'})` 
        }
      case 'IMAGE_BACKGROUND':
        return { 
          backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : `linear-gradient(135deg, ${presentation?.primaryColor || '#3b82f6'}20, ${presentation?.secondaryColor || '#1e40af'}20)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      default:
        return { background: '#ffffff' }
    }
  }

  const getTextStyle = (slide: Slide, isTitle = false) => {
    let color
    
    // Use theme-aware colors if available
    if (isTitle && slide.headingColor) {
      color = slide.headingColor
    } else if (!isTitle && slide.textColor) {
      color = slide.textColor
    } else {
      // Fallback to layout-based colors
      color = slide.layout === 'TITLE_COVER' || slide.layout === 'IMAGE_BACKGROUND' ? 'white' : '#1f2937'
    }
    
    const align = slide.textAlign?.toLowerCase() || 'left'
    
    return {
      color,
      textAlign: align as any,
      fontFamily: presentation?.fontFamily === 'Inter' ? 'system-ui, sans-serif' : 
                 presentation?.fontFamily === 'Times' ? 'serif' : 
                 presentation?.fontFamily === 'Courier' ? 'monospace' : 'system-ui, sans-serif'
    }
  }

  const renderSlideContent = (slide: Slide) => {
    const titleStyle = getTextStyle(slide, true)
    const contentStyle = getTextStyle(slide)

    const renderImage = (className: string = '') => {
      if (slide.imageUrl) {
        return <img src={slide.imageUrl} alt="" className={`object-cover ${className}`} />
      }
      return (
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <div className="text-gray-400 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <div className="text-2xl">Image Placeholder</div>
          </div>
        </div>
      )
    }

    switch (slide.layout) {
      case 'TITLE_COVER':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-16">
            <div 
              className="text-8xl font-bold mb-8"
              style={titleStyle}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
            />
            <div 
              className="text-2xl opacity-90 max-w-4xl"
              style={contentStyle}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
            />
          </div>
        )

      case 'TEXT_IMAGE_LEFT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-12">
              {renderImage('w-full h-full rounded-2xl')}
            </div>
            <div className="w-1/2 p-12 flex flex-col justify-center">
              <div 
                className="text-6xl font-bold mb-8"
                style={titleStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
              />
              <div 
                className="text-2xl leading-relaxed"
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            </div>
          </div>
        )

      case 'TEXT_IMAGE_RIGHT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-12 flex flex-col justify-center">
              <div 
                className="text-6xl font-bold mb-8"
                style={titleStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
              />
              <div 
                className="text-2xl leading-relaxed"
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            </div>
            <div className="w-1/2 p-12">
              {renderImage('w-full h-full rounded-2xl')}
            </div>
          </div>
        )

      case 'IMAGE_FULL':
        return (
          <div className="h-full relative">
            {renderImage('w-full h-full')}
            {slide.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-12">
                <div 
                  className="text-5xl font-bold text-white"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
                />
              </div>
            )}
          </div>
        )

      case 'BULLETS_IMAGE':
        return (
          <div className="h-full flex">
            <div className="w-2/3 p-12">
              <div 
                className="text-6xl font-bold mb-12"
                style={titleStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
              />
              <div 
                className="text-2xl leading-relaxed"
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            </div>
            <div className="w-1/3 p-12">
              {renderImage('w-full h-full rounded-2xl')}
            </div>
          </div>
        )

      case 'TWO_COLUMN':
        const contentLines = slide.content.split('\n').filter(line => line.trim())
        const midPoint = Math.ceil(contentLines.length / 2)
        const leftContent = contentLines.slice(0, midPoint).join('\n')
        const rightContent = contentLines.slice(midPoint).join('\n')
        
        return (
          <div className="h-full p-12">
            <div 
              className="text-6xl font-bold mb-12 text-center"
              style={titleStyle}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
            />
            <div className="flex gap-16 h-full">
              <div className="w-1/2">
                <div 
                  className="text-2xl leading-relaxed"
                  style={contentStyle}
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(leftContent) }}
                />
              </div>
              <div className="w-1/2">
                <div 
                  className="text-2xl leading-relaxed"
                  style={contentStyle}
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(rightContent) }}
                />
              </div>
            </div>
          </div>
        )

      case 'IMAGE_BACKGROUND':
        return (
          <div className="h-full relative flex items-center justify-center text-center p-16">
            <div className="relative z-10">
              <div 
                className="text-7xl font-bold mb-8 drop-shadow-lg"
                style={{ color: 'white' }}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
              />
              <div 
                className="text-3xl drop-shadow-md"
                style={{ color: 'white' }}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          </div>
        )

      default: // TEXT_ONLY
        return (
          <div className="h-full p-12 flex flex-col justify-center">
            <div 
              className="text-6xl font-bold mb-12"
              style={titleStyle}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.title) }}
            />
            <div 
              className="text-2xl leading-relaxed"
              style={contentStyle}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
            />
          </div>
        )
    }
  }

  if (!currentSlide) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No slides found</h1>
          <a href={`/presentations/${presentationId}`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Back to Editor
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} overflow-hidden`}>
      {/* Slide Display */}
      <motion.div 
        className="h-screen flex flex-col"
        style={getSlideBackground(currentSlide)}
        key={currentSlideIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1">
          {renderSlideContent(currentSlide)}
        </div>

        {/* Progress Bar */}
        <motion.div 
          className="h-2 bg-black bg-opacity-20"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="h-full bg-white bg-opacity-80"
            initial={{ width: 0 }}
            animate={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </motion.div>

      {/* Controls Overlay */}
      <motion.div 
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-6 py-3 rounded-full flex items-center space-x-4 backdrop-blur-sm"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <button
          onClick={previousSlide}
          disabled={currentSlideIndex === 0}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            {currentSlideIndex + 1} / {totalSlides}
          </span>
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === totalSlides - 1}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-white bg-opacity-30 mx-2" />

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
        >
          <Maximize className="w-5 h-5" />
        </button>

        <a
          href={`/presentations/${presentationId}`}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
        >
          <X className="w-5 h-5" />
        </a>
      </motion.div>

      {/* Slide Navigation Thumbnails (hidden in fullscreen) */}
      {!isFullscreen && (
        <motion.div 
          className="fixed right-6 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-80 rounded-xl p-4 max-h-[70vh] overflow-y-auto backdrop-blur-sm"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          <div className="space-y-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                className={`block w-20 h-12 rounded text-xs p-2 text-left transition-all ${
                  index === currentSlideIndex
                    ? 'bg-white bg-opacity-90 text-black'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-40'
                }`}
              >
                <div className="font-medium truncate text-xs">{slide.title}</div>
                <div className="text-xs opacity-75">{index + 1}</div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Keyboard Shortcuts Help */}
      <motion.div 
        className="fixed top-6 right-6 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg backdrop-blur-sm hidden md:block"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 1 }}
      >
        <div className="space-y-1">
          <div>← → : Navigate</div>
          <div>Space : Next slide</div>
          <div>F : Toggle fullscreen</div>
          <div>Esc : Exit fullscreen</div>
        </div>
      </motion.div>
    </div>
  )
}