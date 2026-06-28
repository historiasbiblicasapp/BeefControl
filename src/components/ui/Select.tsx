import { cn } from '../../lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-zinc-400">{label}</label>}
      <select
        className={cn(
          'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
