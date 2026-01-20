import { TestCase } from '../schemas'
import * as XLSX from 'xlsx'
// @ts-ignore - PDFKit types are declared in types.d.ts
import PDFDocument from 'pdfkit'

/**
 * Convert test cases to CSV format
 */
export function convertToCSV(testCases: TestCase[]): string {
  if (testCases.length === 0) {
    return ''
  }

  // CSV Header
  const headers = ['ID', 'Title', 'Category', 'Type', 'Steps', 'Test Data', 'Expected Result']
  
  // CSV Rows
  const rows = testCases.map(testCase => [
    testCase.id,
    `"${testCase.title.replace(/"/g, '""')}"`, // Escape quotes
    testCase.category,
    testCase.type,
    `"${testCase.steps.join('\n').replace(/"/g, '""')}"`, // Join steps with newline
    `"${(testCase.testData || '').replace(/"/g, '""')}"`,
    `"${testCase.expectedResult.replace(/"/g, '""')}"`
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Convert test cases to Excel format
 */
export function convertToExcel(testCases: TestCase[]): Buffer {
  const worksheetData = testCases.map(testCase => ({
    'ID': testCase.id,
    'Title': testCase.title,
    'Category': testCase.category,
    'Type': testCase.type,
    'Steps': testCase.steps.join('\n'),
    'Test Data': testCase.testData || '',
    'Expected Result': testCase.expectedResult
  }))

  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, // ID
    { wch: 30 }, // Title
    { wch: 15 }, // Category
    { wch: 15 }, // Type
    { wch: 40 }, // Steps
    { wch: 30 }, // Test Data
    { wch: 40 }  // Expected Result
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases')

  // Write to buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
  return buffer as Buffer
}

/**
 * Convert test cases to PDF format with table layout
 */
export function convertToPDF(testCases: TestCase[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 30
      })

      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(pdfBuffer)
      })

      doc.on('error', reject)

      // Page info
      let currentPage = 1
      const pageMargin = 30
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height

      // Calculate statistics
      const stats = calculateTestStats(testCases)

      // Title Page
      drawTitlePage(doc, testCases, stats, pageMargin, pageWidth)
      
      // Add page break before table
      doc.addPage()
      currentPage++

      // Draw table header
      const columnWidths = [30, 70, 50, 60, 90, 80, 80]
      const rowHeight = 32
      const columns = ['ID', 'Title', 'Category', 'Type', 'Steps', 'Test Data', 'Expected Result']
      // Define column alignment: 0=left, 1=center
      const columnAlignments = [1, 0, 0, 1, 0, 0, 0] // ID and Type centered

      // Draw header row
      drawTableHeader(doc, columns, columnWidths, pageMargin, rowHeight, columnAlignments)
      doc.moveDown(0.5)

      // Draw data rows
      let yPosition = doc.y
      const footerHeight = 30
      const minYForNewPage = pageHeight - pageMargin - footerHeight - 50

      testCases.forEach((testCase, index) => {
        const stepsText = testCase.steps.join('\n')
        const testDataText = testCase.testData || '-'

        const rowData = [
          testCase.id,
          testCase.title,
          testCase.category,
          testCase.type,
          stepsText,
          testDataText,
          testCase.expectedResult
        ]

        // Check if we need a new page
        const estimatedRowHeight = calculateRowHeight(rowData, columnWidths, doc)
        if (yPosition + estimatedRowHeight > minYForNewPage) {
          // Add footer to current page
          addPageFooter(doc, currentPage, stats, pageMargin, pageWidth, pageHeight)
          
          // Add new page
          doc.addPage()
          currentPage++
          
          // Draw header on new page
          yPosition = pageMargin + 20
          drawTableHeader(doc, columns, columnWidths, pageMargin, rowHeight, columnAlignments)
          yPosition = doc.y + 10
        }

        // Draw row with alternating color and type highlighting
        yPosition = drawTableRowWithTypeHighlight(doc, rowData, columnWidths, pageMargin, yPosition, index % 2 === 0, columnAlignments)
      })

      // Add footer to last page
      addPageFooter(doc, currentPage, stats, pageMargin, pageWidth, pageHeight)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Helper function to calculate test case statistics
 */
function calculateTestStats(testCases: TestCase[]): any {
  const stats = {
    total: testCases.length,
    bySanity: 0,
    byRegression: 0,
    byPerformance: 0,
    bySecurity: 0,
    byPositive: 0,
    byNegative: 0,
    byEdge: 0
  }

  testCases.forEach(tc => {
    // Count by type
    if (tc.type === 'Sanity') stats.bySanity++
    else if (tc.type === 'Regression') stats.byRegression++
    else if (tc.type === 'Performance') stats.byPerformance++
    else if (tc.type === 'Security') stats.bySecurity++

    // Count by category
    if (tc.category === 'Positive') stats.byPositive++
    else if (tc.category === 'Negative') stats.byNegative++
    else if (tc.category === 'Edge') stats.byEdge++
  })

  return stats
}

/**
 * Helper function to draw professional title page
 */
function drawTitlePage(doc: any, testCases: TestCase[], stats: any, pageMargin: number, pageWidth: number): void {
  // Main title
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#2C3E50')
  doc.text('Test Cases Report', { align: 'center' })
  doc.moveDown(0.5)

  // Decorative line
  doc.moveTo(pageMargin + 50, doc.y)
  doc.lineTo(pageWidth - pageMargin - 50, doc.y)
  doc.strokeColor('#3498DB')
  doc.lineWidth(2)
  doc.stroke()
  doc.moveDown(1.5)

  // Report info section
  doc.fontSize(11).font('Helvetica').fillColor('#2C3E50')
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, { align: 'center' })
  doc.moveDown(2)

  // Additional info
  doc.fontSize(10).font('Helvetica').fillColor('#888888')
  doc.text('This document contains detailed test case specifications and requirements.', { align: 'left' })
  doc.text('Each test case includes ID, title, category, type, steps, test data, and expected results.', { align: 'left' })
}

/**
 * Helper function to add enhanced page footer with statistics
 */
function addPageFooter(doc: any, pageNumber: number, stats: any, pageMargin: number, pageWidth: number, pageHeight: number): void {
  const footerY = pageHeight - pageMargin - 15
  
  doc.fontSize(8).font('Helvetica').fillColor('#888888')
  
  // Left side: Page number
  doc.text(`Page ${pageNumber} of Test Cases`, pageMargin, footerY, {
    width: pageWidth / 2 - pageMargin,
    align: 'left'
  })
  
  // Right side: Date and time
  const timestamp = new Date().toLocaleString()
  doc.text(timestamp, pageWidth / 2, footerY, {
    width: pageWidth / 2 - pageMargin,
    align: 'right'
  })
  
  // Separator line
  doc.moveTo(pageMargin, footerY - 10)
  doc.lineTo(pageWidth - pageMargin, footerY - 10)
  doc.strokeColor('#DDDDDD')
  doc.lineWidth(0.5)
  doc.stroke()
}

/**
 * Helper function to draw table row with type highlighting
 */
function drawTableRowWithTypeHighlight(doc: any, rowData: string[], columnWidths: number[], startX: number, yPos: number, isAlternate: boolean, columnAlignments: number[]): number {
  const pageWidth = doc.page.width
  const pageMargin = 30
  const endX = pageWidth - pageMargin
  const rowHeight = calculateRowHeight(rowData, columnWidths, doc)

  // Draw row background (alternating colors)
  const bgColor = isAlternate ? '#F8F9FA' : '#FFFFFF'
  doc.rect(startX, yPos, endX - startX, rowHeight).fill(bgColor)

  // Draw row text
  let xPosition = startX
  doc.fontSize(8.5).font('Helvetica').fillColor('#000000')

  rowData.forEach((cellData, index) => {
    const cellWidth = columnWidths[index]
    const cellX = xPosition + 5
    const alignment = columnAlignments[index] === 1 ? 'center' : 'left'
    
    // Sanitize cell data
    const sanitizedData = sanitizeText(cellData)
    
    // Special highlighting for Type column (index 3)
    if (index === 3) {
      // Draw type badge background
      const typeColor = getTypeColor(sanitizedData)
      const badgeBg = typeColor.bg
      doc.rect(cellX - 2, yPos + 5, cellWidth - 10 + 4, 14).fill(badgeBg)
      
      // Draw type text with appropriate color
      doc.font('Helvetica-Bold').fillColor(typeColor.text)
      doc.fontSize(7.5)
      doc.text(sanitizedData, cellX, yPos + 6, {
        width: cellWidth - 10,
        height: rowHeight - 10,
        align: 'center',
        valign: 'top'
      })
      doc.fontSize(8.5).fillColor('#000000').font('Helvetica')
    } else {
      // Draw normal cell text
      doc.text(sanitizedData, cellX, yPos + 5, {
        width: cellWidth - 10,
        height: rowHeight - 10,
        align: alignment,
        valign: 'top'
      })
    }

    // Draw vertical separator
    if (index < rowData.length - 1) {
      doc.moveTo(xPosition + cellWidth, yPos)
      doc.lineTo(xPosition + cellWidth, yPos + rowHeight)
      doc.strokeColor('#DDDDDD')
      doc.lineWidth(0.5)
      doc.stroke()
    }

    xPosition += cellWidth
  })

  // Draw outer borders
  doc.strokeColor('#000000')
  doc.lineWidth(1)
  doc.rect(startX, yPos, endX - startX, rowHeight).stroke()
  
  return yPos + rowHeight
}

/**
 * Helper function to get type-specific colors for badges
 */
function getTypeColor(typeValue: string): any {
  const colors: any = {
    'Sanity': { bg: '#D5F4E6', text: '#186A3B' },      // Green
    'Regression': { bg: '#D6EAF8', text: '#1B4965' },   // Blue
    'Performance': { bg: '#FDEBD0', text: '#7D3C0A' },  // Orange
    'Security': { bg: '#FADBD8', text: '#78281F' }      // Red
  }
  
  return colors[typeValue] || { bg: '#ECECEC', text: '#333333' }
}

/**
 * Helper function to draw table header
 */
function drawTableHeader(doc: any, columns: string[], columnWidths: number[], startX: number, rowHeight: number, columnAlignments: number[]): void {
  const pageWidth = doc.page.width
  const pageMargin = 30
  const endX = pageWidth - pageMargin
  const headerY = doc.y

  // Draw header borders first
  doc.strokeColor('#000000')
  doc.lineWidth(1.5)
  doc.rect(startX, headerY, endX - startX, rowHeight).stroke()

  // Draw header background - light gray instead of dark
  doc.rect(startX, headerY, endX - startX, rowHeight).fill('#E8E8E8')

  // Draw header text - Black on light background for clarity
  let xPosition = startX
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')

  columns.forEach((col, index) => {
    const cellWidth = columnWidths[index]
    const cellX = xPosition + 5
    const cellY = headerY + 4
    const alignment = columnAlignments[index] === 1 ? 'center' : 'left'
    
    // Draw column text clearly
    doc.text(col, cellX, cellY, {
      width: cellWidth - 10,
      align: alignment
    })

    // Draw vertical separator line
    if (index < columns.length - 1) {
      doc.moveTo(xPosition + cellWidth, headerY)
      doc.lineTo(xPosition + cellWidth, headerY + rowHeight)
      doc.strokeColor('#CCCCCC')
      doc.lineWidth(0.5)
      doc.stroke()
    }

    xPosition += cellWidth
  })

  doc.y = headerY + rowHeight
}

/**
 * Helper function to draw table row
 */
function drawTableRow(doc: any, rowData: string[], columnWidths: number[], startX: number, yPos: number, isAlternate: boolean, columnAlignments: number[]): number {
  const pageWidth = doc.page.width
  const pageMargin = 30
  const endX = pageWidth - pageMargin
  const rowHeight = calculateRowHeight(rowData, columnWidths, doc)

  // Draw row background (alternating colors)
  const bgColor = isAlternate ? '#F8F9FA' : '#FFFFFF'
  doc.rect(startX, yPos, endX - startX, rowHeight).fill(bgColor)

  // Draw row text
  let xPosition = startX
  doc.fontSize(8.5).font('Helvetica').fillColor('#000000')

  rowData.forEach((cellData, index) => {
    const cellWidth = columnWidths[index]
    const cellX = xPosition + 5
    const alignment = columnAlignments[index] === 1 ? 'center' : 'left'
    
    // Sanitize cell data - escape special characters and limit length
    const sanitizedData = sanitizeText(cellData)
    
    // Draw cell text with wrapping and proper alignment
    doc.text(sanitizedData, cellX, yPos + 5, {
      width: cellWidth - 10,
      height: rowHeight - 10,
      align: alignment,
      valign: 'top'
    })

    // Draw vertical separator
    if (index < rowData.length - 1) {
      doc.moveTo(xPosition + cellWidth, yPos)
      doc.lineTo(xPosition + cellWidth, yPos + rowHeight)
      doc.strokeColor('#DDDDDD')
      doc.lineWidth(0.5)
      doc.stroke()
    }

    xPosition += cellWidth
  })

  // Draw outer borders
  doc.strokeColor('#000000')
  doc.lineWidth(1)
  doc.rect(startX, yPos, endX - startX, rowHeight).stroke()
  
  return yPos + rowHeight
}

/**
 * Helper function to sanitize and format text for PDF display
 */
function sanitizeText(text: string): string {
  if (!text) return '-'
  
  // Remove problematic characters
  let sanitized = text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .trim()
  
  return sanitized || '-'
}

/**
 * Helper function to calculate row height based on content
 */
function calculateRowHeight(rowData: string[], columnWidths: number[], doc: any): number {
  let maxHeight = 25
  const fontSize = 8.5
  const charWidth = fontSize * 0.45 // Approximate character width for Helvetica

  rowData.forEach((cellData, index) => {
    if (!cellData) return
    
    const sanitized = sanitizeText(cellData)
    const cellWidth = columnWidths[index] - 10
    
    // Calculate number of lines needed based on text length and cell width
    const estimatedLineCount = Math.max(
      1,
      Math.ceil((sanitized.length * charWidth) / cellWidth)
    )
    
    // Height = (number of lines * line height) + padding
    const cellHeight = Math.max(estimatedLineCount * 11 + 8, 25)
    maxHeight = Math.max(maxHeight, cellHeight)
  })

  return Math.min(maxHeight, 120) // Cap at 120 pixels for very long content
}
