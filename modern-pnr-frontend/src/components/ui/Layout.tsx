import React from 'react'
import { cn } from '../../utils/cn'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  children: React.ReactNode
}

const containerSizes = {
  sm: 'max-w-sm',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
}

const flexDirections = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse',
}

const alignItems = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const justifyContent = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

const flexWrap = {
  wrap: 'flex-wrap',
  nowrap: 'flex-nowrap',
  'wrap-reverse': 'flex-wrap-reverse',
}

const gaps = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

const stackSpacing = {
  none: 'space-y-0',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = 'lg', children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto px-4 sm:px-6 lg:px-8',
          containerSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = 'Container'

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    direction = 'row', 
    align = 'start', 
    justify = 'start', 
    wrap = 'nowrap',
    gap = 'none',
    children, 
    className, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          flexDirections[direction],
          alignItems[align],
          justifyContent[justify],
          flexWrap[wrap],
          gaps[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Flex.displayName = 'Flex'

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ spacing = 'md', align = 'stretch', children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          stackSpacing[spacing],
          alignItems[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Stack.displayName = 'Stack'

export const Center = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Center.displayName = 'Center'

export const Spacer: React.FC = () => {
  return <div className="flex-1" />
}