'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Framework {
  id: string
  name: string
  description?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  slides: Array<{
    id: string
    title: string
    instructions: string
    slideType: string
    layout: string
    order: number
  }>
}

type ViewMode = 'list' | 'create' | 'edit'

export default function FrameworksPage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [filteredFrameworks, setFilteredFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingFramework, setEditingFramework] = useState<Framework | null>(null)

  useEffect(() => {
    fetchFrameworks()
    // Auto-seed templates if no frameworks exist
    autoSeedTemplates()
  }, [])

  const autoSeedTemplates = async () => {
    if (frameworks.length === 0) {
      try {
        const { createFrameworkTemplates } = await import('@/lib/actions')
        await createFrameworkTemplates()
        // Refresh after seeding
        setTimeout(() => fetchFrameworks(), 1000)
      } catch (error) {
        console.error('Error auto-seeding templates:', error)
      }
    }
  }

  useEffect(() => {
    const filtered = frameworks.filter(framework =>
      framework.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (framework.description && framework.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredFrameworks(filtered)
  }, [frameworks, searchTerm])

  const fetchFrameworks = async () => {
    try {
      const { getFrameworks } = await import('@/lib/actions')
      const data = await getFrameworks()
      setFrameworks(data)
    } catch (error) {
      console.error('Error fetching frameworks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this framework?')) return
    
    try {
      const { deleteFramework } = await import('@/lib/actions')
      const result = await deleteFramework(id)
      
      if (result.success) {
        fetchFrameworks()
      } else {
        alert(result.error || 'Failed to delete framework')
      }
    } catch (error) {
      console.error('Error deleting framework:', error)
    }
  }

  const handleEdit = (framework: Framework) => {
    setEditingFramework(framework)
    setViewMode('edit')
  }

  const handleDuplicate = async (id: string) => {
    try {
      const { duplicateFramework } = await import('@/lib/actions')
      const result = await duplicateFramework(id)
      
      if (result.success) {
        fetchFrameworks()
      } else {
        alert(result.error || 'Failed to duplicate framework')
      }
    } catch (error) {
      console.error('Error duplicating framework:', error)
    }
  }

  const handleFormSuccess = () => {
    setViewMode('list')
    setEditingFramework(null)
    fetchFrameworks()
  }

  const handleCancel = () => {
    setViewMode('list')
    setEditingFramework(null)
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-4 text-lg text-muted-foreground">Loading frameworks...</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {viewMode === 'create' ? 'Create Framework' : 
               viewMode === 'edit' ? 'Edit Framework' : 'Frameworks'}
            </h1>
            <p className="text-muted-foreground">
              {viewMode === 'list' ? 'Manage presentation frameworks and templates for structured content generation' : 
               'Configure your framework with structured slides and instructions'}
            </p>
          </div>
          {viewMode === 'list' ? (
            <button
              onClick={() => setViewMode('create')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Create Framework
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-input bg-background text-foreground rounded-md hover:bg-accent transition-colors"
            >
              Back to List
            </button>
          )}
        </div>

        {viewMode === 'list' ? (
          <>
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search frameworks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-6">
              {filteredFrameworks.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm ? 'No frameworks found' : 'No frameworks yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Create your first framework to get started.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setViewMode('create')}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Create Framework
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Slides
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Default
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredFrameworks.map((framework, index) => (
                          <motion.tr
                            key={framework.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-muted/50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-foreground">{framework.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground max-w-md truncate">
                                {framework.description || 'No description'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                {framework.slides.length} slides
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {framework.isDefault && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  Default
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(framework.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEdit(framework)}
                                className="text-primary hover:text-primary/80 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDuplicate(framework.id)}
                                className="text-secondary-foreground hover:text-secondary-foreground/80 mr-4"
                              >
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(framework.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                Delete
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <FrameworkForm 
            framework={editingFramework} 
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        )}
      </div>
    </main>
  )
}

interface FrameworkFormProps {
  framework: Framework | null
  onSuccess: () => void
  onCancel: () => void
}

function FrameworkForm({ framework, onSuccess, onCancel }: FrameworkFormProps) {
  const [name, setName] = useState(framework?.name || '')
  const [description, setDescription] = useState(framework?.description || '')
  const [isDefault, setIsDefault] = useState(framework?.isDefault || false)
  const [slides, setSlides] = useState(framework?.slides || [])
  const [loading, setLoading] = useState(false)

  const addSlide = () => {
    const newSlide = {
      id: `temp-${Date.now()}`,
      title: `Slide ${slides.length + 1}`,
      instructions: '',
      slideType: 'CONTENT',
      layout: 'TEXT_ONLY',
      order: slides.length + 1
    }
    setSlides([...slides, newSlide])
  }

  const removeSlide = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index)
    setSlides(newSlides.map((slide, i) => ({ ...slide, order: i + 1 })))
  }

  const updateSlide = (index: number, field: string, value: string) => {
    const newSlides = [...slides]
    newSlides[index] = { ...newSlides[index], [field]: value }
    setSlides(newSlides)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('isDefault', isDefault.toString())
      formData.append('slides', JSON.stringify(slides))

      if (framework) {
        const { updateFramework } = await import('@/lib/actions')
        const result = await updateFramework(framework.id, formData)
        
        if (result.success) {
          onSuccess()
        } else {
          alert(result.error || 'Failed to update framework')
        }
      } else {
        const { createFramework } = await import('@/lib/actions')
        const result = await createFramework(formData)
        
        if (result.success) {
          onSuccess()
        } else {
          alert(result.error || 'Failed to create framework')
        }
      }
    } catch (error) {
      console.error('Error saving framework:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg border p-6 max-w-4xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter framework name"
              required
            />
          </div>

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="mr-2 h-4 w-4 text-primary bg-background border-input rounded focus:ring-ring"
            />
            <label htmlFor="isDefault" className="text-sm text-foreground">
              Set as default framework
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Describe this framework and when to use it"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-foreground">Framework Slides</h4>
            <button
              type="button"
              onClick={addSlide}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Add Slide
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {slides.map((slide, index) => (
              <div key={slide.id} className="border border-input rounded-md p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-foreground">
                    Slide {index + 1}: {slide.title || 'Untitled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSlide(index)}
                    className="text-destructive hover:text-destructive/80 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Slide Title
                    </label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => updateSlide(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Enter slide title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Slide Type
                    </label>
                    <select
                      value={slide.slideType}
                      onChange={(e) => updateSlide(index, 'slideType', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="TITLE">Title Slide</option>
                      <option value="INTRO">Introduction</option>
                      <option value="CONTENT">Content</option>
                      <option value="CONCLUSION">Conclusion</option>
                      <option value="NEXT_STEPS">Next Steps</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Slide Instructions
                  </label>
                  <textarea
                    value={slide.instructions}
                    onChange={(e) => updateSlide(index, 'instructions', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="Provide specific instructions for generating this slide content..."
                  />
                </div>
              </div>
            ))}

            {slides.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
                <h4 className="text-sm font-medium mb-2">No slides added yet</h4>
                <p className="text-xs">Click &quot;Add Slide&quot; to start building your framework structure</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-input text-foreground bg-background rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : (framework ? 'Update Framework' : 'Create Framework')}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

interface TemplateSelectorProps {
  templates: Array<{
    name: string
    description: string
    slideCount: number
  }>
  onSelect: (templateName: string) => void
  onCancel: () => void
}

function TemplateSelector({ templates, onSelect, onCancel }: TemplateSelectorProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, index) => (
          <motion.div
            key={template.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {template.slideCount} slides
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {template.description}
            </p>
            
            <button
              onClick={() => onSelect(template.name)}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Use This Template
            </button>
          </motion.div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">No Templates Available</h3>
          <p className="text-muted-foreground mb-4">Templates will be created when you first use them.</p>
          <button
            onClick={() => onSelect('default')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Default Templates
          </button>
        </div>
      )}
    </motion.div>
  )
}