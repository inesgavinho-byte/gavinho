// =====================================================
// SKELETON - Loading placeholder components
// =====================================================

import './Skeleton.css'

// Base skeleton component
export function Skeleton({
  width,
  height,
  borderRadius = '8px',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  )
}

// Text skeleton
export function SkeletonText({ lines = 1, width = '100%', gap = '8px' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 && lines > 1 ? '70%' : width}
          height="14px"
          borderRadius="4px"
        />
      ))}
    </div>
  )
}

// Avatar skeleton
export function SkeletonAvatar({ size = 40 }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />
}

// Card skeleton
export function SkeletonCard({ height = '200px' }) {
  return (
    <div className="skeleton-card" style={{ height }}>
      <Skeleton width="100%" height="100%" borderRadius="12px" />
    </div>
  )
}

// Project card skeleton
export function SkeletonProjectCard() {
  return (
    <div className="skeleton-project-card">
      <div className="skeleton-project-header">
        <SkeletonAvatar size={48} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="18px" style={{ marginBottom: '8px' }} />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <div className="skeleton-project-body">
        <SkeletonText lines={2} />
      </div>
      <div className="skeleton-project-footer">
        <Skeleton width="80px" height="24px" borderRadius="12px" />
        <Skeleton width="60px" height="24px" borderRadius="12px" />
      </div>
    </div>
  )
}

// Dashboard card skeleton
export function SkeletonDashboardCard() {
  return (
    <div className="skeleton-dashboard-card">
      <div style={{ marginBottom: '16px' }}>
        <Skeleton width="120px" height="16px" />
      </div>
      <div style={{
        padding: '16px',
        background: 'var(--cream)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SkeletonAvatar size={48} />
          <div style={{ flex: 1 }}>
            <Skeleton width="70%" height="16px" style={{ marginBottom: '8px' }} />
            <Skeleton width="50%" height="12px" />
          </div>
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

// Table skeleton
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="100px" height="14px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              width={colIdx === 0 ? '150px' : '80px'}
              height="14px"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Image/Render skeleton
export function SkeletonImage({ aspectRatio = '16/10' }) {
  return (
    <div style={{ aspectRatio, width: '100%' }}>
      <Skeleton width="100%" height="100%" borderRadius="12px" />
    </div>
  )
}

// Render gallery skeleton
export function SkeletonRenderGallery({ count = 6 }) {
  return (
    <div className="skeleton-render-gallery">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonImage key={i} />
      ))}
    </div>
  )
}

// Full page loading skeleton
export function SkeletonPage() {
  return (
    <div className="skeleton-page">
      {/* Header */}
      <div className="skeleton-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Skeleton width="40px" height="40px" borderRadius="8px" />
          <div>
            <Skeleton width="200px" height="24px" style={{ marginBottom: '8px' }} />
            <Skeleton width="150px" height="14px" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="100px" height="36px" borderRadius="8px" />
          <Skeleton width="100px" height="36px" borderRadius="8px" />
        </div>
      </div>

      {/* Tabs */}
      <div className="skeleton-tabs">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="80px" height="32px" borderRadius="8px" />
        ))}
      </div>

      {/* Content */}
      <div className="skeleton-content">
        <div className="grid grid-2" style={{ gap: '24px' }}>
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
          <div style={{ gridColumn: 'span 2' }}>
            <SkeletonTable rows={4} cols={5} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Projetos page skeleton - shows a grid of project card placeholders
export function SkeletonProjetosPage({ count = 6 }) {
  return (
    <div className="skeleton-projetos-page fade-in">
      {/* Header */}
      <div className="skeleton-projetos-header">
        <div>
          <Skeleton width="140px" height="32px" style={{ marginBottom: '8px' }} />
          <Skeleton width="280px" height="16px" />
        </div>
        <Skeleton width="140px" height="44px" borderRadius="980px" />
      </div>

      {/* Filters */}
      <div className="skeleton-projetos-filters">
        <Skeleton width="100%" height="48px" borderRadius="24px" style={{ flex: 1, minWidth: '200px', maxWidth: '450px' }} />
        <Skeleton width="180px" height="48px" borderRadius="24px" />
        <Skeleton width="180px" height="48px" borderRadius="24px" />
      </div>

      {/* Grid of cards */}
      <div className="skeleton-projetos-grid">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonProjetoCard key={i} />
        ))}
      </div>
    </div>
  )
}

// Single project card skeleton
export function SkeletonProjetoCard() {
  return (
    <div className="skeleton-projeto-card">
      {/* Header */}
      <div className="skeleton-projeto-card-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Skeleton width="65%" height="16px" />
          </div>
          <Skeleton width="45%" height="13px" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Skeleton width="60px" height="22px" borderRadius="4px" />
          <Skeleton width="24px" height="24px" borderRadius="4px" />
        </div>
      </div>

      {/* Meta info */}
      <div className="skeleton-projeto-card-meta">
        <Skeleton width="100px" height="12px" />
        <Skeleton width="140px" height="12px" />
      </div>

      {/* Progress */}
      <div className="skeleton-projeto-card-progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <Skeleton width="100px" height="11px" />
          <Skeleton width="32px" height="12px" />
        </div>
        <Skeleton width="100%" height="4px" borderRadius="2px" />
      </div>

      {/* Footer */}
      <div className="skeleton-projeto-card-footer">
        <Skeleton width="90px" height="12px" />
        <Skeleton width="120px" height="11px" />
      </div>
    </div>
  )
}

// Archviz page skeleton - shows compartments with render placeholders
export function SkeletonArchvizPage() {
  return (
    <div className="skeleton-archviz-page">
      {/* Header */}
      <div className="skeleton-archviz-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width="24px" height="24px" borderRadius="4px" />
          <div>
            <Skeleton width="220px" height="20px" style={{ marginBottom: '6px' }} />
            <Skeleton width="160px" height="14px" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="120px" height="38px" borderRadius="8px" />
          <Skeleton width="150px" height="38px" borderRadius="8px" />
        </div>
      </div>

      {/* Sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skeleton-archviz-section">
          <div className="skeleton-archviz-section-header">
            <Skeleton width="140px" height="18px" />
            <Skeleton width="60px" height="14px" />
          </div>
          <div className="skeleton-archviz-grid">
            {Array.from({ length: 4 }).map((_, j) => (
              <SkeletonArchvizCard key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Single archviz render card skeleton
export function SkeletonArchvizCard() {
  return (
    <div className="skeleton-archviz-card">
      <div className="skeleton-archviz-thumbnail">
        <Skeleton width="100%" height="100%" borderRadius="0" />
        {/* Version badge */}
        <div className="skeleton-archviz-badge-left">
          <Skeleton width="28px" height="18px" borderRadius="4px" />
        </div>
        {/* Date badge */}
        <div className="skeleton-archviz-badge-right">
          <Skeleton width="60px" height="18px" borderRadius="4px" />
        </div>
      </div>
      <div className="skeleton-archviz-content">
        <Skeleton width="70%" height="14px" style={{ marginBottom: '8px' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <Skeleton width="80px" height="28px" borderRadius="6px" />
          <Skeleton width="70px" height="28px" borderRadius="6px" />
          <Skeleton width="40px" height="28px" borderRadius="6px" />
        </div>
      </div>
    </div>
  )
}

export default Skeleton
