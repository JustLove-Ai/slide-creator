export function parseMarkdownToHtml(text: string): string {
  let html = text
  
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mb-3">$1</h3>')
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mb-4">$1</h2>')
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-4xl font-bold mb-6">$1</h1>')
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  
  // Bullet points
  html = html.replace(/^- (.*$)/gm, '<li class="mb-2 ml-4">• $1</li>')
  
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li.*<\/li>\s*)+/g, '<ul class="space-y-1 mb-4">$&</ul>')
  
  // Paragraphs (lines that aren't headers, bullets, or empty)
  const lines = html.split('\n')
  const processedLines = lines.map(line => {
    const trimmed = line.trim()
    if (trimmed === '' || 
        trimmed.startsWith('<h') || 
        trimmed.startsWith('<li') || 
        trimmed.startsWith('<ul') || 
        trimmed.startsWith('</ul>')) {
      return line
    }
    // Only wrap in <p> if it doesn't already have HTML tags
    if (!trimmed.includes('<') && trimmed.length > 0) {
      return `<p class="mb-3 leading-relaxed">${trimmed}</p>`
    }
    return line
  })
  
  html = processedLines.join('\n')
  
  // Clean up extra whitespace
  html = html.replace(/\n\s*\n/g, '\n')
  
  return html
}

export function htmlToPlainText(html: string): string {
  // Convert HTML back to markdown-like plain text for editing
  let text = html
  
  // Headers
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1')
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1')
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1')
  
  // Bold and italic
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
  text = text.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
  
  // List items
  text = text.replace(/<li[^>]*>• (.*?)<\/li>/g, '- $1')
  
  // Remove ul tags
  text = text.replace(/<\/?ul[^>]*>/g, '')
  
  // Paragraphs
  text = text.replace(/<p[^>]*>(.*?)<\/p>/g, '$1')
  
  // Clean up extra whitespace
  text = text.replace(/\n\s*\n/g, '\n\n')
  text = text.trim()
  
  return text
}

