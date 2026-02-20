import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

/**
 * Hook de navegação de projetos — tabs, subtabs, URL sync.
 *
 * @returns {{ id: string, activeTab: string, activeFaseSection: string, activeArchvizSection: string, activeGestaoSection: string, activeAcompSection: string, activeBriefingSection: string, handleTabChange: (tabId: string, subtab?: string|null) => void, handleSubtabChange: (subtabId: string, tabType?: string) => void, navigate: Function }}
 */
export default function useProjetoNavigation() {
  const { id, tab: urlTab, subtab: urlSubtab } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(urlTab || 'dashboard')
  const [activeFaseSection, setActiveFaseSection] = useState(urlSubtab || 'entregaveis')
  const [activeArchvizSection, setActiveArchvizSection] = useState(urlSubtab || 'processo')
  const [activeGestaoSection, setActiveGestaoSection] = useState(urlSubtab || 'decisoes')
  const [activeAcompSection, setActiveAcompSection] = useState(urlSubtab || 'fotografias')
  const [activeBriefingSection, setActiveBriefingSection] = useState(urlSubtab || 'inspiracoes')

  // Sync URL → state
  useEffect(() => {
    if (urlTab) setActiveTab(urlTab)
    if (urlSubtab) {
      if (urlTab === 'fases') setActiveFaseSection(urlSubtab)
      else if (urlTab === 'archviz') setActiveArchvizSection(urlSubtab)
      else if (urlTab === 'gestao') setActiveGestaoSection(urlSubtab)
      else if (urlTab === 'briefing') setActiveBriefingSection(urlSubtab)
      else if (urlTab === 'acompanhamento') setActiveAcompSection(urlSubtab)
    }
  }, [urlTab, urlSubtab])

  const handleTabChange = (tabId, subtab = null) => {
    const path = subtab ? `/projetos/${id}/${tabId}/${subtab}` : `/projetos/${id}/${tabId}`
    navigate(path)
    setActiveTab(tabId)
    if (subtab) setActiveFaseSection(subtab)
  }

  const handleSubtabChange = (subtabId, tabType = activeTab) => {
    navigate(`/projetos/${id}/${tabType}/${subtabId}`)
    if (tabType === 'fases') setActiveFaseSection(subtabId)
    else if (tabType === 'archviz') setActiveArchvizSection(subtabId)
    else if (tabType === 'gestao') setActiveGestaoSection(subtabId)
    else if (tabType === 'briefing') setActiveBriefingSection(subtabId)
    else if (tabType === 'acompanhamento') setActiveAcompSection(subtabId)
  }

  return {
    id,
    activeTab,
    activeFaseSection,
    activeArchvizSection,
    activeGestaoSection,
    activeAcompSection,
    activeBriefingSection,
    setActiveArchvizSection,
    handleTabChange,
    handleSubtabChange,
    navigate
  }
}
