import { cloneElement, isValidElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Minimal Radix-style Slot: merges the given props onto its single child
 * element so `<Button asChild><Link/></Button>` keeps Button styling.
 */
export function Slot({ children, className, ...props }: { children?: ReactNode; className?: string } & Record<string, unknown>) {
  if (!isValidElement(children)) return null
  const childProps = children.props as { className?: string }
  return cloneElement(children, {
    ...props,
    className: cn(className, childProps.className),
  } as never)
}
