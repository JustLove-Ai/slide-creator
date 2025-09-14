"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

export function TopNavigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/ideas", label: "Ideas" },
    { href: "/presentations", label: "Presentations" },
    { href: "/create", label: "Create" },
    { href: "/voice-profiles", label: "Voice Profiles" },
    { href: "/frameworks", label: "Frameworks" },
  ]

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-semibold text-foreground">
              Slide Creator
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    className={`text-sm font-medium transition-colors ${
                      isActive 
                        ? "text-foreground border-b-2 border-primary pb-4 -mb-4" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <div className="md:hidden">
              <MobileMenu navItems={navItems} currentPath={pathname} />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}

function MobileMenu({ navItems, currentPath }: { navItems: Array<{href: string, label: string}>, currentPath: string }) {
  return (
    <div className="relative group">
      <button className="p-2 text-muted-foreground hover:text-foreground">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div className="absolute right-0 top-full mt-2 w-48 bg-card border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="py-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}