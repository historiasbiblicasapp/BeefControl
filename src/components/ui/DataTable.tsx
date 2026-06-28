import { Search } from 'lucide-react'
import { useState } from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  searchable?: boolean
  searchKeys?: string[]
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, onRowClick, searchable, searchKeys }: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = search && searchKeys
    ? data.filter(item => searchKeys.some(key =>
        String(item[key] ?? '').toLowerCase().includes(search.toLowerCase())
      ))
    : data

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0
    const aVal = a[sortKey] ?? ''
    const bVal = b[sortKey] ?? ''
    const cmp = String(aVal).localeCompare(String(bVal))
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-zinc-400 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                  onClick={() => {
                    if (col.sortable) {
                      if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                      else { setSortKey(col.key); setSortDir('asc') }
                    }
                  }}
                >
                  {col.header}
                  {sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">Nenhum registro encontrado</td></tr>
            ) : (
              sorted.map((item, idx) => (
                <tr
                  key={item.id as string || idx}
                  className={cn(
                    'border-t border-zinc-800 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-zinc-800/50' : ''
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-zinc-300">
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
