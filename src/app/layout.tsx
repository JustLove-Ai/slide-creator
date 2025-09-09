import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { TopNavigation } from '@/components/top-navigation'

export const metadata: Metadata = {
  title: 'Slide Creator',
  description: 'AI-powered presentation generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TopNavigation />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}