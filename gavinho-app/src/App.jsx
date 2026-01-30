import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Registo from './pages/Registo'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import DashboardProjetos from './pages/DashboardProjetos'
import Projetos from './pages/Projetos'
import ProjetoDetalhe from './pages/ProjetoDetalhe'
import Clientes from './pages/Clientes'
import Obras from './pages/Obras'
import ObraDetalhe from './pages/ObraDetalhe'
import RelatorioSemanal from './pages/RelatorioSemanal'
import Equipa from './pages/Equipa'
import Tarefas from './pages/Tarefas'
import Fornecedores from './pages/Fornecedores'
import FornecedorDetalhe from './pages/FornecedorDetalhe'
import Orcamentos from './pages/Orcamentos'
import OrcamentoDetalhe from './pages/OrcamentoDetalhe'
import BlockersDecisions from './pages/BlockersDecisions'
import ChatProjetos from './pages/ChatProjetos'
import Workspace from './pages/Workspace'
import Finance from './pages/Finance'
import Planning from './pages/Planning'
import Calendario from './pages/Calendario'
import Perfil from './pages/Perfil'
import PlaceholderPage from './pages/PlaceholderPage'
import Biblioteca from './pages/Biblioteca'
import ChatObras from './pages/ChatObras'
import AdminSeed from './pages/AdminSeed'
import DiarioObra from './pages/DiarioObra'
import ObraComunicacoes from './pages/ObraComunicacoes'
import Viabilidade from './pages/Viabilidade'
import Emails from './pages/Emails'
import DecisoesPagina from './pages/DecisoesPagina'
import MQT from './pages/MQT'
import ObraApp from './pages/ObraApp'
import GestaoObras from './pages/GestaoObras'
import OAuthCallback from './pages/OAuthCallback'

// OAuth Callback Handler - runs before anything else (handles legacy routes)
function OAuthCallbackHandler({ children }) {
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    // Check if we have OAuth response in hash (for legacy/fallback handling)
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')

      if (token) {
        // Store in localStorage - triggers storage event in parent window
        localStorage.setItem('teams_oauth_token', token)
        localStorage.setItem('teams_oauth_timestamp', Date.now().toString())

        // If in popup, close after a delay
        if (window.opener) {
          setTimeout(() => {
            window.close()
          }, 1500)
          return
        } else {
          // Not in popup - clear hash
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    }

    if (hash && hash.includes('error')) {
      const params = new URLSearchParams(hash.substring(1))
      const error = params.get('error_description') || params.get('error')
      localStorage.setItem('teams_oauth_error', error)
      localStorage.setItem('teams_oauth_timestamp', Date.now().toString())

      if (window.opener) {
        setTimeout(() => {
          window.close()
        }, 1500)
        return
      }
    }

    setHandled(true)
  }, [])

  // Don't render children until we've checked for OAuth callback
  if (!handled && window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>A autenticar...</p>
    </div>
  }

  return children
}

function App() {
  return (
    <OAuthCallbackHandler>
      <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/registo" element={<Registo />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* PWA App para Trabalhadores */}
          <Route path="/obra-app" element={<ObraApp />} />
          <Route path="/obra-app/*" element={<ObraApp />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="dashboard-projetos" element={<DashboardProjetos />} />
            <Route path="gestao" element={<DashboardAdmin />} />
            <Route path="projetos" element={<Projetos />} />
            <Route path="projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="projetos/:id/:tab" element={<ProjetoDetalhe />} />
            <Route path="projetos/:id/:tab/:subtab" element={<ProjetoDetalhe />} />
            <Route path="projetos/:id/decisoes" element={<DecisoesPagina />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="obras" element={<Obras />} />
            <Route path="obras/:id" element={<ObraDetalhe />} />
            <Route path="obras/:id/:tab" element={<ObraDetalhe />} />
            <Route path="obras/:id/:tab/:subtab" element={<ObraDetalhe />} />
            <Route path="obras/:id/relatorio-semanal" element={<RelatorioSemanal />} />
            <Route path="obras/:id/diario" element={<DiarioObra />} />
            <Route path="obras/:id/comunicacoes" element={<ObraComunicacoes />} />
            <Route path="diario-obra" element={<DiarioObra />} />
            <Route path="equipa" element={<Equipa />} />
            <Route path="equipa/:id" element={<PlaceholderPage title="Perfil do Colaborador" subtitle="Informações e alocações" />} />
            <Route path="gestao-obras" element={<GestaoObras />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="bloqueios" element={<BlockersDecisions />} />
            <Route path="workspace" element={<Workspace />} />
            <Route path="chat" element={<Workspace />} /> {/* Backward compatibility */}
            <Route path="chat-obras" element={<ChatObras />} />
            <Route path="biblioteca" element={<Biblioteca />} />
            <Route path="planning" element={<Planning />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="orcamentos" element={<Orcamentos />} />
            <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
            <Route path="mqt" element={<MQT />} />
            <Route path="financeiro" element={<Finance />} />
            <Route path="viabilidade" element={<Viabilidade />} />
            <Route path="emails" element={<Emails />} />
            <Route path="fornecedores" element={<Fornecedores />} />
            <Route path="fornecedores/:id" element={<FornecedorDetalhe />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="configuracoes" element={<PlaceholderPage title="Configurações" subtitle="Definições da plataforma" />} />
            <Route path="admin/seed" element={<AdminSeed />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </OAuthCallbackHandler>
  )
}

export default App
