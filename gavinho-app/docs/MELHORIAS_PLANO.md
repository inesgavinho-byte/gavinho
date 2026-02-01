# Plano de Melhorias - Gavinho Platform

**Última atualização:** 2026-02-01

---

## Resumo por Gravidade

| Gravidade | Categoria | Contagem |
|-----------|-----------|----------|
| **CRÍTICO** | Botões não funcionais | 5 |
| **CRÍTICO** | Console.log de debug | 50+ |
| **CRÍTICO** | Dados mock em produção | 3 |
| **ALTO** | Validações em falta | 15+ |
| **ALTO** | Queries N+1 | 3+ |
| **ALTO** | UX com alerts() | 30+ |
| **MÉDIO** | Funcionalidades incompletas | 4 |
| **MÉDIO** | Falta memoização | 5+ |
| **MÉDIO** | Inconsistência design | 10+ |
| **BAIXO** | Código morto | 10+ |

---

## Fase 1 - URGENTE

### 1.1 Remover Console.logs de Debug

**Ficheiros afetados:**
- `src/components/ProjetoArchviz.jsx` - linhas 181-213, 304-388
- `src/pages/ProjetoDetalhe.jsx` - múltiplas linhas
- `src/pages/Workspace.jsx` - linha 544

**Ação:** Remover todos os `console.log()` de debug antes de produção.

---

### 1.2 Implementar Handlers de Botões

**ObraDetalhe.jsx - Botões sem funcionalidade:**

| Linha | Botão | Estado |
|-------|-------|--------|
| 1063 | "Criar Orçamento do MQT" | ❌ Não funcional |
| 1143 | "Nova POP" | ❌ Não funcional |
| 1254 | "Nova Compra" | ❌ Não funcional |
| 1327 | "Registar Execução" | ❌ Não funcional |
| 1397 | "Novo Auto" | ❌ Não funcional |

**Ação:** Implementar handlers ou remover botões.

---

### 1.3 Remover Mock Data

**Dashboard.jsx:38-90**
```javascript
// Mock data - in production would come from chat_mensagens table
const [recentActivity, setRecentActivity] = useState([...])
```

**Workspace.jsx:544**
```javascript
console.error('Tabela chat_mensagens não existe, usando mock:', error)
```

**Ação:** Substituir por dados reais das tabelas `chat_mensagens`.

---

### 1.4 Validações de Upload

**ProjetoArchviz.jsx:293-302**
- Sem validação de tamanho de ficheiro
- Sem validação de tipo de ficheiro
- Apenas `alert()` para feedback

**Ação:** Adicionar validações:
```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

if (file.size > MAX_FILE_SIZE) {
  // Mostrar erro
}
if (!ALLOWED_TYPES.includes(file.type)) {
  // Mostrar erro
}
```

---

## Fase 2 - IMPORTANTE

### 2.1 Substituir alert()/confirm() por Modais

**Ficheiros com alert()/confirm():**

| Ficheiro | Linhas | Quantidade |
|----------|--------|------------|
| ObraTracking.jsx | 149, 156, 635, 644, 679, 684, 689, 739, 775 | 9 |
| ProjetoDocumentos.jsx | 104, 114, 151, 158, 169 | 5 |
| ProjetoAtas.jsx | 689, 1065, 1097, 1104, 1116 | 5 |
| ProjetoArchviz.jsx | 293-302, 466-469 | 4 |
| Outros | - | 12+ |

**Ação:** Criar componente `ConfirmModal` reutilizável.

---

### 2.2 Estados de Loading

**Problemas:**
- Mudança de tabs sem loading state
- Inline editing sem feedback
- Modais não desabilitam ao submeter

**Ficheiros:**
- `ObraDetalhe.jsx` - tabs e modais
- `Projetos.jsx:214-293` - modal submit
- `ProjetoArchviz.jsx` - upload

**Ação:** Adicionar loading states consistentes.

---

### 2.3 Otimizar Queries N+1

**Projetos.jsx:85-116**
```javascript
// Problema: JOIN em JavaScript
projetosComMetricas = projetos.map(p => {
  const projEntregaveis = entregaveis.filter(e => e.projeto_id === p.id) // N+1!
  const projPagamentos = pagamentos.filter(pg => pg.projeto_id === p.id) // N+1!
})
```

**Ação:** Usar JOINs no Supabase:
```javascript
const { data } = await supabase
  .from('projetos')
  .select(`
    *,
    projeto_entregaveis(status),
    projeto_pagamentos(valor, estado)
  `)
```

---

### 2.4 Sanitização de Texto

**ObraChat.jsx:96-98**
```javascript
<p>{comment.comentario}</p>
// Risco de XSS - sem sanitização
```

**Ação:** Usar biblioteca de sanitização (DOMPurify) ou escape de HTML.

---

## Fase 3 - MELHORIAS

### 3.1 Memoização

**Componentes sem memoização:**
- `ObraDetalhe.jsx` - dados calculados
- `Projetos.jsx` - filtros e transformações
- `Dashboard.jsx` - métricas

**Ação:** Usar `useMemo` para cálculos pesados:
```javascript
const metricas = useMemo(() => {
  return calcularMetricas(dados);
}, [dados]);
```

---

### 3.2 Consolidar Cores/Estilos

**Problema:** Cores hardcoded em múltiplos ficheiros
- `ObraDetalhe.jsx:70-81` - objeto colors
- `ObraChat.jsx:8-20` - objeto colors
- `ProjetoArchviz.jsx` - inline styles

**Ação:** Criar ficheiro centralizado:
```javascript
// src/constants/colors.js
export const COLORS = {
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    // ...
  }
}
```

---

### 3.3 Acessibilidade

**Problemas:**
- Sem labels em inputs
- Sem `aria-label` em botões com ícones
- Sem keyboard navigation em dropdowns
- Modais sem focus trap

**Ação:** Adicionar atributos de acessibilidade:
```jsx
<button aria-label="Adicionar render">
  <Plus size={16} />
</button>

<input
  id="nome"
  aria-describedby="nome-help"
/>
<span id="nome-help">Texto de ajuda</span>
```

---

### 3.4 Completar Funcionalidades Placeholder

**ObraDetalhe.jsx - Tabs incompletas:**

| Linha | Tab | Estado |
|-------|-----|--------|
| 1797-1811 | Acompanhamento | Placeholder |
| 1814-1828 | Fiscalização | Placeholder |
| 1831-1845 | Equipas | Placeholder |
| 1848-1860 | Projeto | Sem conteúdo |

**Ação:** Implementar ou remover tabs.

---

### 3.5 Limpar Código Morto

**Imports não utilizados - ObraDetalhe.jsx:1-10**
```javascript
import {
  ArrowLeft, Plus, Edit, Trash2, Save, Download, Upload, Lock, Unlock, Copy,
  ChevronDown, Check, X, FileText, Calculator, Receipt, ShoppingCart,
  TrendingUp, ClipboardList, Building2, MapPin, Calendar, Users, HardHat,
  AlertTriangle, Eye, Send, FileCheck, MoreVertical, Camera, BookOpen,
  Shield, Truck, Grid3X3, BarChart3, MessageSquare, CheckSquare
}
```

**Ação:** Verificar e remover imports não usados.

---

## Ficheiros Prioritários

| Prioridade | Ficheiro | Problemas |
|------------|----------|-----------|
| 1 | `ProjetoArchviz.jsx` | 50+ console.logs, validações fracas |
| 2 | `ObraDetalhe.jsx` | 5 botões não funcionais, placeholders |
| 3 | `Projetos.jsx` | Queries N+1, filtro não funciona |
| 4 | `Dashboard.jsx` | Mock data hardcoded |
| 5 | `Workspace.jsx` | Fallback para mock |

---

## Checklist de Implementação

### Fase 1
- [x] Remover console.logs de ProjetoArchviz.jsx
- [x] Remover console.logs de ProjetoDetalhe.jsx
- [x] Remover console.logs de Workspace.jsx
- [ ] Implementar handler "Criar Orçamento do MQT"
- [ ] Implementar handler "Nova POP"
- [ ] Implementar handler "Nova Compra"
- [ ] Implementar handler "Registar Execução"
- [ ] Implementar handler "Novo Auto"
- [x] Remover mock data do Dashboard
- [x] Remover mock data do Workspace
- [x] Adicionar validação de tamanho de ficheiro
- [x] Adicionar validação de tipo de ficheiro

### Fase 2
- [x] Criar componente ConfirmModal
- [ ] Substituir alert() por ConfirmModal
- [ ] Substituir confirm() por ConfirmModal
- [ ] Adicionar loading states em tabs
- [ ] Adicionar loading states em modais
- [x] Otimizar queries com JOINs
- [x] Adicionar sanitização de texto

### Fase 3
- [ ] Adicionar useMemo em ObraDetalhe
- [x] Adicionar useMemo em Projetos
- [x] Criar ficheiro de cores centralizado
- [ ] Adicionar aria-labels
- [x] Adicionar focus trap em modais (ConfirmModal)
- [ ] Completar ou remover tabs placeholder
- [ ] Remover imports não utilizados

---

## Notas

- Priorizar Fase 1 antes de deploy em produção
- Fase 2 pode ser feita incrementalmente
- Fase 3 são melhorias de qualidade de código
- Testar cada alteração antes de commit
