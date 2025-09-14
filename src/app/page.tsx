import Link from "next/link"
import { Plus, Edit3, Sparkles, Lightbulb } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Slide Creator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate professional presentations with AI. Create slides, edit content, 
            and customize your presentation with intelligent assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div className="bg-card rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              Create New Presentation
            </h3>
            <p className="text-muted-foreground mb-4">
              Start with an AI-generated presentation from your prompt or idea
            </p>
            <Button asChild className="w-full">
              <Link href="/create">
                Get Started
              </Link>
            </Button>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
              <Edit3 className="w-6 h-6 text-secondary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              Browse Presentations
            </h3>
            <p className="text-muted-foreground mb-4">
              View, edit, and manage your existing presentation slides
            </p>
            <Button variant="secondary" asChild className="w-full">
              <Link href="/presentations">
                Browse Files
              </Link>
            </Button>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
              <Lightbulb className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              My Ideas
            </h3>
            <p className="text-muted-foreground mb-4">
              Capture, organize, and develop your presentation ideas
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/ideas">
                View Ideas
              </Link>
            </Button>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              AI Enhancement
            </h3>
            <p className="text-muted-foreground mb-4">
              Let AI regenerate slides and compare versions side by side
            </p>
            <Button variant="outline" className="w-full">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}