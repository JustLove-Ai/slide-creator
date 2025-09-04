'use client'

import { SlideLayoutType } from './LayoutSelector'

interface SlidePreviewProps {
  title: string
  content: string
  layout: SlideLayoutType
  imageUrl?: string
  backgroundColor?: string
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY'
  className?: string
}

export default function SlidePreview({
  title,
  content,
  layout,
  imageUrl,
  backgroundColor,
  primaryColor = '#3b82f6',
  secondaryColor = '#1e40af',
  fontFamily = 'Inter',
  textAlign = 'LEFT',
  className = ''
}: SlidePreviewProps) {
  
  const getTextAlignment = () => {
    switch (textAlign) {
      case 'CENTER': return 'text-center'
      case 'RIGHT': return 'text-right'
      case 'JUSTIFY': return 'text-justify'
      default: return 'text-left'
    }
  }

  const getFontFamily = () => {
    switch (fontFamily) {
      case 'Inter': return 'font-sans'
      case 'Times': return 'font-serif'
      case 'Courier': return 'font-mono'
      default: return 'font-sans'
    }
  }

  const getBackgroundStyle = () => {
    if (backgroundColor) {
      return { backgroundColor }
    }
    
    switch (layout) {
      case 'TITLE_COVER':
        return { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
      case 'IMAGE_BACKGROUND':
        return { 
          backgroundImage: imageUrl ? `url(${imageUrl})` : `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      default:
        return { background: '#ffffff' }
    }
  }

  const renderPlaceholderImage = (className: string = '') => (
    <div className={`bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center ${className}`}>
      <div className="text-gray-400 text-center">
        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="text-xs">Image</div>
      </div>
    </div>
  )

  const renderImage = (className: string = '') => {
    if (imageUrl) {
      return <img src={imageUrl} alt="" className={`object-cover ${className}`} />
    }
    return renderPlaceholderImage(className)
  }

  const formatContent = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mb-2 text-white">{line.substring(2)}</h1>
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mb-2">{line.substring(3)}</h2>
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium mb-2">{line.substring(4)}</h3>
      } else if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 mb-1">{line.substring(2)}</li>
      } else if (line.trim()) {
        return <p key={index} className="mb-2 text-sm leading-relaxed">{line}</p>
      } else {
        return <div key={index} className="mb-1"></div>
      }
    })
  }

  const renderLayout = () => {
    const baseStyle = `${getFontFamily()} ${getTextAlignment()}`
    
    switch (layout) {
      case 'TITLE_COVER':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center text-white p-8">
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'white' }}>{title}</h1>
            {content && (
              <div className="text-lg opacity-90 max-w-2xl">
                {formatContent(content)}
              </div>
            )}
          </div>
        )

      case 'TEXT_IMAGE_LEFT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-6">
              {renderImage('w-full h-full rounded-lg')}
            </div>
            <div className="w-1/2 p-6 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>{title}</h2>
              <div className={baseStyle}>
                {formatContent(content)}
              </div>
            </div>
          </div>
        )

      case 'TEXT_IMAGE_RIGHT':
        return (
          <div className="h-full flex">
            <div className="w-1/2 p-6 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>{title}</h2>
              <div className={baseStyle}>
                {formatContent(content)}
              </div>
            </div>
            <div className="w-1/2 p-6">
              {renderImage('w-full h-full rounded-lg')}
            </div>
          </div>
        )

      case 'IMAGE_FULL':
        return (
          <div className="h-full relative">
            {renderImage('w-full h-full')}
            {title && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-6">
                <h2 className="text-2xl font-bold">{title}</h2>
              </div>
            )}
          </div>
        )

      case 'BULLETS_IMAGE':
        return (
          <div className="h-full flex">
            <div className="w-2/3 p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>{title}</h2>
              <div className={baseStyle}>
                <ul className="space-y-2">
                  {formatContent(content)}
                </ul>
              </div>
            </div>
            <div className="w-1/3 p-6">
              {renderImage('w-full h-full rounded-lg')}
            </div>
          </div>
        )

      case 'TWO_COLUMN':
        const contentLines = content.split('\n').filter(line => line.trim())
        const midPoint = Math.ceil(contentLines.length / 2)
        const leftContent = contentLines.slice(0, midPoint).join('\n')
        const rightContent = contentLines.slice(midPoint).join('\n')
        
        return (
          <div className="h-full p-6">
            <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: primaryColor }}>{title}</h2>
            <div className="flex gap-8 h-full">
              <div className={`w-1/2 ${baseStyle}`}>
                {formatContent(leftContent)}
              </div>
              <div className={`w-1/2 ${baseStyle}`}>
                {formatContent(rightContent)}
              </div>
            </div>
          </div>
        )

      case 'IMAGE_BACKGROUND':
        return (
          <div className="h-full relative flex items-center justify-center text-center p-8">
            <div className="relative z-10 text-white">
              <h1 className="text-3xl font-bold mb-4 drop-shadow-lg">{title}</h1>
              <div className="text-lg drop-shadow-md">
                {formatContent(content)}
              </div>
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>
          </div>
        )

      default: // TEXT_ONLY
        return (
          <div className="h-full p-6 flex flex-col">
            <h2 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>{title}</h2>
            <div className={`${baseStyle} flex-1`}>
              {formatContent(content)}
            </div>
          </div>
        )
    }
  }

  return (
    <div 
      className={`w-full aspect-[16/9] border border-gray-200 rounded-lg overflow-hidden ${className}`}
      style={getBackgroundStyle()}
    >
      {renderLayout()}
    </div>
  )
}