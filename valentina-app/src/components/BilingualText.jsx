export default function BilingualText({ pt, en, className = '', size = 'normal' }) {
  const sizeClasses = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  }

  return (
    <div className={className}>
      <span className={`text-pt font-medium ${sizeClasses[size]}`}>{pt}</span>
      {en && (
        <span className={`text-en ml-2 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
          ({en})
        </span>
      )}
    </div>
  )
}
