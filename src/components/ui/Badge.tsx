import { cn } from '../../lib/utils'

interface BadgeProps { variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }

export function Badge({ variant = 'default', children }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    danger: 'bg-red-900/50 text-red-400',
    info: 'bg-blue-900/50 text-blue-400',
  }
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant])}>{children}</span>
}
