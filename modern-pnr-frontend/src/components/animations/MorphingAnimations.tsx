import React, { useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface MorphingContainerProps {
  children: React.ReactNode
  layoutId?: string
  className?: string
  transition?: any
}

export const MorphingContainer: React.FC<MorphingContainerProps> = ({
  children,
  layoutId,
  className,
  transition = { type: 'spring', stiffness: 300, damping: 30 }
}) => {
  return (
    <motion.div
      layoutId={layoutId}
      layout
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export interface ShapeShifterProps {
  shapes: {
    id: string
    content: React.ReactNode
    className?: string
  }[]
  activeShape: string
  className?: string
  transition?: any
}

export const ShapeShifter: React.FC<ShapeShifterProps> = ({
  shapes,
  activeShape,
  className,
  transition = { type: 'spring', stiffness: 400, damping: 25 }
}) => {
  const currentShape = shapes.find(shape => shape.id === activeShape)

  return (
    <AnimatePresence mode="wait">
      {currentShape && (
        <motion.div
          key={currentShape.id}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={transition}
          className={cn(className, currentShape.className)}
        >
          {currentShape.content}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export interface FlipCardProps {
  frontContent: React.ReactNode
  backContent: React.ReactNode
  isFlipped?: boolean
  onFlip?: (flipped: boolean) => void
  className?: string
  cardClassName?: string
}

export const FlipCard: React.FC<FlipCardProps> = ({
  frontContent,
  backContent,
  isFlipped = false,
  onFlip,
  className,
  cardClassName
}) => {
  const [flipped, setFlipped] = useState(isFlipped)

  const handleFlip = () => {
    const newFlipped = !flipped
    setFlipped(newFlipped)
    onFlip?.(newFlipped)
  }

  return (
    <div className={cn('perspective-1000', className)} onClick={handleFlip}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className={cn('relative w-full h-full preserve-3d cursor-pointer', cardClassName)}
      >
        {/* Front */}
        <motion.div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontContent}
        </motion.div>
        
        {/* Back */}
        <motion.div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {backContent}
        </motion.div>
      </motion.div>
    </div>
  )
}

export interface ExpandableCardProps {
  children: React.ReactNode
  expandedContent?: React.ReactNode
  isExpanded?: boolean
  onToggle?: (expanded: boolean) => void
  className?: string
  expandedClassName?: string
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  children,
  expandedContent,
  isExpanded = false,
  onToggle,
  className,
  expandedClassName
}) => {
  const [expanded, setExpanded] = useState(isExpanded)

  const handleToggle = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    onToggle?.(newExpanded)
  }

  return (
    <motion.div
      layout
      onClick={handleToggle}
      className={cn(
        'cursor-pointer overflow-hidden',
        className,
        expanded && expandedClassName
      )}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.div layout="position">
        {children}
      </motion.div>
      
      <AnimatePresence>
        {expanded && expandedContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export interface MorphingButtonProps {
  states: {
    id: string
    content: React.ReactNode
    className?: string
    onClick?: () => void
  }[]
  currentState: string
  className?: string
}

export const MorphingButton: React.FC<MorphingButtonProps> = ({
  states,
  currentState,
  className
}) => {
  const state = states.find(s => s.id === currentState)

  return (
    <motion.button
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={state?.onClick}
      className={cn(
        'relative overflow-hidden transition-colors',
        className,
        state?.className
      )}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {state?.content}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}

export interface SlideTransitionProps {
  children: React.ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  className?: string
}

const slideVariants: Record<string, Variants> = {
  left: {
    enter: { x: '100%' },
    center: { x: 0 },
    exit: { x: '-100%' }
  },
  right: {
    enter: { x: '-100%' },
    center: { x: 0 },
    exit: { x: '100%' }
  },
  up: {
    enter: { y: '100%' },
    center: { y: 0 },
    exit: { y: '-100%' }
  },
  down: {
    enter: { y: '-100%' },
    center: { y: 0 },
    exit: { y: '100%' }
  }
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  direction = 'left',
  className
}) => {
  return (
    <motion.div
      variants={slideVariants[direction]}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn('absolute inset-0', className)}
    >
      {children}
    </motion.div>
  )
}

// Advanced morphing layout component
export interface MorphingLayoutProps {
  children: React.ReactNode
  layoutKey: string
  className?: string
}

export const MorphingLayout: React.FC<MorphingLayoutProps> = ({
  children,
  layoutKey,
  className
}) => {
  return (
    <motion.div
      key={layoutKey}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}