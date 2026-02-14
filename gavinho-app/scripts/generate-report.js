const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
        HeadingLevel, LevelFormat, PageBreak } = require('docx');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// GAVINHO Brand Colors (converted to hex)
const COLORS = {
  olive: '8B8670',
  blush: 'ADAA96',
  cream: 'F2F0E7',
  brown: '5D5348',
  black: '000000',
  white: 'FFFFFF'
};

// Helper to download image from URL
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Format date in Portuguese
function formatDatePT(dateStr) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const d = new Date(dateStr);
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDateEN(dateStr) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const d = new Date(dateStr);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Create cell with consistent styling
function createCell(content, options = {}) {
  const { 
    bold = false, 
    shading = null, 
    alignment = AlignmentType.LEFT,
    width = null,
    colSpan = 1
  } = options;
  
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush },
    left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush },
    right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush }
  };

  const children = Array.isArray(content) ? content : [
    new Paragraph({
      alignment,
      children: [new TextRun({ text: content, bold, size: 22, font: 'Quattrocento Sans' })]
    })
  ];

  const cellOptions = {
    borders,
    children,
    columnSpan: colSpan
  };
  
  if (shading) cellOptions.shading = { fill: shading, type: ShadingType.CLEAR };
  if (width) cellOptions.width = { size: width, type: WidthType.DXA };

  return new TableCell(cellOptions);
}

// Generate the report document
async function generateReport(data) {
  const { obra, diarios, startDate, endDate, isClientVersion } = data;
  
  const reportDate = new Date().toISOString().split('T')[0];
  const reportRef = `${obra.codigo}-REL-${reportDate.replace(/-/g, '').slice(2)}`;
  
  // Collect all photos
  const allPhotos = [];
  diarios.forEach(d => {
    if (d.fotos && d.fotos.length > 0) {
      d.fotos.forEach((foto, idx) => {
        allPhotos.push({
          ...foto,
          data: d.data,
          caption: foto.descricao || `Foto ${allPhotos.length + 1}`
        });
      });
    }
  });

  // Download photos for embedding
  const photoBuffers = [];
  for (const photo of allPhotos.slice(0, isClientVersion ? 8 : 16)) {
    try {
      const buffer = await downloadImage(photo.url);
      photoBuffers.push({ buffer, caption: photo.caption, data: photo.data });
    } catch (e) {
      console.error('Error downloading photo:', e);
    }
  }

  // Build document sections
  const children = [];

  // ============= HEADER =============
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ 
        text: 'RELATÓRIO DE ACOMPANHAMENTO DE OBRA', 
        bold: true, 
        size: 28,
        font: 'Cormorant Garamond',
        color: COLORS.olive
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ 
        text: `WORK PROGRESS REPORT ${reportDate.replace(/-/g, '')}`, 
        size: 22,
        font: 'Quattrocento Sans',
        color: COLORS.brown
      })]
    }),
    // Separator line
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.blush } },
      spacing: { after: 400 }
    })
  );

  // ============= PROJECT IDENTIFICATION =============
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ 
        text: 'IDENTIFICAÇÃO | PROJECT IDENTIFICATION', 
        bold: true, 
        size: 24,
        font: 'Cormorant Garamond',
        color: COLORS.olive
      })]
    }),
    new Table({
      columnWidths: [2500, 6860],
      rows: [
        new TableRow({ children: [
          createCell('Obra | Project', { bold: true, shading: COLORS.cream, width: 2500 }),
          createCell(`${obra.codigo} – ${obra.nome}`, { width: 6860 })
        ]}),
        new TableRow({ children: [
          createCell('Localização | Location', { bold: true, shading: COLORS.cream, width: 2500 }),
          createCell(obra.localizacao || '-', { width: 6860 })
        ]}),
        new TableRow({ children: [
          createCell('Período | Period', { bold: true, shading: COLORS.cream, width: 2500 }),
          createCell(`${formatDateShort(startDate)}-${formatDateShort(endDate)} | ${formatDateEN(startDate).split(',')[0]}-${formatDateEN(endDate)}`, { width: 6860 })
        ]}),
        new TableRow({ children: [
          createCell('Data Relatório | Report Date', { bold: true, shading: COLORS.cream, width: 2500 }),
          createCell(`${formatDatePT(reportDate)} | ${formatDateEN(reportDate)}`, { width: 6860 })
        ]})
      ]
    })
  );

  // ============= EXECUTIVE SUMMARY =============
  // Combine all daily summaries
  const summaryPT = diarios.map(d => d.resumo).filter(Boolean).join(' ');
  
  if (summaryPT) {
    children.push(
      new Paragraph({ spacing: { before: 400 } }),
      new Table({
        columnWidths: [9360],
        rows: [
          new TableRow({ children: [
            createCell('RESUMO EXECUTIVO | EXECUTIVE SUMMARY', { 
              bold: true, 
              shading: COLORS.cream, 
              alignment: AlignmentType.CENTER,
              width: 9360
            })
          ]}),
          new TableRow({ children: [
            createCell([
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [new TextRun({ 
                  text: summaryPT, 
                  italics: true, 
                  size: 22,
                  font: 'Quattrocento Sans'
                })]
              })
            ], { width: 9360 })
          ]})
        ]
      })
    );
  }

  // ============= COMPLETED WORKS =============
  children.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Table({
      columnWidths: [9360],
      rows: [
        new TableRow({ children: [
          createCell('TRABALHOS EXECUTADOS | COMPLETED WORKS', { 
            bold: true, 
            shading: COLORS.cream, 
            alignment: AlignmentType.CENTER,
            width: 9360
          })
        ]})
      ]
    })
  );

  // Add each day's work
  diarios.forEach((d, idx) => {
    if (d.trabalhos_realizados) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ 
            text: `${idx + 1}. ${formatDatePT(d.data)} | ${formatDateEN(d.data)}`,
            bold: true,
            size: 24,
            font: 'Cormorant Garamond',
            color: COLORS.olive
          })]
        })
      );

      // Split work into bullet points
      const workItems = d.trabalhos_realizados.split('\n').filter(Boolean);
      workItems.forEach(item => {
        children.push(
          new Paragraph({
            spacing: { before: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: '• ', size: 22, font: 'Quattrocento Sans' }),
              new TextRun({ text: item.trim(), size: 22, font: 'Quattrocento Sans' })
            ]
          })
        );
      });
    }
  });

  // ============= PHOTOGRAPHIC RECORD =============
  if (photoBuffers.length > 0) {
    children.push(
      new Paragraph({ spacing: { before: 400 } }),
      new Table({
        columnWidths: [9360],
        rows: [
          new TableRow({ children: [
            createCell('REGISTO FOTOGRÁFICO | PHOTOGRAPHIC RECORD', { 
              bold: true, 
              shading: COLORS.cream, 
              alignment: AlignmentType.CENTER,
              width: 9360
            })
          ]})
        ]
      }),
      new Paragraph({ spacing: { after: 200 } })
    );

    // Add photos in pairs
    for (let i = 0; i < photoBuffers.length; i += 2) {
      const row = [];
      
      // First photo
      const photo1 = photoBuffers[i];
      row.push(
        createCell([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({
              type: 'jpg',
              data: photo1.buffer,
              transformation: { width: 180, height: 240 }
            })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [new TextRun({ 
              text: `Foto ${i + 1}: ${photo1.caption}`, 
              size: 18,
              font: 'Quattrocento Sans',
              color: COLORS.brown
            })]
          })
        ], { width: 4680 })
      );

      // Second photo (if exists)
      if (photoBuffers[i + 1]) {
        const photo2 = photoBuffers[i + 1];
        row.push(
          createCell([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({
                type: 'jpg',
                data: photo2.buffer,
                transformation: { width: 180, height: 240 }
              })]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100 },
              children: [new TextRun({ 
                text: `Foto ${i + 2}: ${photo2.caption}`, 
                size: 18,
                font: 'Quattrocento Sans',
                color: COLORS.brown
              })]
            })
          ], { width: 4680 })
        );
      } else {
        row.push(createCell('', { width: 4680 }));
      }

      children.push(
        new Table({
          columnWidths: [4680, 4680],
          rows: [new TableRow({ children: row })]
        }),
        new Paragraph({ spacing: { after: 100 } })
      );
    }
  }

  // ============= PROBLEMS (Internal version only) =============
  if (!isClientVersion) {
    const problems = diarios.filter(d => d.problemas).map(d => ({
      data: d.data,
      texto: d.problemas
    }));

    if (problems.length > 0) {
      children.push(
        new Paragraph({ spacing: { before: 400 } }),
        new Table({
          columnWidths: [9360],
          rows: [
            new TableRow({ children: [
              createCell('OBSERVAÇÕES IMPORTANTES | IMPORTANT REMARKS', { 
                bold: true, 
                shading: COLORS.cream, 
                alignment: AlignmentType.CENTER,
                width: 9360
              })
            ]})
          ]
        })
      );

      problems.forEach(p => {
        children.push(
          new Paragraph({
            spacing: { before: 200 },
            shading: { fill: 'FFF0F0', type: ShadingType.CLEAR },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CC8888' } },
            indent: { left: 200 },
            children: [
              new TextRun({ text: `${formatDateShort(p.data)}: `, bold: true, size: 22, font: 'Quattrocento Sans' }),
              new TextRun({ text: p.texto, size: 22, font: 'Quattrocento Sans' })
            ]
          })
        );
      });
    }
  }

  // ============= NEXT STEPS (Internal version only) =============
  if (!isClientVersion) {
    const nextSteps = diarios
      .filter(d => d.trabalhos_previstos_amanha)
      .slice(-1)[0];

    if (nextSteps) {
      children.push(
        new Paragraph({ spacing: { before: 400 } }),
        new Table({
          columnWidths: [9360],
          rows: [
            new TableRow({ children: [
              createCell('PRÓXIMOS PASSOS | NEXT STEPS', { 
                bold: true, 
                shading: COLORS.cream, 
                alignment: AlignmentType.CENTER,
                width: 9360
              })
            ]})
          ]
        }),
        new Paragraph({
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ 
            text: nextSteps.trabalhos_previstos_amanha, 
            size: 22,
            font: 'Quattrocento Sans'
          })]
        })
      );
    }
  }

  // ============= FOOTER =============
  children.push(
    new Paragraph({ spacing: { before: 600 } }),
    new Table({
      columnWidths: [9360],
      rows: [
        new TableRow({ children: [
          createCell([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Elaborado por | Prepared by:', size: 20, font: 'Quattrocento Sans', color: COLORS.brown }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'GAVINHO BUILD | Direção de Obra', bold: true, size: 22, font: 'Quattrocento Sans' }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Referência | Reference: ${reportRef}`, size: 20, font: 'Quattrocento Sans', color: COLORS.brown }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Data | Date: ${formatDatePT(reportDate)} | ${formatDateEN(reportDate)}`, size: 20, font: 'Quattrocento Sans', color: COLORS.brown }),
              ]
            })
          ], { shading: COLORS.cream, width: 9360 })
        ]})
      ]
    })
  );

  // Create document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Quattrocento Sans', size: 22 }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ 
              text: 'GAVINHO', 
              font: 'Cormorant Garamond',
              size: 24,
              color: COLORS.olive
            })]
          })]
        })
      },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node generate-report.js <data.json> [output.docx]');
  process.exit(1);
}

const dataFile = args[0];
const outputFile = args[1] || 'relatorio.docx';

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

generateReport(data)
  .then(buffer => {
    fs.writeFileSync(outputFile, buffer);
  })
  .catch(err => {
    console.error('Error generating report:', err);
    process.exit(1);
  });

module.exports = { generateReport };
