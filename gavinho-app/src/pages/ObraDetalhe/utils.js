export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-PT')
}

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value || 0)
}
