// =====================================================
// USE LINK PREVIEW HOOK
// Fetch and cache Open Graph metadata for URLs
// =====================================================

import { useState, useCallback, useRef, useEffect } from 'react'

// Cache for link previews (persists during session)
const previewCache = new Map()

// Simple URL validation
const isValidUrl = (string) => {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Extract domain from URL
const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
}

// Known sites with predictable OG structures
const SITE_CONFIGS = {
  'github.com': {
    getPreview: (url) => ({
      title: url.split('/').slice(-2).join('/'),
      description: 'GitHub Repository',
      image: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      siteName: 'GitHub'
    })
  },
  'youtube.com': {
    getPreview: (url) => {
      const videoId = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
      return {
        title: 'YouTube Video',
        description: 'Watch on YouTube',
        image: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null,
        siteName: 'YouTube'
      }
    }
  },
  'youtu.be': {
    getPreview: (url) => {
      const videoId = url.split('/').pop()?.split('?')[0]
      return {
        title: 'YouTube Video',
        description: 'Watch on YouTube',
        image: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null,
        siteName: 'YouTube'
      }
    }
  },
  'twitter.com': {
    getPreview: () => ({
      title: 'Twitter Post',
      description: 'View on Twitter',
      image: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc727a.png',
      siteName: 'Twitter'
    })
  },
  'x.com': {
    getPreview: () => ({
      title: 'X Post',
      description: 'View on X',
      image: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc727a.png',
      siteName: 'X'
    })
  },
  'linkedin.com': {
    getPreview: () => ({
      title: 'LinkedIn Post',
      description: 'View on LinkedIn',
      image: 'https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
      siteName: 'LinkedIn'
    })
  },
  'figma.com': {
    getPreview: () => ({
      title: 'Figma Design',
      description: 'View in Figma',
      image: 'https://static.figma.com/app/icon/1/favicon.png',
      siteName: 'Figma'
    })
  },
  'notion.so': {
    getPreview: () => ({
      title: 'Notion Page',
      description: 'View in Notion',
      image: 'https://www.notion.so/images/favicon.ico',
      siteName: 'Notion'
    })
  }
}

// Generate fallback preview based on URL
const generateFallbackPreview = (url) => {
  const domain = getDomain(url)

  // Check for known site configs
  for (const [siteDomain, config] of Object.entries(SITE_CONFIGS)) {
    if (domain.includes(siteDomain)) {
      return {
        url,
        domain,
        ...config.getPreview(url),
        isFallback: true
      }
    }
  }

  // Generic fallback
  return {
    url,
    domain,
    title: domain,
    description: url,
    image: null,
    siteName: domain,
    isFallback: true
  }
}

// Fetch OG metadata via proxy (when available) or use fallback
const fetchOgMetadata = async (url) => {
  // Check cache first
  if (previewCache.has(url)) {
    return previewCache.get(url)
  }

  try {
    // Try to fetch via a CORS proxy or your backend API
    // This is a placeholder - in production you'd use your own backend
    const proxyUrl = `/api/og-preview?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    if (response.ok) {
      const data = await response.json()
      const preview = {
        url,
        domain: getDomain(url),
        title: data.title || getDomain(url),
        description: data.description || '',
        image: data.image || null,
        siteName: data.siteName || getDomain(url),
        isFallback: false
      }
      previewCache.set(url, preview)
      return preview
    }
  } catch (err) {
    // Proxy not available, use fallback
  }

  // Use fallback preview
  const fallback = generateFallbackPreview(url)
  previewCache.set(url, fallback)
  return fallback
}

export default function useLinkPreview() {
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState({})
  const fetchedUrls = useRef(new Set())

  // Fetch preview for a single URL
  const fetchPreview = useCallback(async (url) => {
    if (!isValidUrl(url) || fetchedUrls.current.has(url)) {
      return
    }

    fetchedUrls.current.add(url)
    setLoading(prev => ({ ...prev, [url]: true }))

    try {
      const preview = await fetchOgMetadata(url)
      setPreviews(prev => ({ ...prev, [url]: preview }))
    } catch (err) {
      // Use fallback on error
      const fallback = generateFallbackPreview(url)
      setPreviews(prev => ({ ...prev, [url]: fallback }))
    } finally {
      setLoading(prev => ({ ...prev, [url]: false }))
    }
  }, [])

  // Fetch previews for multiple URLs
  const fetchPreviews = useCallback(async (urls) => {
    const uniqueUrls = [...new Set(urls)].filter(url =>
      isValidUrl(url) && !fetchedUrls.current.has(url)
    )

    await Promise.all(uniqueUrls.map(fetchPreview))
  }, [fetchPreview])

  // Get preview for a URL (returns cached or triggers fetch)
  const getPreview = useCallback((url) => {
    if (!isValidUrl(url)) return null

    if (previews[url]) {
      return previews[url]
    }

    // Trigger fetch if not already fetching
    if (!loading[url] && !fetchedUrls.current.has(url)) {
      fetchPreview(url)
    }

    return null
  }, [previews, loading, fetchPreview])

  // Check if URL preview is loading
  const isLoading = useCallback((url) => {
    return loading[url] || false
  }, [loading])

  // Clear cache for specific URL
  const clearPreview = useCallback((url) => {
    previewCache.delete(url)
    fetchedUrls.current.delete(url)
    setPreviews(prev => {
      const updated = { ...prev }
      delete updated[url]
      return updated
    })
  }, [])

  return {
    previews,
    loading,
    fetchPreview,
    fetchPreviews,
    getPreview,
    isLoading,
    clearPreview,
    isValidUrl,
    getDomain
  }
}

// Export utilities for direct use
export { isValidUrl, getDomain, generateFallbackPreview }
