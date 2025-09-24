import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { DarkModeToggle } from '@/components/DarkModeToggle'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Media Labs - AI-Powered Media Generation',
  description:
    'Modern Next.js web application for AI-powered image generation using RunPod ComfyUI serverless endpoints',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className='min-h-screen bg-background'>
          <header className='border-b border-default bg-card'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='flex justify-between items-center h-16'>
                <div className='flex items-center'>
                  <h1 className='text-xl font-semibold text-primary'>Media Labs</h1>
                </div>
                <DarkModeToggle />
              </div>
            </div>
          </header>
          <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>{children}</main>
        </div>
      </body>
    </html>
  )
}
