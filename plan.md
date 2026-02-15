# Plano: Componente FotoComparador

## Contexto

O módulo Acompanhamento (`ProjetoAcompanhamento.jsx`) já tem 2 sub-tabs: "Fotografias" e "Desenhos em Uso Obra". As fotografias são organizadas por visitas (tabela `projeto_acompanhamento_fotos`), cada uma com `data_visita`, `url`, `projeto_id`, `visita_id`, etc. Já existe a constante `COMPARTIMENTOS` em `projectConstants.js`.

A base de dados **não tem** coluna `compartimento` na tabela `projeto_acompanhamento_fotos` — será necessário adicioná-la via migração.

## Plano de Implementação

### 1. Migração SQL — adicionar coluna `compartimento`

**Ficheiro:** `gavinho-app/supabase/migrations/20260215_foto_comparador.sql`

```sql
ALTER TABLE projeto_acompanhamento_fotos
  ADD COLUMN IF NOT EXISTS compartimento VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_acomp_fotos_compartimento
  ON projeto_acompanhamento_fotos(compartimento);
```

Isto permite que cada foto tenha um compartimento associado (ex: "Cozinha", "Suite Principal"), usado pelo comparador para filtrar fotos do mesmo espaço.

### 2. Atualizar `AcompanhamentoFotos.jsx` — campo compartimento no upload

Adicionar selector de compartimento ao upload de fotos (dropdown com `COMPARTIMENTOS`), para que as fotos passem a ter contexto de divisão. Também mostrar badge de compartimento na grid de fotos.

**Alterações em `AcompanhamentoFotos.jsx`:**
- Importar `COMPARTIMENTOS` de `projectConstants`
- No `handleUploadFotos`, adicionar modal/estado para escolher compartimento antes do upload
- No insert do Supabase, incluir `compartimento`
- Na grid de fotos, mostrar badge de compartimento (se existir)

### 3. Criar componente `FotoComparador.jsx`

**Ficheiro:** `gavinho-app/src/components/FotoComparador.jsx`

**Funcionalidades:**
- **Slider before/after horizontal** — duas imagens sobrepostas, com clip-path controlado por drag/touch
- **Selector de datas** — dois dropdowns ("Antes" e "Depois") que listam datas de visitas com fotos
- **Filtro por compartimento** — dropdown com compartimentos disponíveis (que tenham fotos)
- **Grid de fotos** — ao selecionar compartimento + duas datas, mostra thumbnails disponíveis em cada data; o utilizador clica numa foto de cada lado para comparar

**Estrutura do componente:**
```
FotoComparador
├── Header (título + descrição)
├── Filtros (compartimento + data "antes" + data "depois")
├── Seleção de fotos (thumbnails da data "antes" | thumbnails da data "depois")
└── Comparador slider (before/after com drag handle)
```

**Implementação do slider:**
- Container com `position: relative`, `overflow: hidden`
- Imagem "depois" como fundo (100% width)
- Imagem "antes" com `clip-path: inset(0 {100 - position}% 0 0)` ou `width: {position}%` com `overflow: hidden`
- Handle vertical arrastável (onMouseDown/onTouchStart + onMouseMove/onTouchMove)
- Labels "Antes" / "Depois" nos cantos

**Dados:** Busca fotos de `projeto_acompanhamento_fotos` JOIN `projeto_acompanhamento_visitas` para obter datas, filtradas por `projeto_id` e opcionalmente `compartimento`.

### 4. Adicionar sub-tab "Comparador" no ProjetoAcompanhamento

**Ficheiro:** `gavinho-app/src/components/projeto/tabs/ProjetoAcompanhamento.jsx`

**Alterações:**
- Importar `FotoComparador`
- Importar ícone `GitCompareArrows` (ou `SplitSquareHorizontal`) do lucide-react
- Adicionar `{ id: 'comparador', label: 'Comparador', icon: SplitSquareHorizontal }` ao array `acompSections`
- Renderizar `<FotoComparador>` quando `activeAcompSection === 'comparador'`

### 5. CSS Module (opcional)

Se necessário para animações/estilos complexos do slider, criar `FotoComparador.module.css`. Caso contrário, seguir o padrão inline styles usado em `AcompanhamentoFotos.jsx`.

**Decisão:** Usar CSS Module apenas para o slider (`:hover`, `cursor: col-resize`, transições), restante inline como no padrão existente.

**Ficheiro:** `gavinho-app/src/components/FotoComparador.module.css`

## Ficheiros Afetados

| Ficheiro | Ação |
|----------|------|
| `supabase/migrations/20260215_foto_comparador.sql` | **Novo** — migração BD |
| `src/components/FotoComparador.jsx` | **Novo** — componente principal |
| `src/components/FotoComparador.module.css` | **Novo** — estilos do slider |
| `src/components/AcompanhamentoFotos.jsx` | **Editar** — adicionar campo compartimento |
| `src/components/projeto/tabs/ProjetoAcompanhamento.jsx` | **Editar** — nova sub-tab |

## Sem Dependências Externas

Slider implementado com CSS puro (`clip-path`) + event handlers nativos. Não requer bibliotecas adicionais.
