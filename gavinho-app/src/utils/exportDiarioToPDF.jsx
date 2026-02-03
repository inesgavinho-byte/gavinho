import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// SVG Icons for weather conditions
const weatherIcons = {
  'Bom': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>`,
  'Sol': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>`,
  'Nublado': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
  </svg>`,
  'Chuva': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
    <path d="M16 14v6"></path>
    <path d="M8 14v6"></path>
    <path d="M12 16v6"></path>
  </svg>`,
  'Vento': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path>
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path>
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>
  </svg>`,
  'Frio': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20"></path>
    <path d="m4.93 4.93 14.14 14.14"></path>
    <path d="m19.07 4.93-14.14 14.14"></path>
    <path d="M2 12h20"></path>
  </svg>`,
  'Neblina': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
  </svg>`
}

// Format date to Portuguese format
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

// Format short date
const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Generate HTML content for PDF
const generateDiarioHTML = (diario, obra, equipa = [], tarefas = [], ocorrencias = [], naoConformidades = []) => {
  const weatherCondition = diario.condicoes_meteo || 'Bom'
  const weatherIcon = weatherIcons[weatherCondition] || weatherIcons['Bom']

  // Calculate worker stats
  const trabalhadores = equipa || []
  const presentes = trabalhadores.filter(t => t.estado === 'Presente' || t.presente).length
  const ausentes = trabalhadores.filter(t => t.estado === 'Ausente' || !t.presente).length
  const subempreiteiros = trabalhadores.filter(t => t.tipo === 'Subempreiteiro').length

  const totalTrabalhadores = (diario.trabalhadores_gavinho || 0) + (diario.trabalhadores_subempreiteiros || 0)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --warm-beige: #ADAA96;
          --soft-cream: #F2F0E7;
          --olive-gray: #8B8670;
          --white: #FFFFFF;
          --text-dark: #3D3D3D;
          --text-muted: #6B6B6B;
          --border-light: #E5E2D9;
          --error: #9A6B5B;
          --warning: #C9A86C;
          --success: #7A8B6E;
        }

        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: var(--soft-cream);
          color: var(--text-dark);
          line-height: 1.5;
          padding: 32px;
          width: 794px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .breadcrumb span {
          color: var(--warm-beige);
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 4px;
        }

        .page-header p {
          font-size: 13px;
          color: var(--text-muted);
        }

        .meta-bar {
          background: var(--white);
          border-radius: 10px;
          border: 1px solid var(--border-light);
          padding: 20px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 20px;
        }

        .meta-field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .meta-field .value {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-dark);
          padding: 10px 12px;
          background: var(--soft-cream);
          border-radius: 6px;
        }

        .section-card {
          background: var(--white);
          border-radius: 10px;
          border: 1px solid var(--border-light);
          padding: 24px;
          margin-bottom: 20px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-light);
        }

        .section-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--olive-gray);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .section-title-group {
          flex: 1;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-dark);
        }

        .section-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Weather Section */
        .weather-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .weather-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          min-width: 90px;
        }

        .weather-option.selected {
          border-color: var(--warm-beige);
          background: rgba(173, 170, 150, 0.1);
        }

        .weather-option svg {
          color: var(--olive-gray);
        }

        .weather-option.selected svg {
          color: var(--warm-beige);
        }

        .weather-option span {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .weather-option.selected span {
          color: var(--text-dark);
        }

        .weather-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-light);
        }

        .weather-detail label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .weather-detail .value {
          font-size: 14px;
          color: var(--text-dark);
          padding: 10px 12px;
          background: var(--soft-cream);
          border-radius: 6px;
        }

        /* Workers Section */
        .workers-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .worker-count-box {
          flex: 1;
          padding: 16px;
          background: var(--soft-cream);
          border-radius: 8px;
          text-align: center;
        }

        .worker-count-box .count {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-dark);
        }

        .worker-count-box .label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .workers-table {
          width: 100%;
          border-collapse: collapse;
        }

        .workers-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          padding: 12px;
          border-bottom: 1px solid var(--border-light);
        }

        .workers-table td {
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-light);
        }

        .workers-table tr:last-child td {
          border-bottom: none;
        }

        .worker-status {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .worker-status.presente {
          background: rgba(122, 139, 110, 0.15);
          color: var(--success);
        }

        .worker-status.ausente {
          background: rgba(154, 107, 91, 0.15);
          color: var(--error);
        }

        /* Tasks Section */
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border-light);
        }

        .task-item:last-child {
          border-bottom: none;
        }

        .task-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-light);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .task-checkbox.checked {
          background: var(--olive-gray);
          border-color: var(--olive-gray);
        }

        .task-checkbox svg {
          width: 12px;
          height: 12px;
          color: var(--white);
        }

        .task-content {
          flex: 1;
        }

        .task-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 4px;
        }

        .task-desc {
          font-size: 12px;
          color: var(--text-muted);
        }

        .task-progress {
          width: 80px;
          text-align: right;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark);
        }

        /* Severity Section */
        .severity-options {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .severity-option {
          flex: 1;
          padding: 12px;
          border: 2px solid var(--border-light);
          border-radius: 8px;
          text-align: center;
        }

        .severity-option.selected.baixa {
          border-color: var(--success);
          background: rgba(122, 139, 110, 0.1);
        }

        .severity-option.selected.media {
          border-color: var(--warning);
          background: rgba(201, 168, 108, 0.1);
        }

        .severity-option.selected.alta {
          border-color: var(--error);
          background: rgba(154, 107, 91, 0.1);
        }

        .severity-option span {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .severity-option.selected.baixa span { color: var(--success); }
        .severity-option.selected.media span { color: var(--warning); }
        .severity-option.selected.alta span { color: var(--error); }

        /* NC Items */
        .nc-item {
          padding: 16px;
          background: var(--soft-cream);
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .nc-item:last-child {
          margin-bottom: 0;
        }

        .nc-header {
          margin-bottom: 12px;
        }

        .nc-tag {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .nc-tag.critica {
          background: rgba(154, 107, 91, 0.15);
          color: var(--error);
        }

        .nc-tag.maior {
          background: rgba(201, 168, 108, 0.15);
          color: var(--warning);
        }

        .nc-tag.menor {
          background: rgba(122, 139, 110, 0.15);
          color: var(--success);
        }

        .nc-field {
          margin-bottom: 12px;
        }

        .nc-field:last-child {
          margin-bottom: 0;
        }

        .nc-field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .nc-field .content {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-dark);
        }

        /* Photos Section */
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .photo-item {
          border-radius: 8px;
          overflow: hidden;
          background: var(--soft-cream);
          border: 1px solid var(--border-light);
        }

        .photo-preview {
          width: 100%;
          height: 150px;
          overflow: hidden;
        }

        .photo-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-caption {
          padding: 8px 12px;
          border-top: 1px solid var(--border-light);
          background: var(--white);
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Form Groups */
        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 8px;
        }

        .form-group .content {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-dark);
          white-space: pre-wrap;
          padding: 12px;
          background: var(--soft-cream);
          border-radius: 6px;
        }

        /* Footer */
        .pdf-footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--text-muted);
        }

        .pdf-footer .logo {
          font-weight: 700;
          color: var(--warm-beige);
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <span>Obras</span> › <span>${obra?.codigo || ''}</span> › Diário de Obra
      </div>

      <!-- Page Header -->
      <div class="page-header">
        <h1>Diário de Obra</h1>
        <p>Registo diário de atividades, recursos e ocorrências</p>
      </div>

      <!-- Meta Bar -->
      <div class="meta-bar">
        <div class="meta-field">
          <label>OBRA</label>
          <div class="value">${obra?.codigo || ''} — ${obra?.nome || ''}</div>
        </div>
        <div class="meta-field">
          <label>DATA</label>
          <div class="value">${formatShortDate(diario.data)}</div>
        </div>
        <div class="meta-field">
          <label>FUNÇÃO</label>
          <div class="value">${diario.funcao || 'Encarregado de Obra'}</div>
        </div>
      </div>

      <!-- Section 1: Weather Conditions -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-number">1</div>
          <div class="section-title-group">
            <div class="section-title">Condições Meteorológicas</div>
            <div class="section-subtitle">Condições observadas durante o dia</div>
          </div>
        </div>

        <div class="weather-grid">
          ${['Sol', 'Nublado', 'Chuva', 'Vento', 'Neblina'].map(condition => `
            <div class="weather-option ${weatherCondition === condition || (condition === 'Sol' && weatherCondition === 'Bom') ? 'selected' : ''}">
              ${weatherIcons[condition] || weatherIcons['Bom']}
              <span>${condition}</span>
            </div>
          `).join('')}
        </div>

        ${diario.temperatura || diario.observacoes_meteo ? `
          <div class="weather-details">
            ${diario.temperatura ? `
              <div class="weather-detail">
                <label>TEMPERATURA (°C)</label>
                <div class="value">${diario.temperatura}</div>
              </div>
            ` : ''}
            ${diario.observacoes_meteo ? `
              <div class="weather-detail">
                <label>OBSERVAÇÕES</label>
                <div class="value">${diario.observacoes_meteo}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Section 2: Workers -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-number">2</div>
          <div class="section-title-group">
            <div class="section-title">Trabalhadores / Subempreiteiros Presentes</div>
            <div class="section-subtitle">Registo de presenças da equipa em obra</div>
          </div>
        </div>

        <div class="workers-summary">
          <div class="worker-count-box">
            <div class="count">${diario.trabalhadores_gavinho || presentes || 0}</div>
            <div class="label">PRESENTES</div>
          </div>
          <div class="worker-count-box">
            <div class="count">${ausentes || 0}</div>
            <div class="label">AUSENTES</div>
          </div>
          <div class="worker-count-box">
            <div class="count">${diario.trabalhadores_subempreiteiros || subempreiteiros || 0}</div>
            <div class="label">SUBEMPREITEIROS</div>
          </div>
        </div>

        ${trabalhadores.length > 0 ? `
          <table class="workers-table">
            <thead>
              <tr>
                <th>NOME</th>
                <th>FUNÇÃO</th>
                <th>TIPO</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              ${trabalhadores.map(t => `
                <tr>
                  <td>${t.nome || ''}</td>
                  <td>${t.funcao || ''}</td>
                  <td>${t.tipo || 'Equipa'}</td>
                  <td>
                    <span class="worker-status ${(t.estado || t.presente) === 'Presente' || t.presente ? 'presente' : 'ausente'}">
                      ${(t.estado || t.presente) === 'Presente' || t.presente ? 'Presente' : 'Ausente'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="form-group">
            <label>Horas Trabalhadas</label>
            <div class="content">${diario.horas_trabalhadas || 8} horas</div>
          </div>
        `}
      </div>

      <!-- Section 3: Tasks Executed -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-number">3</div>
          <div class="section-title-group">
            <div class="section-title">Tarefas Executadas</div>
            <div class="section-subtitle">Trabalhos realizados durante o dia</div>
          </div>
        </div>

        ${tarefas.length > 0 ? `
          ${tarefas.map(t => `
            <div class="task-item">
              <div class="task-checkbox ${t.concluida || t.progresso >= 100 ? 'checked' : ''}">
                ${t.concluida || t.progresso >= 100 ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
              </div>
              <div class="task-content">
                <div class="task-title">${t.titulo || t.nome || ''}</div>
                <div class="task-desc">${t.descricao || ''}</div>
              </div>
              <div class="task-progress">${t.progresso || 0}%</div>
            </div>
          `).join('')}
        ` : diario.trabalhos_realizados ? `
          <div class="form-group">
            <div class="content">${diario.trabalhos_realizados}</div>
          </div>
        ` : `
          <div class="empty-state">Sem tarefas registadas</div>
        `}

        ${diario.trabalhos_previstos_amanha ? `
          <div class="form-group" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-light);">
            <label>Trabalhos Previstos para Amanhã</label>
            <div class="content">${diario.trabalhos_previstos_amanha}</div>
          </div>
        ` : ''}
      </div>

      <!-- Section 4: Occurrences / Incidents -->
      ${(ocorrencias.length > 0 || diario.problemas) ? `
        <div class="section-card">
          <div class="section-header">
            <div class="section-number">4</div>
            <div class="section-title-group">
              <div class="section-title">Ocorrências / Incidentes</div>
              <div class="section-subtitle">Situações relevantes ou problemas identificados</div>
            </div>
          </div>

          ${ocorrencias.length > 0 ? ocorrencias.map(o => `
            <div class="severity-options">
              <div class="severity-option ${o.severidade === 'Baixa' ? 'selected baixa' : ''}">
                <span>Baixa</span>
              </div>
              <div class="severity-option ${o.severidade === 'Média' ? 'selected media' : ''}">
                <span>Média</span>
              </div>
              <div class="severity-option ${o.severidade === 'Alta' ? 'selected alta' : ''}">
                <span>Alta</span>
              </div>
            </div>
            <div class="form-group">
              <label>Descrição da Ocorrência</label>
              <div class="content">${o.descricao || ''}</div>
            </div>
          `).join('') : `
            <div class="form-group">
              <label>Descrição</label>
              <div class="content">${diario.problemas}</div>
            </div>
          `}
        </div>
      ` : ''}

      <!-- Section 5: Non-Conformities -->
      ${naoConformidades.length > 0 ? `
        <div class="section-card">
          <div class="section-header">
            <div class="section-number">5</div>
            <div class="section-title-group">
              <div class="section-title">Não Conformidades</div>
              <div class="section-subtitle">Desvios ao projeto, especificações ou normas</div>
            </div>
          </div>

          ${naoConformidades.map(nc => `
            <div class="nc-item">
              <div class="nc-header">
                <span class="nc-tag ${nc.severidade?.toLowerCase() || 'menor'}">${nc.severidade || 'MENOR'}</span>
              </div>
              <div class="nc-field">
                <label>Descrição</label>
                <div class="content">${nc.descricao || ''}</div>
              </div>
              ${nc.acao_corretiva ? `
                <div class="nc-field">
                  <label>Ação Corretiva Proposta</label>
                  <div class="content">${nc.acao_corretiva}</div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Section 6: Photos -->
      ${diario.fotos && diario.fotos.length > 0 ? `
        <div class="section-card">
          <div class="section-header">
            <div class="section-number">${naoConformidades.length > 0 ? '6' : (ocorrencias.length > 0 || diario.problemas ? '5' : '4')}</div>
            <div class="section-title-group">
              <div class="section-title">Registo Fotográfico</div>
              <div class="section-subtitle">Fotografias dos trabalhos e situações relevantes</div>
            </div>
          </div>

          <div class="photos-grid">
            ${diario.fotos.map(foto => `
              <div class="photo-item">
                <div class="photo-preview">
                  <img src="${foto.url || foto}" alt="${foto.nome || 'Foto'}" crossorigin="anonymous" />
                </div>
                <div class="photo-caption-section">
                  <label style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B6B6B; margin-bottom: 4px; padding: 8px 12px 0;">DESCRIÇÃO</label>
                  <div style="padding: 0 12px 12px; font-size: 12px; color: #3D3D3D; line-height: 1.4;">${foto.descricao || foto.legenda || foto.nome || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Section 7: Next Steps -->
      ${diario.proximos_passos || diario.trabalhos_previstos_amanha ? `
        <div class="section-card">
          <div class="section-header">
            <div class="section-number">${(() => {
              let num = 4
              if (ocorrencias.length > 0 || diario.problemas) num++
              if (naoConformidades.length > 0) num++
              if (diario.fotos && diario.fotos.length > 0) num++
              return num
            })()}</div>
            <div class="section-title-group">
              <div class="section-title">Próximos Passos Sugeridos</div>
              <div class="section-subtitle">Recomendações para o dia seguinte com base no observado</div>
            </div>
          </div>

          <div class="form-group">
            <div class="content" style="white-space: pre-line;">${diario.proximos_passos || diario.trabalhos_previstos_amanha || ''}</div>
          </div>
        </div>
      ` : ''}

      <!-- Footer -->
      <div class="pdf-footer">
        <div class="logo">GAVINHO</div>
        <div>Gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </body>
    </html>
  `
}

// Main export function
export const exportDiarioToPDF = async (diario, obra, options = {}) => {
  const {
    equipa = [],
    tarefas = [],
    ocorrencias = [],
    naoConformidades = [],
    filename = null
  } = options

  // Create a hidden container for rendering
  const container = document.createElement('div')
  container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 794px;'
  document.body.appendChild(container)

  try {
    // Generate HTML content
    const htmlContent = generateDiarioHTML(diario, obra, equipa, tarefas, ocorrencias, naoConformidades)
    container.innerHTML = htmlContent

    // Wait for images to load
    const images = container.getElementsByTagName('img')
    const imagePromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve()
        } else {
          img.onload = resolve
          img.onerror = resolve
        }
      })
    })
    await Promise.all(imagePromises)

    // Small delay to ensure rendering
    await new Promise(resolve => setTimeout(resolve, 100))

    // Capture with html2canvas
    const canvas = await html2canvas(container.querySelector('body'), {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#F2F0E7',
      logging: false
    })

    // Create PDF
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const pdf = new jsPDF('p', 'mm', 'a4')

    let heightLeft = imgHeight
    let position = 0

    // Add first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Generate filename
    const defaultFilename = `Diario_Obra_${obra?.codigo || 'obra'}_${formatShortDate(diario.data).replace(/\//g, '-')}.pdf`

    // Download PDF
    pdf.save(filename || defaultFilename)

    return true
  } catch (error) {
    throw error
  } finally {
    // Clean up
    document.body.removeChild(container)
  }
}

export default exportDiarioToPDF
