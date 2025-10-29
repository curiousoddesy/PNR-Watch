import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface BatchImportProps {
  onImport: (pnrs: Partial<PNR>[]) => void
  onClose: () => void
  className?: string
}

interface ImportedRow {
  id: string
  pnrNumber?: string
  passengerName?: string
  trainNumber?: string
  dateOfJourney?: string
  fromStation?: string
  toStation?: string
  classType?: string
  quota?: string
  isValid: boolean
  errors: string[]
}

export const BatchImport: React.FC<BatchImportProps> = ({
  onImport,
  onClose,
  className
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [importedData, setImportedData] = useState<ImportedRow[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [dragActive, setDragActive] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sample CSV template
  const sampleData = `PNR Number,Passenger Name,Train Number,Date of Journey,From Station,To Station,Class,Quota
1234567890,John Doe,12345,2024-01-15,New Delhi,Mumbai Central,3A,GN
9876543210,Jane Smith,54321,2024-01-16,Chennai Central,Bangalore,2A,TQ`

  // Validate imported row
  const validateRow = (row: any, index: number): ImportedRow => {
    const errors: string[] = []
    const pnrNumber = row['PNR Number'] || row['pnrNumber'] || row['pnr'] || ''
    const passengerName = row['Passenger Name'] || row['passengerName'] || row['name'] || ''
    const trainNumber = row['Train Number'] || row['trainNumber'] || row['train'] || ''
    const dateOfJourney = row['Date of Journey'] || row['dateOfJourney'] || row['date'] || ''
    const fromStation = row['From Station'] || row['fromStation'] || row['from'] || ''
    const toStation = row['To Station'] || row['toStation'] || row['to'] || ''
    const classType = row['Class'] || row['classType'] || row['class'] || ''
    const quota = row['Quota'] || row['quota'] || ''

    // Validate PNR number
    if (!pnrNumber) {
      errors.push('PNR Number is required')
    } else if (!/^\d{10}$/.test(pnrNumber)) {
      errors.push('PNR Number must be 10 digits')
    }

    // Validate train number
    if (trainNumber && !/^\d{4,5}$/.test(trainNumber)) {
      errors.push('Train Number must be 4-5 digits')
    }

    // Validate date
    if (dateOfJourney) {
      const date = new Date(dateOfJourney)
      if (isNaN(date.getTime())) {
        errors.push('Invalid date format')
      }
    }

    // Validate class
    const validClasses = ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S', 'FC']
    if (classType && !validClasses.includes(classType.toUpperCase())) {
      errors.push('Invalid class type')
    }

    // Validate quota
    const validQuotas = ['GN', 'TQ', 'PT', 'LD', 'HP', 'DF', 'FT', 'PH']
    if (quota && !validQuotas.includes(quota.toUpperCase())) {
      errors.push('Invalid quota type')
    }

    return {
      id: `row_${index}`,
      pnrNumber,
      passengerName,
      trainNumber,
      dateOfJourney,
      fromStation,
      toStation,
      classType: classType.toUpperCase(),
      quota: quota.toUpperCase(),
      isValid: errors.length === 0,
      errors
    }
  }

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      alert('Please upload a CSV or Excel file')
      return
    }

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validatedData = results.data.map((row, index) => validateRow(row, index))
          setImportedData(validatedData)
          setSelectedRows(new Set(validatedData.filter(row => row.isValid).map(row => row.id)))
          setStep('preview')
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          alert('Error parsing CSV file. Please check the format.')
        }
      })
    } else {
      // For Excel files, we'll show a message to convert to CSV
      alert('Excel files are not directly supported. Please save as CSV and try again.')
    }
  }, [])

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }, [handleFileUpload])

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  // Handle row selection
  const handleRowSelect = (rowId: string, selected: boolean) => {
    const newSelection = new Set(selectedRows)
    if (selected) {
      newSelection.add(rowId)
    } else {
      newSelection.delete(rowId)
    }
    setSelectedRows(newSelection)
  }

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(importedData.filter(row => row.isValid).map(row => row.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  // Handle import
  const handleImport = async () => {
    setStep('importing')
    setImportProgress(0)

    const selectedData = importedData.filter(row => selectedRows.has(row.id))
    const pnrData: Partial<PNR>[] = selectedData.map(row => ({
      number: row.pnrNumber,
      passengerName: row.passengerName,
      trainNumber: row.trainNumber,
      dateOfJourney: row.dateOfJourney,
      from: row.fromStation,
      to: row.toStation,
      class: row.classType,
      quota: row.quota
    }))

    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    onImport(pnrData)
  }

  // Download sample template
  const downloadTemplate = () => {
    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pnr_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Table columns for preview
  const columns = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={selectedRows.size === importedData.filter(row => row.isValid).length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      render: (row: ImportedRow) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.id)}
          onChange={(e) => handleRowSelect(row.id, e.target.checked)}
          disabled={!row.isValid}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (row: ImportedRow) => (
        <div className="flex items-center space-x-2">
          {row.isValid ? (
            <span className="text-green-600 dark:text-green-400">✓</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">✗</span>
          )}
        </div>
      )
    },
    { key: 'pnrNumber', title: 'PNR Number' },
    { key: 'passengerName', title: 'Passenger Name' },
    { key: 'trainNumber', title: 'Train Number' },
    { key: 'dateOfJourney', title: 'Date' },
    { key: 'fromStation', title: 'From' },
    { key: 'toStation', title: 'To' },
    { key: 'classType', title: 'Class' },
    { key: 'quota', title: 'Quota' },
    {
      key: 'errors',
      title: 'Errors',
      render: (row: ImportedRow) => (
        row.errors.length > 0 ? (
          <div className="text-xs text-red-600 dark:text-red-400">
            {row.errors.join(', ')}
          </div>
        ) : null
      )
    }
  ]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Batch Import PNRs"
      className="max-w-6xl"
    >
      <div className={cn('space-y-6', className)}>
        {step === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Upload area */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Drop your CSV file here
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    or click to browse files
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Template download */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 dark:text-blue-400 text-xl">💡</div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    Need a template?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Download our CSV template with the correct column headers and sample data.
                  </p>
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* Format requirements */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                File Format Requirements:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• CSV format with comma-separated values</li>
                <li>• First row should contain column headers</li>
                <li>• PNR Number column is required (10 digits)</li>
                <li>• Date format: YYYY-MM-DD or MM/DD/YYYY</li>
                <li>• Maximum 1000 rows per import</li>
              </ul>
            </div>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importedData.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Rows
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importedData.filter(row => row.isValid).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Valid Rows
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedRows.size}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Selected
                  </div>
                </div>
              </div>
            </div>

            {/* Data preview */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <DataTable
                data={importedData}
                columns={columns}
                className="max-h-96 overflow-y-auto"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
              >
                Back to Upload
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedRows.size === 0}
              >
                Import {selectedRows.size} PNRs
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'importing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-4xl">⏳</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Importing PNRs...
            </h3>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${importProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {importProgress}% complete
            </p>
          </motion.div>
        )}
      </div>
    </Modal>
  )
}