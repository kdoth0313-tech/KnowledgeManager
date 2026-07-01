import type { KnowledgeItem } from '@/types'

// Lazy-load heavy PDF deps only when user actually exports
async function loadPdfDeps() {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  return { jsPDF, html2canvas }
}

/**
 * Renders note HTML content into a hidden container and captures it
 * as a canvas image for PDF embedding.
 */
async function renderHTMLToCanvas(
  html: string,
  html2canvas: typeof import('html2canvas').default,
): Promise<HTMLCanvasElement | null> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '700px'
  container.style.padding = '20px'
  container.style.fontFamily =
    "'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif"
  container.style.fontSize = '14px'
  container.style.lineHeight = '1.7'
  container.style.color = '#333'
  container.style.background = '#fff'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    })
    return canvas
  } catch (err) {
    console.warn('html2canvas render failed:', err)
    return null
  } finally {
    document.body.removeChild(container)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function addCanvasToPdf(
  pdf: InstanceType<typeof import('jspdf').jsPDF>,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  marginX: number,
  marginY: number,
): void {
  const maxWidth = pageWidth - marginX * 2
  const imgWidth = maxWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let remainingHeight = imgHeight
  let sourceY = 0

  while (remainingHeight > 0) {
    const availableHeight = pageHeight - marginY * 2
    const sliceHeight = Math.min(remainingHeight, availableHeight)
    const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height

    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = sourceSliceHeight
    const ctx = sliceCanvas.getContext('2d')!
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sourceSliceHeight,
      0,
      0,
      canvas.width,
      sourceSliceHeight,
    )

    pdf.addImage(
      sliceCanvas.toDataURL('image/png'),
      'PNG',
      marginX,
      marginY,
      imgWidth,
      sliceHeight,
    )

    remainingHeight -= sliceHeight
    sourceY += sourceSliceHeight

    if (remainingHeight > 0) {
      pdf.addPage()
    }
  }
}

export function useExportPdf() {
  const pageWidth = 210 // A4 mm
  const pageHeight = 297
  const marginX = 15
  const marginY = 15

  async function exportNote(note: KnowledgeItem): Promise<void> {
    const { jsPDF, html2canvas } = await loadPdfDeps()
    const pdf = new jsPDF('p', 'mm', 'a4')

    // ── Title ──
    pdf.setFontSize(20)
    pdf.setTextColor(30, 30, 46)
    pdf.text(note.title || '未命名笔记', marginX, 25)

    // ── Metadata ──
    let y = 35
    pdf.setFontSize(10)
    pdf.setTextColor(102, 102, 102)

    if (note.summary) {
      pdf.text(`摘要：${note.summary}`, marginX, y, { maxWidth: pageWidth - marginX * 2 })
      y += 7
    }

    if (note.keywords && note.keywords.length > 0) {
      pdf.text(`关键词：${note.keywords.join('，')}`, marginX, y)
      y += 7
    }

    if (note.tags && note.tags.length > 0) {
      pdf.text(`标签：${note.tags.join('，')}`, marginX, y)
      y += 7
    }

    const dateStr = new Date(note.updatedAt).toLocaleString('zh-CN')
    pdf.setFontSize(9)
    pdf.setTextColor(153, 153, 153)
    pdf.text(`更新于：${dateStr}`, marginX, y)
    y += 3

    pdf.setDrawColor(224, 224, 224)
    pdf.line(marginX, y, pageWidth - marginX, y)
    y += 8

    // ── Content canvas ──
    const canvas = await renderHTMLToCanvas(note.content, html2canvas)

    if (canvas) {
      addCanvasToPdf(pdf, canvas, pageWidth, pageHeight, marginX, y)
    } else {
      // Fallback: plain text
      pdf.setFontSize(11)
      pdf.setTextColor(51, 51, 51)
      const textContent = note.content.replace(/<[^>]+>/g, '').trim()
      if (textContent) {
        const splitText = pdf.splitTextToSize(textContent, pageWidth - marginX * 2)
        pdf.text(splitText, marginX, y)
      }
    }

    const filename = `${note.title || '未命名笔记'}.pdf`
    pdf.save(filename)
  }

  async function exportNotes(notes: KnowledgeItem[]): Promise<void> {
    if (notes.length === 0) return

    const { jsPDF, html2canvas } = await loadPdfDeps()
    const pdf = new jsPDF('p', 'mm', 'a4')
    let firstPage = true

    for (const note of notes) {
      if (!firstPage) pdf.addPage()
      firstPage = false

      pdf.setFontSize(18)
      pdf.setTextColor(30, 30, 46)
      pdf.text(note.title || '未命名笔记', marginX, 25)

      let y = 33
      pdf.setFontSize(9)
      pdf.setTextColor(102, 102, 102)

      if (note.summary) {
        pdf.text(`摘要：${note.summary}`, marginX, y, { maxWidth: pageWidth - marginX * 2 })
        y += 6
      }
      if (note.keywords && note.keywords.length > 0) {
        pdf.text(`关键词：${note.keywords.join('，')}`, marginX, y)
        y += 6
      }
      if (note.tags && note.tags.length > 0) {
        pdf.text(`标签：${note.tags.join('，')}`, marginX, y)
        y += 6
      }

      pdf.setDrawColor(224, 224, 224)
      pdf.line(marginX, y + 1, pageWidth - marginX, y + 1)
      y += 6

      const canvas = await renderHTMLToCanvas(note.content, html2canvas)

      if (canvas) {
        addCanvasToPdf(pdf, canvas, pageWidth, pageHeight, marginX, y)
      } else {
        pdf.setFontSize(11)
        pdf.setTextColor(51, 51, 51)
        const textContent = note.content.replace(/<[^>]+>/g, '').trim()
        if (textContent) {
          const splitText = pdf.splitTextToSize(textContent, pageWidth - marginX * 2)
          const lineHeight = 6
          for (let i = 0; i < splitText.length; i++) {
            if (y + lineHeight > pageHeight - marginY) {
              pdf.addPage()
              y = marginY
            }
            pdf.text(splitText[i], marginX, y)
            y += lineHeight
          }
        }
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10)
    pdf.save(`notes-export-${dateStr}.pdf`)
  }

  return { exportNote, exportNotes }
}
