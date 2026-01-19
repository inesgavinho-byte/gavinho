export default function ProgressBar({ progress = 0, showLabel = true }) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <span className="text-sm text-gray-500 font-medium min-w-[40px] text-right">
          {Math.round(clampedProgress)}%
        </span>
      )}
      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}
