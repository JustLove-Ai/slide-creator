'use client'

import { useState } from 'react'

interface TodoListInputProps {
  label: string
  items: string[]
  onAdd: (item: string) => void
  onRemove: (index: number) => void
  placeholder: string
  suggestions?: string[]
}

export default function TodoListInput({ 
  label, 
  items, 
  onAdd, 
  onRemove, 
  placeholder, 
  suggestions = [] 
}: TodoListInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleAdd = () => {
    if (inputValue.trim() && !items.includes(inputValue.trim())) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const addSuggestion = (suggestion: string) => {
    if (!items.includes(suggestion)) {
      onAdd(suggestion)
    }
    setShowSuggestions(false)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      
      {/* Input with Add Button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="flex-1 px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim() || items.includes(inputValue.trim())}
          className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && showSuggestions && inputValue === '' && (
        <div className="bg-muted/50 rounded-md p-2">
          <div className="text-xs text-muted-foreground mb-2">Suggestions:</div>
          <div className="flex flex-wrap gap-1">
            {suggestions
              .filter(suggestion => !items.includes(suggestion))
              .slice(0, 6)
              .map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addSuggestion(suggestion)}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Todo Items List */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-muted/20 rounded-md px-3 py-2 group"
            >
              <span className="text-sm text-foreground flex-1">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-destructive hover:text-destructive/80 text-sm opacity-70 group-hover:opacity-100 transition-opacity"
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm bg-muted/10 rounded-md border border-dashed">
          No items added yet. Use the input above to add items.
        </div>
      )}
    </div>
  )
}