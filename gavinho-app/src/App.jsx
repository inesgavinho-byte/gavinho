import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './components/ui/ThemeProvider'
import { ToastProvider } from './components/ui/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { Loader2 } from 'lucide-react'

// =====================================================
// LAZY LOADED PAGES - Code Splitting
// Reduces initial bundle from ~3.8MB to ~1MB
// =====================================================

// Auth Pages (small, can be eager for fast login)
import Login from './pages/Login'
import Registo from './pages/Registo'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import OAuthCallback from './pages/OAuthCallback'

// Dashboard (most common entry point - eager load)
import Dashboard from './pages/Dashboard'

// Lazy loaded - Large pages
const ProjetoDetalhe = lazy(() => import('./pages/ProjetoDetalhe'))
const ObraDetalhe = lazy(() => import('./pages/ObraDetalhe'))
const Workspace = lazy(() => import('./pages/Workspace'))
const ChatObras = lazy(() => import('./pages/ChatObras'))
const ChatProjetos = lazy(() => import('./pages/ChatProjetos'))
const Viabilidade = lazy(() => import('./pages/Viabilidade'))
const Finance = lazy(() => import('./pages/Finance'))

// Lazy loaded - Medium pages
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'))
const DashboardProjetos = lazy(() => import('./pages/DashboardProjetos'))
// GestaoProjetoPage replaced by ProjetosGestaoPage (loaded below)
const Projetos = lazy(() => import('./pages/Projetos'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Obras = lazy(() => import('./pages/Obras'))
const RelatorioSemanal = lazy(() => import('./pages/RelatorioSemanal'))
const Equipa = lazy(() => import('./pages/Equipa'))
const Tarefas = lazy(() => import('./pages/Tarefas'))
const Fornecedores = lazy(() => import('./pages/Fornecedores'))
const FornecedorDetalhe = lazy(() => import('./pages/FornecedorDetalhe'))
const Orcamentos = lazy(() => import('./pages/Orcamentos'))
const OrcamentoDetalhe = lazy(() => import('./pages/OrcamentoDetalhe'))
const BlockersDecisions = lazy(() => import('./pages/BlockersDecisions'))
const Planning = lazy(() => import('./pages/Planning'))
const Calendario = lazy(() => import('./pages/Calendario'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Biblioteca = lazy(() => import('./pages/Biblioteca'))
const DiarioObra = lazy(() => import('./pages/DiarioObra'))
const ObraComunicacoes = lazy(() => import('./pages/ObraComunicacoes'))
const Emails = lazy(() => import('./pages/Emails'))
const DecisoesPagina = lazy(() => import('./pages/DecisoesPagina'))
const MQT = lazy(() => import('./pages/MQT'))
const GestaoObras = lazy(() => import('./pages/GestaoObras'))
const AdminSeed = lazy(() => import('./pages/AdminSeed'))

// New module pages
const ObrasLista = lazy(() => import('./pages/ObrasLista'))
const Leads = lazy(() => import('./pages/Leads'))
const ProjetosGestaoPage = lazy(() => import('./pages/ProjetosGestaoPage'))
const GestaoIntegrada = lazy(() => import('./pages/GestaoIntegrada'))
const CustosFixos = lazy(() => import('./pages/CustosFixos'))
const Faturacao = lazy(() => import('./pages/Faturacao'))
const ComprasFinanceiro = lazy(() => import('./pages/ComprasFinanceiro'))
const ProcurementDashboard = lazy(() => import('./pages/ProcurementDashboard'))

// PWA App - separate chunk
const ObraApp = lazy(() => import('./pages/ObraApp'))

// Placeholder (small, can be lazy)
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'))
const ColaboradorDetalhe = lazy(() => import('./pages/ColaboradorDetalhe'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))

// =====================================================
// LOADING FALLBACK COMPONENT
// =====================================================
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '400px',
      gap: '16px',
      color: 'var(--brown-light)'
    }}>
      <Loader2
        size={32}
        style={{
          animation: 'spin 1s linear infinite',
          color: 'var(--gold)'
        }}
      />
      <span style={{ fontSize: '14px' }}>A carregar...</span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// =====================================================
// OAUTH CALLBACK HANDLER
// =====================================================
function OAuthCallbackHandler({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const hash = window.location.hash
    const pathname = window.location.pathname

    // ONLY handle MS Teams OAuth on /oauth/callback route
    // This prevents interference with Supabase Google OAuth
    const isMSTeamsCallback = pathname.includes('/oauth/callback') ||
                              pathname.includes('/ms-teams') ||
                              pathname.includes('/teams-callback')

    if (!isMSTeamsCallback) {
      setStatus('continue')
      return
    }

    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')

      if (token) {
        localStorage.setItem('ms_teams_oauth_token', token)
        setStatus('handled')
        setTimeout(() => window.close(), 2000)
        return
      }
    }

    if (hash && hash.includes('error')) {
      const params = new URLSearchParams(hash.substring(1))
      const error = params.get('error_description') || params.get('error')
      localStorage.setItem('ms_teams_oauth_error', error || 'Erro')
      setStatus('handled')
      setTimeout(() => window.close(), 2000)
      return
    }

    setStatus('continue')
  }, [])

  if (status === 'checking') {
    return null
  }

  if (status === 'handled') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Autenticação Concluída!</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>Pode fechar esta janela.</p>
        </div>
      </div>
    )
  }

  return children
}

// =====================================================
// APP COMPONENT
// =====================================================
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OAuthCallbackHandler>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Public Routes - No Suspense needed (eager loaded) */}
                <Route path="/login" element={<Login />} />
                <Route path="/registo" element={<Registo />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                {/* PWA App para Trabalhadores */}
                <Route path="/obra-app" element={
                  <Suspense fallback={<PageLoader />}>
                    <ObraApp />
                  </Suspense>
                } />
                <Route path="/obra-app/*" element={
                  <Suspense fallback={<PageLoader />}>
                    <ObraApp />
                  </Suspense>
                } />

                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  {/* Dashboard - Eager loaded (main entry point) */}
                  <Route index element={<Dashboard />} />

                  {/* All other routes - Lazy loaded with Suspense */}
                  <Route path="dashboard-projetos" element={
                    <Suspense fallback={<PageLoader />}>
                      <DashboardProjetos />
                    </Suspense>
                  } />
                  {/* Gestão Projeto - Projetos em Curso */}
                  <Route path="gestao-projeto/em-curso" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetosGestaoPage mode="em-curso" />
                    </Suspense>
                  } />
                  <Route path="gestao-projeto/em-curso/:tab" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetosGestaoPage mode="em-curso" />
                    </Suspense>
                  } />
                  {/* Gestão Projeto - Projetos Concluídos */}
                  <Route path="gestao-projeto/concluidos" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetosGestaoPage mode="concluidos" />
                    </Suspense>
                  } />
                  <Route path="gestao-projeto/concluidos/:tab" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetosGestaoPage mode="concluidos" />
                    </Suspense>
                  } />
                  {/* Gestão Integrada */}
                  <Route path="gestao-projeto/integrada" element={
                    <Suspense fallback={<PageLoader />}>
                      <GestaoIntegrada />
                    </Suspense>
                  } />
                  <Route path="gestao-projeto/procurement" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProcurementDashboard />
                    </Suspense>
                  } />
                  <Route path="gestao" element={
                    <Suspense fallback={<PageLoader />}>
                      <DashboardAdmin />
                    </Suspense>
                  } />
                  <Route path="projetos" element={
                    <Suspense fallback={<PageLoader />}>
                      <Projetos />
                    </Suspense>
                  } />
                  <Route path="projetos/:id" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetoDetalhe />
                    </Suspense>
                  } />
                  <Route path="projetos/:id/:tab" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetoDetalhe />
                    </Suspense>
                  } />
                  <Route path="projetos/:id/:tab/:subtab" element={
                    <Suspense fallback={<PageLoader />}>
                      <ProjetoDetalhe />
                    </Suspense>
                  } />
                  <Route path="clientes" element={
                    <Suspense fallback={<PageLoader />}>
                      <Clientes />
                    </Suspense>
                  } />
                  <Route path="obras" element={
                    <Suspense fallback={<PageLoader />}>
                      <Obras />
                    </Suspense>
                  } />
                  <Route path="obras/:id" element={
                    <Suspense fallback={<PageLoader />}>
                      <ObraDetalhe />
                    </Suspense>
                  } />
                  <Route path="obras/:id/:tab" element={
                    <Suspense fallback={<PageLoader />}>
                      <ObraDetalhe />
                    </Suspense>
                  } />
                  <Route path="obras/:id/:tab/:subtab" element={
                    <Suspense fallback={<PageLoader />}>
                      <ObraDetalhe />
                    </Suspense>
                  } />
                  <Route path="obras/:id/relatorio-semanal" element={
                    <Suspense fallback={<PageLoader />}>
                      <RelatorioSemanal />
                    </Suspense>
                  } />
                  <Route path="obras/:id/diario" element={
                    <Suspense fallback={<PageLoader />}>
                      <DiarioObra />
                    </Suspense>
                  } />
                  <Route path="obras/:id/comunicacoes" element={
                    <Suspense fallback={<PageLoader />}>
                      <ObraComunicacoes />
                    </Suspense>
                  } />
                  <Route path="diario-obra" element={
                    <Suspense fallback={<PageLoader />}>
                      <DiarioObra />
                    </Suspense>
                  } />
                  <Route path="equipa" element={
                    <Suspense fallback={<PageLoader />}>
                      <Equipa />
                    </Suspense>
                  } />
                  <Route path="equipa/:id" element={
                    <Suspense fallback={<PageLoader />}>
                      <ColaboradorDetalhe />
                    </Suspense>
                  } />
                  <Route path="gestao-obras" element={
                    <Suspense fallback={<PageLoader />}>
                      <GestaoObras />
                    </Suspense>
                  } />
                  <Route path="tarefas" element={
                    <Suspense fallback={<PageLoader />}>
                      <Tarefas />
                    </Suspense>
                  } />
                  <Route path="bloqueios" element={
                    <Suspense fallback={<PageLoader />}>
                      <BlockersDecisions />
                    </Suspense>
                  } />
                  <Route path="workspace" element={
                    <Suspense fallback={<PageLoader />}>
                      <Workspace />
                    </Suspense>
                  } />
                  <Route path="chat" element={
                    <Suspense fallback={<PageLoader />}>
                      <ChatProjetos />
                    </Suspense>
                  } />
                  <Route path="chat-obras" element={
                    <Suspense fallback={<PageLoader />}>
                      <ChatObras />
                    </Suspense>
                  } />
                  <Route path="biblioteca" element={
                    <Suspense fallback={<PageLoader />}>
                      <Biblioteca />
                    </Suspense>
                  } />
                  <Route path="planning" element={
                    <Suspense fallback={<PageLoader />}>
                      <Planning />
                    </Suspense>
                  } />
                  <Route path="calendario" element={
                    <Suspense fallback={<PageLoader />}>
                      <Calendario />
                    </Suspense>
                  } />
                  <Route path="orcamentos" element={
                    <Suspense fallback={<PageLoader />}>
                      <Orcamentos />
                    </Suspense>
                  } />
                  <Route path="orcamentos/:id" element={
                    <Suspense fallback={<PageLoader />}>
                      <OrcamentoDetalhe />
                    </Suspense>
                  } />
                  <Route path="mqt" element={
                    <Suspense fallback={<PageLoader />}>
                      <MQT />
                    </Suspense>
                  } />
                  <Route path="financeiro" element={
                    <Suspense fallback={<PageLoader />}>
                      <Finance />
                    </Suspense>
                  } />
                  <Route path="viabilidade" element={
                    <Suspense fallback={<PageLoader />}>
                      <Viabilidade />
                    </Suspense>
                  } />
                  <Route path="emails" element={
                    <Suspense fallback={<PageLoader />}>
                      <Emails />
                    </Suspense>
                  } />
                  <Route path="fornecedores" element={
                    <Suspense fallback={<PageLoader />}>
                      <Fornecedores />
                    </Suspense>
                  } />
                  <Route path="fornecedores/:id" element={
                    <Suspense fallback={<PageLoader />}>
                      <FornecedorDetalhe />
                    </Suspense>
                  } />
                  <Route path="perfil" element={
                    <Suspense fallback={<PageLoader />}>
                      <Perfil />
                    </Suspense>
                  } />
                  <Route path="configuracoes" element={
                    <Suspense fallback={<PageLoader />}>
                      <Configuracoes />
                    </Suspense>
                  } />
                  <Route path="admin/seed" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminSeed />
                    </Suspense>
                  } />

                  {/* Obras module - new routes */}
                  <Route path="obras-lista" element={
                    <Suspense fallback={<PageLoader />}>
                      <ObrasLista />
                    </Suspense>
                  } />
                  <Route path="obras-chat" element={
                    <Suspense fallback={<PageLoader />}>
                      <ChatObras />
                    </Suspense>
                  } />

                  {/* Gestão Projeto - Leads */}
                  <Route path="leads" element={
                    <Suspense fallback={<PageLoader />}>
                      <Leads />
                    </Suspense>
                  } />

                  {/* Financeiro module */}
                  <Route path="financeiro/custos-fixos" element={
                    <Suspense fallback={<PageLoader />}>
                      <CustosFixos />
                    </Suspense>
                  } />
                  <Route path="financeiro/faturacao" element={
                    <Suspense fallback={<PageLoader />}>
                      <Faturacao />
                    </Suspense>
                  } />
                  <Route path="financeiro/compras" element={
                    <Suspense fallback={<PageLoader />}>
                      <ComprasFinanceiro />
                    </Suspense>
                  } />
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </OAuthCallbackHandler>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
