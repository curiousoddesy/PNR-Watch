import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ShareModal } from '../ui/ShareModal'
import { PNRTimeline } from './PNRTimeline'
import { PNRJourneyMap } from './PNRJourneyMap'
import { PNRStatusChart } from './PNRStatusChart'
import { PNRExportOptions } from './PNRExportOptions'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'
import { usePNRStore } from '../../stores/pnrStore'

interface PNRDetailViewProps {
  pnr: PNR
  isOpen: boolean
  onClose: () => void
  className?: string
}

export const PNRDetailView: React.FC<PNRDetailViewProps> = ({
  pnr,
  isOpen,
  onClose,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'journey' | 'history' | 'passengers'>('timeline')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  
  const { updatePNRStatus } = usePNRStore()

  const tabs = [
    { id: 'timeline', label: 'Status Timeline', icon: 'timeline' },
    { id: 'journey', label: 'Journey Details', icon: 'map' },
    { id: 'history', label: 'Status History', icon: 'chart' },
    { id: 'passengers', label: 'Passengers', icon: 'users' }
  ]

  const getStatusColor = (status: string) => {
    const colors = {
      'CNF': 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200',
      'RAC': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200',
      'WL': 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200',
      'CAN': 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200',
      'PQWL': 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200',
      'RLWL': 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200',
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>PNR ${pnr.number} - Details</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .print-section { margin-bottom: 20px; }
                .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .print-table th { background-color: #f5f5f5; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="print-header">
                <h1>PNR Status Report</h1>
                <h2>PNR: ${pnr.number}</h2>
                <p>Generated on: ${new Date().toLocaleString()}</p>
              </div>
              ${printContent}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleRefresh = async () => {
    try {
      await updatePNRStatus(pnr.id)
    } catch (error) {
      console.error('Failed to refresh PNR status:', error)
    }
  }

  const getTabIcon = (iconType: string) => {
    const icons = {
      timeline: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      map: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      ),
      chart: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      users: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      )
    }
    return icons[iconType as keyof typeof icons] || icons.timeline
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={isFullscreen ? 'fullscreen' : 'xl'}
        className="max-h-[90vh] overflow-hidden"
      >
        <div className={cn('flex flex-col h-full', className)}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  PNR: {pnr.number}
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {pnr.passengerName} • {pnr.trainNumber} {pnr.trainName}
                </p>
              </div>
              <span className={cn(
                'px-3 py-1 text-sm font-medium rounded-full',
                getStatusColor(pnr.status.currentStatus)
              )}>
                {pnr.status.currentStatus}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportOptions(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isFullscreen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  )}
                </svg>
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="px-6 py-4 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-secondary-500 dark:text-secondary-400">Journey Date</span>
                <p className="font-medium text-secondary-900 dark:text-secondary-100">
                  {formatDate(pnr.dateOfJourney)}
                </p>
              </div>
              <div>
                <span className="text-secondary-500 dark:text-secondary-400">Route</span>
                <p className="font-medium text-secondary-900 dark:text-secondary-100">
                  {pnr.from} → {pnr.to}
                </p>
              </div>
              <div>
                <span className="text-secondary-500 dark:text-secondary-400">Class & Quota</span>
                <p className="font-medium text-secondary-900 dark:text-secondary-100">
                  {pnr.class} • {pnr.quota}
                </p>
              </div>
              <div>
                <span className="text-secondary-500 dark:text-secondary-400">Last Updated</span>
                <p className="font-medium text-secondary-900 dark:text-secondary-100">
                  {new Date(pnr.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-secondary-200 dark:border-secondary-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {getTabIcon(tab.icon)}
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto" ref={printRef}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                {activeTab === 'timeline' && <PNRTimeline pnr={pnr} />}
                {activeTab === 'journey' && <PNRJourneyMap pnr={pnr} />}
                {activeTab === 'history' && <PNRStatusChart pnr={pnr} />}
                {activeTab === 'passengers' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                      Passenger Details
                    </h3>
                    <div className="grid gap-4">
                      {pnr.status.passengers.map((passenger, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                                {passenger.name}
                              </h4>
                              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                                Age: {passenger.age} • Gender: {passenger.gender}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                getStatusColor(passenger.currentStatus)
                              )}>
                                {passenger.currentStatus}
                              </span>
                              {passenger.seatNumber && (
                                <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                                  Seat: {passenger.seatNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        pnr={pnr}
      />

      {/* Export Options Modal */}
      <PNRExportOptions
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        pnr={pnr}
      />
    </>
  )
}