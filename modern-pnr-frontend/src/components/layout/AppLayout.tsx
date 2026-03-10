import React from 'react'
import { BottomNav } from './BottomNav'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <div className="pb-20">
    {children}
    <BottomNav />
  </div>
)
