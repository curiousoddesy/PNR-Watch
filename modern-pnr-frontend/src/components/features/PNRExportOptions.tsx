import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface PNRExportOptionsProps {
  isOpen: boolean
  onClose: () => void
  pnr: PNR
  className?: string
}

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: string
  fileExtension: string
  mimeType: string
}

interface ExportOptions {
  includeTimeline: boolean
  includePassengers: boolean
  includeJourneyDetails: boolean
  includeStatusHistory: boolean
  includeQRCode: boolean
  format: 'detailed' | 'summary' | 'minimal'
}

export const PNRExportOptions: React.FC<PNRExportOptionsProps> = ({
  isOpen,
  onClose,
  pnr,
  className
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeTimeline: true,
    includePassengers: true,
    includeJourneyDetails: true,
    includeStatusHistory: false,
    includeQRCode: true,
    format: 'detailed'
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportFormats: ExportFormat[] = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional PDF report with all details',
      icon: 'pdf',
      fileExtension: 'pdf',
      mimeType: 'application/pdf'
    },
    {
      id: 'excel',
      name: 'Excel Spreadsheet',
      description: 'Structured data in Excel format',
      icon: 'excel',
      fileExtension: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      id: 'csv',
      name: 'CSV File',
      description: 'Comma-separated values for data analysis',
      icon: 'csv',
      fileExtension: 'csv',
      mimeType: 'text/csv'
    },
    {
      id: 'json',
      name: 'JSON Data',
      description: 'Raw data in JSON format',
      icon: 'json',
      fileExtension: 'json',
      mimeType: 'application/json'
    },
    {
      id: 'image',
      name: 'Image (PNG)',
      description: 'Visual snapshot of PNR details',
      icon: 'image',
      fileExtension: 'png',
      mimeType: 'image/png'
    }
  ]

  const getFormatIcon = (iconType: string) => {
    const icons = {
      pdf: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      excel: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      csv: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      ),
      json: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      ),
      image: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      )
    }
    return icons[iconType as keyof typeof icons] || icons.pdf
  }

  const handleExport = async () => {
    if (!selectedFormat) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Generate export data based on selected format and options
      const exportData = generateExportData(selectedFormat, exportOptions)
      
      // Create and download file
      await downloadFile(exportData, selectedFormat)
      
      setExportProgress(100)
      
      // Close modal after successful export
      setTimeout(() => {
        onClose()
        setIsExporting(false)
        setExportProgress(0)
      }, 1000)
      
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const generateExportData = (format: ExportFormat, options: ExportOptions) => {
    const baseData = {
      pnr: pnr.number,
      passengerName: pnr.passengerName,
      trainNumber: pnr.trainNumber,
      trainName: pnr.trainName,
      from: pnr.from,
      to: pnr.to,
      dateOfJourney: pnr.dateOfJourney,
      class: pnr.class,
      quota: pnr.quota,
      currentStatus: pnr.status.currentStatus,
      chartPrepared: pnr.status.chartPrepared,
      exportedAt: new Date().toISOString()
    }

    let exportData: any = { ...baseData }

    if (options.includePassengers) {
      exportData.passengers = pnr.status.passengers
    }

    if (options.includeJourneyDetails) {
      exportData.trainInfo = pnr.status.trainInfo
    }

    if (options.includeTimeline) {
      exportData.timeline = generateTimelineData()
    }

    if (options.includeStatusHistory) {
      exportData.statusHistory = generateStatusHistoryData()
    }

    return exportData
  }

  const generateTimelineData = () => {
    return [
      {
        timestamp: pnr.createdAt,
        event: 'PNR Created',
        status: 'Booking Confirmed'
      },
      {
        timestamp: pnr.status.lastUpdated,
        event: 'Status Updated',
        status: pnr.status.currentStatus
      }
    ]
  }

  const generateStatusHistoryData = () => {
    return pnr.status.passengers.map(passenger => ({
      passenger: passenger.name,
      bookingStatus: passenger.bookingStatus,
      currentStatus: passenger.currentStatus,
      seatNumber: passenger.seatNumber
    }))
  }

  const downloadFile = async (data: any, format: ExportFormat) => {
    let content: string | Blob
    let filename = `PNR_${pnr.number}_${new Date().toISOString().split('T')[0]}.${format.fileExtension}`

    switch (format.id) {
      case 'json':
        content = JSON.stringify(data, null, 2)
        break
      
      case 'csv':
        content = generateCSV(data)
        break
      
      case 'pdf':
        content = await generatePDF(data)
        break
      
      case 'excel':
        content = await generateExcel(data)
        break
      
      case 'image':
        content = await generateImage(data)
        break
      
      default:
        content = JSON.stringify(data, null, 2)
    }

    // Create download link
    const blob = new Blob([content], { type: format.mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateCSV = (data: any): string => {
    const headers = Object.keys(data).filter(key => typeof data[key] !== 'object')
    const values = headers.map(header => data[header])
    
    let csv = headers.join(',') + '\n'
    csv += values.join(',') + '\n'
    
    if (data.passengers) {
      csv += '\n\nPassengers:\n'
      csv += 'Name,Age,Gender,Current Status,Seat Number\n'
      data.passengers.forEach((passenger: any) => {
        csv += `${passenger.name},${passenger.age},${passenger.gender},${passenger.currentStatus},${passenger.seatNumber || ''}\n`
      })
    }
    
    return csv
  }

  const generatePDF = async (data: any): Promise<Blob> => {
    // Mock PDF generation - in real implementation, use libraries like jsPDF or PDFKit
    const pdfContent = `
      PNR Status Report
      
      PNR Number: ${data.pnr}
      Passenger: ${data.passengerName}
      Train: ${data.trainNumber} ${data.trainName}
      Route: ${data.from} → ${data.to}
      Date: ${data.dateOfJourney}
      Class: ${data.class}
      Status: ${data.currentStatus}
      
      Generated on: ${new Date().toLocaleString()}
    `
    
    return new Blob([pdfContent], { type: 'application/pdf' })
  }

  const generateExcel = async (data: any): Promise<Blob> => {
    // Mock Excel generation - in real implementation, use libraries like SheetJS
    const excelContent = JSON.stringify(data, null, 2)
    return new Blob([excelContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  const generateImage = async (data: any): Promise<Blob> => {
    // Mock image generation - in real implementation, use canvas or libraries like html2canvas
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 800, 600)
    
    ctx.fillStyle = '#000000'
    ctx.font = '24px Arial'
    ctx.fillText(`PNR: ${data.pnr}`, 50, 50)
    ctx.fillText(`${data.passengerName}`, 50, 100)
    ctx.fillText(`${data.trainNumber} ${data.trainName}`, 50, 150)
    ctx.fillText(`${data.from} → ${data.to}`, 50, 200)
    ctx.fillText(`Status: ${data.currentStatus}`, 50, 250)
    
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob!), 'image/png')
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" className={className}>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-6">
          Export PNR Details
        </h2>

        {!isExporting ? (
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                Choose Export Format
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportFormats.map((format) => (
                  <motion.div
                    key={format.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-200',
                        selectedFormat?.id === format.id
                          ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900 bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:shadow-md'
                      )}
                      onClick={() => setSelectedFormat(format)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            selectedFormat?.id === format.id
                              ? 'bg-primary-600 text-white'
                              : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
                          )}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {getFormatIcon(format.icon)}
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">
                              {format.name}
                            </h4>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                              {format.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                Export Options
              </h3>
              
              <Card className="p-4">
                <div className="space-y-4">
                  {/* Content Options */}
                  <div>
                    <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-3">
                      Include Content
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'includeTimeline', label: 'Status Timeline' },
                        { key: 'includePassengers', label: 'Passenger Details' },
                        { key: 'includeJourneyDetails', label: 'Journey Information' },
                        { key: 'includeStatusHistory', label: 'Status History' },
                        { key: 'includeQRCode', label: 'QR Code' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportOptions[key as keyof ExportOptions] as boolean}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              [key]: e.target.checked
                            }))}
                            className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-secondary-700 dark:text-secondary-300">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Format Options */}
                  <div>
                    <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-3">
                      Detail Level
                    </h4>
                    <div className="flex gap-2">
                      {[
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'summary', label: 'Summary' },
                        { value: 'detailed', label: 'Detailed' }
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setExportOptions(prev => ({ ...prev, format: value as any }))}
                          className={cn(
                            'px-3 py-1 text-sm rounded-md transition-colors',
                            exportOptions.format === value
                              ? 'bg-primary-600 text-white'
                              : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={!selectedFormat}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export {selectedFormat?.name}
              </Button>
            </div>
          </div>
        ) : (
          /* Export Progress */
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-secondary-200 dark:text-secondary-700"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    className="text-primary-600"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: exportProgress / 100 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      strokeDasharray: "175.929",
                      strokeDashoffset: 175.929 * (1 - exportProgress / 100)
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                    {exportProgress}%
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
                Exporting PNR Data
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400">
                Generating {selectedFormat?.name} file...
              </p>
            </div>

            <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
              <motion.div
                className="bg-primary-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${exportProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}