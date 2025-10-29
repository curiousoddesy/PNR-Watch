import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SmartInput } from '../ui/SmartInput'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

interface SimplePNRFormProps {
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
  className?: string
}

export const SimplePNRForm: React.FC<SimplePNRFormProps> = ({
  onSubmit,
  isLoading = false,
  className
}) => {
  const [formData, setFormData] = useState({
    pnrNumber: '',
    passengerName: '',
    trainNumber: '',
    fromStation: '',
    toStation: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.pnrNumber) {
      await onSubmit(formData)
      setFormData({
        pnrNumber: '',
        passengerName: '',
        trainNumber: '',
        fromStation: '',
        toStation: ''
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add PNR for Tracking
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Enter PNR details with smart auto-completion
        </p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
      >
        {/* PNR Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            PNR Number *
          </label>
          <SmartInput
            type="pnr"
            value={formData.pnrNumber}
            onValueChange={(value) => handleInputChange('pnrNumber', value)}
            placeholder="Enter 10-digit PNR number"
            className="text-lg font-mono"
            enableHistory={true}
            enableSmartSuggestions={true}
          />
        </div>

        {/* Passenger Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Passenger Name
          </label>
          <SmartInput
            type="passenger"
            value={formData.passengerName}
            onValueChange={(value) => handleInputChange('passengerName', value)}
            placeholder="Enter passenger name"
            enableHistory={true}
          />
        </div>

        {/* Train Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Train Number
          </label>
          <SmartInput
            type="train"
            value={formData.trainNumber}
            onValueChange={(value) => handleInputChange('trainNumber', value)}
            placeholder="Enter train number (e.g., 12345)"
            className="font-mono"
            enableHistory={true}
          />
        </div>

        {/* Route */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Station
            </label>
            <SmartInput
              type="station"
              value={formData.fromStation}
              onValueChange={(value) => handleInputChange('fromStation', value)}
              placeholder="Enter departure station"
              enableHistory={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Station
            </label>
            <SmartInput
              type="station"
              value={formData.toStation}
              onValueChange={(value) => handleInputChange('toStation', value)}
              placeholder="Enter destination station"
              enableHistory={true}
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({
              pnrNumber: '',
              passengerName: '',
              trainNumber: '',
              fromStation: '',
              toStation: ''
            })}
            disabled={isLoading}
          >
            Clear Form
          </Button>
          
          <Button
            type="submit"
            disabled={!formData.pnrNumber || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding...</span>
              </div>
            ) : (
              'Add PNR'
            )}
          </Button>
        </div>
      </motion.form>
    </div>
  )
}