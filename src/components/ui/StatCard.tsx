import { Card } from './Card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: { value: number; positive: boolean }
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className="p-3 bg-red-900/30 rounded-xl text-red-400">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-zinc-400">{title}</p>
        <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>
    </Card>
  )
}
