import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import ChatColaborativo from './pages/ChatColaborativo'
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/registo" element={<Registo />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
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
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="bloqueios" element={<BlockersDecisions />} />
            <Route path="chat" element={<ChatColaborativo />} />
            <Route path="chat-obras" element={<ChatObras />} />
            <Route path="biblioteca" element={<Biblioteca />} />
            <Route path="planning" element={<Planning />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="orcamentos" element={<Orcamentos />} />
            <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
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
  )
}

export default App
