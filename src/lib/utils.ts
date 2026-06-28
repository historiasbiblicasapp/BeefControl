export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatWeight(value: number): string {
  return `${value.toFixed(2)} kg`
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function calculateMargins(
  valorTotal: number,
  pesoTotal: number,
  precoVendaTotal: number
) {
  const custoPorKg = pesoTotal > 0 ? valorTotal / pesoTotal : 0
  const lucroBruto = precoVendaTotal - valorTotal
  const margem = precoVendaTotal > 0 ? (lucroBruto / precoVendaTotal) * 100 : 0
  const rentabilidade = valorTotal > 0 ? (lucroBruto / valorTotal) * 100 : 0
  return { custoPorKg, lucroBruto, margem, rentabilidade }
}
