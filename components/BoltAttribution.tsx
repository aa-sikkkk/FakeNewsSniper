'use client'

import { Bolt } from "lucide-react"
import Image from 'next/image'
import { useTheme } from 'next-themes'

// Import your images
import blackCircleImage from '@/public/black_circle_360x360.png'
import whiteCircleImage from '@/public/white_circle_360x360.png'
import logoTextImage from '@/public/logotext_poweredby_360w.png'

export function BoltAttribution() {
  const { theme, systemTheme } = useTheme()
  const currentTheme = theme === 'system' ? systemTheme : theme

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-1">
      <a
        href="https://bolt.new"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center space-x-1"
      >
        {currentTheme === 'dark' ? (
          <Image
            src={whiteCircleImage}
            alt="Powered by Bolt.new"
            width={30}
            height={30}
            className="w-7 h-7"
          />
        ) : (
          <Image
            src={blackCircleImage}
            alt="Powered by Bolt.new"
            width={30}
            height={30}
            className="w-7 h-7"
          />
        )}
        <Image
          src={logoTextImage}
          alt="Powered by Bolt.new"
          width={100}
          height={20}
          className="h-5 w-auto"
        />
      </a>
    </div>
  )
} 