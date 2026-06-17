import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { slugify } from './storage.js'

export async function exportElementToImage(node, filename) {
  const canvas = await html2canvas(node, {
    backgroundColor: '#0b0907',
    scale: 2,
    useCORS: true,
    logging: false
  })
  await new Promise((resolve) => canvas.toBlob((b) => {
    const url = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(filename)}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    resolve()
  }, 'image/png'))
}

export async function exportElementToPDF(node, filename) {
  const canvas = await html2canvas(node, {
    backgroundColor: '#0b0907',
    scale: 2,
    useCORS: true,
    logging: false
  })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  let heightLeft = imgH
  let position = 0
  pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH)
  heightLeft -= pageH
  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH)
    heightLeft -= pageH
  }
  pdf.save(`${slugify(filename)}.pdf`)
}
