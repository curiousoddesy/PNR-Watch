import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SimplePNRForm } from './features/SimplePNRForm'
import { Button } from './ui/Button'
import { Toast } from './ui/Toast'
import { PNR } from '../types'

interface SmartPNRFormsDemoProps {
  className?: string
}

export const SmartPNRFormsDemo: React.FC<SmartPNRFormsDemoProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [submittedPNRs, setSubmittedPNRs] = useState<any[]>([])

  // Handle single PNR submission
  const handlePNRSubmit = async (data: any) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('PNR submitted:', data)
      setSubmittedPNRs(prev => [...prev, { ...data, id: Date.now() }])
      
      setToast({
        message: `PNR ${data.pnrNumber} added successfully!`,
        type: 'success'
      })
    } catch (error) {
      setToast({
        message: 'Failed to add PNR. Please try again.',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Smart PNR Entry & Management Forms
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
        >
          Experience intelligent form features including smart auto-completion, QR code scanning, 
          batch CSV import, predictive date suggestions, and automatic form recovery.
        </motion.p>
      </div>

      {/* Features Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-3">🧠</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Auto-Complete</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Intelligent suggestions based on your history and patterns
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-3">📱</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">QR Code Scanning</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scan QR codes from tickets for instant PNR entry
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Batch Import</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Import multiple PNRs from CSV files with validation
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-3xl mb-3">💾</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Auto-Save</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automatic form recovery and draft saving
          </p>
        </div>
      </motion.div>

      {/* Main Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <SimplePNRForm
          onSubmit={handlePNRSubmit}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Submitted PNRs Display */}
      {submittedPNRs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recently Added PNRs ({submittedPNRs.length})
          </h3>
          <div className="space-y-3">
            {submittedPNRs.slice(-5).map((pnr, index) => (
              <motion.div
                key={pnr.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {pnr.pnrNumber || 'N/A'}
                    </div>
                    {pnr.passengerName && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {pnr.passengerName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {pnr.trainNumber && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Train: {pnr.trainNumber}
                    </div>
                  )}
                  {pnr.dateOfJourney && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(pnr.dateOfJourney).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          
          {submittedPNRs.length > 5 && (
            <div className="mt-3 text-center">
              <Button variant="outline" size="sm">
                View All {submittedPNRs.length} PNRs
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Feature Demonstrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800"
      >
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          🎯 Try These Smart Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Smart Auto-Complete:</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>• Start typing a PNR number to see suggestions</li>
              <li>• Station names auto-complete with popular destinations</li>
              <li>• Train numbers suggest based on your history</li>
              <li>• Passenger names learn from previous entries</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Smart Date Picker:</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>• Quick suggestions for Today, Tomorrow, etc.</li>
              <li>• Smart weekend and holiday suggestions</li>
              <li>• Pattern-based recommendations</li>
              <li>• Keyboard navigation support</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">💡 Pro Tips:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Use Tab or → arrow to accept inline predictions</li>
            <li>• Forms auto-save every 2 seconds when you're typing</li>
            <li>• QR scanner works with most Indian railway tickets</li>
            <li>• CSV import supports up to 1000 PNRs at once</li>
            <li>• All data is stored locally for privacy</li>
          </ul>
        </div>
      </motion.div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </div>
  )
}