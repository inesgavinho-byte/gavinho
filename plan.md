# Plano: Timeline Fotográfico no Acompanhamento

## Contexto

O subtab "Fotografias" em `AcompanhamentoTab.jsx` (linha 390-534) mostra atualmente uma **grelha plana** de fotos com filtros de zona e especialidade. Vamos transformá-lo numa **timeline vertical** com fotos agrupadas por data de visita, filtro por zona/compartimento, e lightbox com navegação.

**Tabela existente:** `obra_fotografias` — já tem `data_fotografia`, `zona_id` (FK → `obra_zonas`), `especialidade_id`. Não é necessária nenhuma migração SQL.

**Ficheiro único a alterar:** `gavinho-app/src/pages/ObraDetalhe/AcompanhamentoTab.jsx`

---

## Passos de Implementação

### 1. Adicionar estado para lightbox navegável

Substituir o `fotoPreview` (foto única, sem navegação) por:
- `lightboxIndex` (number | null) — índice na lista `filteredFotos`, `null` = fechado

Adicionar `useEffect` para keyboard listener (ArrowLeft, ArrowRight, Escape).

### 2. Agrupar fotos por data no render

Criar helper `groupByDate(filteredFotos)` que agrupa fotos por `data_fotografia` e retorna array de `{ date, fotos }` ordenado do mais recente para o mais antigo.

### 3. Redesenhar layout como timeline vertical

Substituir a grelha plana (linhas 428-451) por:
- Para cada grupo de data:
  - **Header de data:** linha horizontal com dot (●), label de data ("14 Fev 2026"), contagem de fotos
  - **Linha vertical** do lado esquerdo (2px, `colors.border`)
  - **Grelha de thumbnails** à direita: `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`, gap 8px
  - Thumbnails com aspecto 4:3, object-fit cover, border-radius 8, hover overlay

### 4. Filtro por zona/compartimento (já existe)

Manter os dois selects existentes (zona + especialidade). Estes filtram as fotos antes do agrupamento por data, pelo que o timeline só mostra datas que têm fotos na zona/especialidade selecionada.

### 5. Lightbox com navegação

Substituir o lightbox atual (linhas 454-480) por:
- Overlay fullscreen escuro (`rgba(0,0,0,0.9)`)
- Imagem central (`max-height: 80vh`, object-fit contain)
- Setas de navegação (ChevronLeft / ChevronRight do lucide-react)
- Contador "N de M" no topo
- Metadados: título, data, zona, especialidade
- Botão Eliminar + Fechar
- Teclado: Escape fecha, ← → navega
- Setas disabled nos limites

### 6. Upload modal — sem alterações

O modal de upload existente (linhas 483-532) funciona corretamente e não precisa de mudanças.

---

## Design Visual

```
[Filtros: Zona ▼ | Especialidade ▼]                [Upload Fotos]
 N fotografias

 ● 14 Fev 2026 · 8 fotos ─────────────────────────────────────
 │
 │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
 │   │ foto │ │ foto │ │ foto │ │ foto │ │ foto │
 │   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
 │   ┌──────┐ ┌──────┐ ┌──────┐
 │   │ foto │ │ foto │ │ foto │
 │   └──────┘ └──────┘ └──────┘
 │
 ● 10 Fev 2026 · 3 fotos ─────────────────────────────────────
 │
 │   ┌──────┐ ┌──────┐ ┌──────┐
 │   │ foto │ │ foto │ │ foto │
 │   └──────┘ └──────┘ └──────┘
 │
 ● 5 Fev 2026 · 5 fotos ──────────────────────────────────────
 │
 │   ...
```

### Especificações visuais
- **Dot (●):** 12px círculo, `background: colors.primary`
- **Linha vertical:** 2px, `colors.border`, ligação entre grupos
- **Data label:** font-weight 700, `colors.text`, formato "dd Mmm yyyy" (pt-PT)
- **Thumbnails:** minmax(160px, 1fr) grid, aspect-ratio 4:3 via padding-bottom 75%, object-fit cover, border-radius 8
- **Hover:** leve scale(1.02) + sombra, cursor pointer
- **Especialidade badge:** mantido no canto superior esquerdo do thumbnail

---

## Lightbox

```
┌─────────────────────────────────────────────────┐
│                                    3 de 15  [X] │
│                                                 │
│   ◀      ┌──────────────────────┐      ▶        │
│          │                      │               │
│          │    foto em grande    │               │
│          │                      │               │
│          └──────────────────────┘               │
│                                                 │
│   Título da foto                                │
│   14/02/2026 · Cozinha · Elétrico               │
│                                    [Eliminar]   │
└─────────────────────────────────────────────────┘
```

---

## Resumo de Alterações

| Localização no ficheiro | Alteração |
|------------------------|-----------|
| Estado (linhas 14-24) | Substituir `fotoPreview` por `lightboxIndex` |
| Imports (linha 4) | Adicionar `ChevronLeft`, `ChevronRight` do lucide-react |
| `renderFotografiasTab()` (linhas 390-534) | Reescrever grelha → timeline + novo lightbox |

Nenhum ficheiro novo. Nenhuma migração SQL. Nenhuma dependência externa nova.
