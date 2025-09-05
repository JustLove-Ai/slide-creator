'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize, X, MessageSquare, Eye, EyeOff } from 'lucide-react'
import { useTheme } from 'next-themes'
import { parseMarkdownToHtml } from '@/lib/markdown-utils'
import { getThemeColorsForSlide } from '@/lib/theme-utils'

interface Slide {
  id: string
  title: string
  content: string
  narration?: string
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
  const [narrationVisible, setNarrationVisible] = useState(false)
  const { theme } = useTheme()

  const currentSlide = slides[currentSlideIndex]
  const totalSlides = slides.length

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => 
      prev < totalSlides - 1 ? prev + 1 : prev
    )
  }, [totalSlides])

  const previousSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => 
      prev > 0 ? prev - 1 : prev
    )
  }, [])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlideIndex(index)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

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
        case 'v':
        case 'V':
          event.preventDefault()
          setNarrationVisible(!narrationVisible)
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [nextSlide, previousSlide, toggleFullscreen, narrationVisible])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const getSlideBackground = (slide: Slide) => {
    const systemTheme = (theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'
    const themeColors = getThemeColorsForSlide(slide, presentation, systemTheme)
    
    if (slide.backgroundColor) {
      return { backgroundColor: slide.backgroundColor }
    }
    
    switch (slide.layout) {
      case 'TITLE_COVER':
        return { 
          background: `linear-gradient(135deg, ${presentation.primaryColor}, ${presentation.secondaryColor})` 
        }
      case 'IMAGE_BACKGROUND':
        return { 
          backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : `linear-gradient(135deg, ${presentation.primaryColor}20, ${presentation.secondaryColor}20)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      default:
        return { backgroundColor: themeColors.backgroundColor }
    }
  }

  const getTextStyle = (slide: Slide, isTitle = false) => {
    const systemTheme = (theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'
    const themeColors = getThemeColorsForSlide(slide, presentation, systemTheme)
    
    let color
    
    if (isTitle && slide.headingColor) {
      color = slide.headingColor
    } else if (!isTitle && slide.textColor) {
      color = slide.textColor
    } else {
      color = isTitle ? themeColors.headingColor : themeColors.textColor
    }
    
    const align = slide.textAlign?.toLowerCase() || 'left'
    
    return {
      color,
      textAlign: align as any,
      fontFamily: presentation.fontFamily === 'Inter' ? 'system-ui, sans-serif' : 
                  presentation.fontFamily === 'Georgia' ? 'Georgia, serif' : 
                  presentation.fontFamily
    }
  }

  const renderSlideContent = (slide: Slide) => {
    const titleStyle = getTextStyle(slide, true)
    const contentStyle = getTextStyle(slide)

    switch (slide.layout) {
      case 'TITLE_COVER':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center px-20 py-16">
            <h1 
              className="text-6xl font-bold mb-8 leading-tight"
              style={titleStyle}
            >
              {slide.title}
            </h1>
            {slide.content && (
              <div 
                className="text-xl max-w-4xl"
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            )}
          </div>
        )

      case 'TEXT_IMAGE_LEFT':
        return (
          <div className="h-full flex">
            <div className="w-1/2">
              {slide.imageUrl && <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="w-1/2 px-16 py-12 flex flex-col justify-center">
              <h1 
                className="text-4xl font-bold mb-8 leading-tight"
                style={titleStyle}
              >
                {slide.title}
              </h1>
              <div 
                className="text-lg leading-relaxed prose prose-lg max-w-none"
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            </div>
          </div>
        )

      case 'TEXT_IMAGE_RIGHT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 px-16 py-12 flex flex-col justify-center">
              <h1 
                className="text-4xl font-bold mb-8 leading-tight"
                style={titleStyle}
              >
                {slide.title}
              </h1>
              <div 
                className="text-lg leading-relaxed prose prose-lg max-w-none"
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
              />
            </div>
            <div className="w-1/2">
              {slide.imageUrl && <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
          </div>
        )

      default:
        return (
          <div className="h-full px-16 py-12 flex flex-col justify-center">
            <h1 
              className="text-4xl font-bold mb-10 leading-tight"
              style={titleStyle}
            >
              {slide.title}
            </h1>
            <div 
              className="text-lg leading-loose prose prose-lg max-w-none flex-1"
              style={contentStyle}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(slide.content) }}
            />
          </div>
        )
    }
  }

  if (!currentSlide) return null

  return (
    <div className="fixed inset-0 bg-background flex">
      <div className={`flex-1 transition-all duration-300 ${narrationVisible && !isFullscreen ? 'mr-96' : ''}`}>
        {/* Slide Content */}
        <motion.div
          key={currentSlideIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-screen w-full relative overflow-hidden"
          style={getSlideBackground(currentSlide)}
        >
          {renderSlideContent(currentSlide)}
        </motion.div>

        {/* Navigation Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
          <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-4">
            <button
              onClick={previousSlide}
              disabled={currentSlideIndex === 0}
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm font-medium min-w-[60px] text-center">
              {currentSlideIndex + 1} / {totalSlides}
            </span>

            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === totalSlides - 1}
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-white bg-opacity-30 mx-2" />

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
              title="Toggle fullscreen (F)"
            >
              <Maximize className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-white bg-opacity-30 mx-2" />
            
            <button
              onClick={() => setNarrationVisible(!narrationVisible)}
              className={`p-2 rounded-full transition-all ${
                narrationVisible ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-20'
              }`}
              title="Toggle narration visibility (V)"
            >
              {narrationVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            <div className="w-px h-6 bg-white bg-opacity-30 mx-2" />
            
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
              title="Exit presentation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-20 z-30">
          <motion.div
            className="h-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Single Slide Thumbnail */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40">
          <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-lg p-2">
            <button
              className="w-16 h-12 rounded border-2 border-white transition-all"
              style={{
                ...getSlideBackground(currentSlide),
                fontSize: '6px',
                padding: '2px'
              }}
              title={`Current slide: ${currentSlide.title}`}
            >
              <div className="w-full h-full flex items-center justify-center text-white text-center overflow-hidden">
                <span className="text-[6px] leading-tight">{currentSlide.title}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Narration Sidebar */}
      {narrationVisible && !isFullscreen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Speaker Notes - Slide {currentSlideIndex + 1}
            </h3>
            <button
              onClick={() => setNarrationVisible(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Current Slide:</h4>
              <p className="text-sm font-semibold text-foreground">{currentSlide.title}</p>
            </div>
            
            {currentSlide.narration ? (
              <div className="prose prose-sm max-w-none text-foreground">
                <div dangerouslySetInnerHTML={{ 
                  __html: currentSlide.narration.replace(/\n/g, '<br>') 
                }} />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No speaker notes available for this slide</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}