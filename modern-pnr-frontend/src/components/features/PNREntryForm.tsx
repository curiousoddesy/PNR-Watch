import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DatePicker from 'react-datepicker'
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns'
import { SmartInput } from '../ui/SmartInput'
import { PredictiveInput } from '../ui/PredictiveInput'
import { FormField, Select } from '../ui/Form'
import { Button } from '../ui/Button'
import { QRCodeScanner } from './QRCodeScanner'
import { BatchImport } from './BatchImport'
import { useIntelligentFeatures } from '../../hooks/useIntelligentFeatures'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

// Form validation schema
const pnrFormSchema = z.object({
  pnrNumber: z.string()
    .min(10, 'PNR must be 10 digits')
    .max(10, 'PNR must be 10 digits')
    .regex(/^\d{10}$/, 'PNR must contain only digits'),
  passengerName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  trainNumber: z.string()
    .regex(/^\d{4,5}$/, 'Train number must be 4-5 digits')
    .optional(),
  dateOfJourney: z.date()
    .min(subDays(new Date(), 120), 'Date cannot be more than 120 days in the past')
    .max(addDays(new Date(), 120), 'Date cannot be more than 120 days in the future')
    .optional(),
  fromStation: z.string().min(2, 'From station is required').optional(),
  toStation: z.string().min(2, 'To station is required').optional(),
  classType: z.enum(['SL', '3A', '2A', '1A', 'CC', 'EC', '2S', 'FC']).optional(),
  quota: z.enum(['GN', 'TQ', 'PT', 'LD', 'HP', 'DF', 'FT', 'PH']).optional()
})

type PNRFormData = z.infer<typeof pnrFormSchema>

interface PNREntryFormProps {
  onSubmit: (data: PNRFormData) => Promise<void>
  onBatchImport?: (pnrs: Partial<PNR>[]) => Promise<void>
  initialData?: Partial<PNRFormData>
  isLoading?: boolean
  className?: string
}

export const PNREntryForm: React.FC<PNREntryFormProps> = ({
  onSubmit,
  onBatchImport,
  initialData,
  isLoading = false,
  className
}) => {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showBatchImport, setShowBatchImport] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const { addToHistory, getErrorSuggestions } = useIntelligentFeatures()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<PNRFormData>({
    resolver: zodResolver(pnrFormSchema),
    defaultValues: {
      pnrNumber: '',
      passengerName: '',
      trainNumber: '',
      dateOfJourney: undefined,
      fromStation: '',
      toStation: '',
      classType: undefined,
      quota: undefined,
      ...initialData
    },
    mode: 'onChange'
  })

  // Watch form values for auto-save
  const watchedValues = watch()

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !isDirty) return

    const timeoutId = setTimeout(() => {
      const formData = getValues()
      if (formData.pnrNumber || formData.passengerName) {
        localStorage.setItem('pnr_form_draft', JSON.stringify({
          ...formData,
          dateOfJourney: formData.dateOfJourney?.toISOString(),
          savedAt: new Date().toISOString()
        }))
        setLastSaved(new Date())
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [watchedValues, autoSaveEnabled, isDirty, getValues])

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('pnr_form_draft')
    if (savedDraft && !initialData) {
      try {
        const draft = JSON.parse(savedDraft)
        const formData = {
          ...draft,
          dateOfJourney: draft.dateOfJourney ? new Date(draft.dateOfJourney) : undefined
        }
        reset(formData)
        setLastSaved(new Date(draft.savedAt))
      } catch (error) {
        console.warn('Failed to load saved draft:', error)
      }
    }
  }, [reset, initialData])

  // Smart date suggestions
  const getDateSuggestions = useCallback(() => {
    const today = new Date()
    const suggestions = [
      { label: 'Today', value: today, isToday: true },
      { label: 'Tomorrow', value: addDays(today, 1), isTomorrow: true },
      { label: 'Day after tomorrow', value: addDays(today, 2) },
      { label: 'Next week', value: addDays(today, 7) }
    ]
    return suggestions
  }, [])

  // Handle form submission
  const handleFormSubmit = async (data: PNRFormData) => {
    try {
      await onSubmit(data)
      
      // Add to search history
      addToHistory(data.pnrNumber, 'pnr', 1)
      if (data.fromStation) addToHistory(data.fromStation, 'station', 1)
      if (data.toStation) addToHistory(data.toStation, 'station', 1)
      if (data.trainNumber) addToHistory(data.trainNumber, 'train', 1)

      // Clear draft
      localStorage.removeItem('pnr_form_draft')
      setLastSaved(null)
      
      // Reset form
      reset()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Handle QR code scan
  const handleQRScan = useCallback((result: string) => {
    // Parse QR code result - assuming it contains PNR number
    const pnrMatch = result.match(/\d{10}/)
    if (pnrMatch) {
      setValue('pnrNumber', pnrMatch[0])
      setShowQRScanner(false)
    }
  }, [setValue])

  // Handle batch import
  const handleBatchImportComplete = useCallback((pnrs: Partial<PNR>[]) => {
    if (onBatchImport) {
      onBatchImport(pnrs)
      setShowBatchImport(false)
    }
  }, [onBatchImport])

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem('pnr_form_draft')
    setLastSaved(null)
    reset()
  }, [reset])

  // Format date for display
  const formatDateSuggestion = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMM dd, yyyy')
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add PNR for Tracking
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enter PNR details manually, scan QR code, or import multiple PNRs
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRScanner(true)}
            className="flex items-center space-x-2"
          >
            <span>📱</span>
            <span>Scan QR</span>
          </Button>
          
          {onBatchImport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBatchImport(true)}
              className="flex items-center space-x-2"
            >
              <span>📄</span>
              <span>Batch Import</span>
            </Button>
          )}
        </div>
      </div>

      {/* Auto-save status */}
      <AnimatePresence>
        {lastSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-sm text-green-700 dark:text-green-300">
                  Draft saved at {format(lastSaved, 'HH:mm')}
                </span>
              </div>
              <button
                onClick={clearDraft}
                className="text-xs text-green-600 dark:text-green-400 hover:underline"
              >
                Clear draft
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main form */}
      <motion.form
        ref={formRef}
        onSubmit={handleSubmit(handleFormSubmit)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
      >
        {/* PNR Number - Smart Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            PNR Number *
          </label>
          <Controller
            name="pnrNumber"
            control={control}
            render={({ field }) => (
              <SmartInput
                {...field}
                type="pnr"
                placeholder="Enter 10-digit PNR number"
                className="text-lg font-mono"
                enableHistory={true}
                enableSmartSuggestions={true}
                onSuggestionSelect={(suggestion) => {
                  field.onChange(suggestion.value)
                }}
              />
            )}
          />
          {errors.pnrNumber && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.pnrNumber.message}
            </p>
          )}
        </div>

        {/* Passenger Name - Predictive Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Passenger Name
          </label>
          <Controller
            name="passengerName"
            control={control}
            render={({ field }) => (
              <PredictiveInput
                {...field}
                type="passenger"
                placeholder="Enter passenger name"
                showInlinePrediction={true}
                enableLearning={true}
                onPredictionAccept={(prediction) => {
                  field.onChange(prediction)
                }}
              />
            )}
          />
          {errors.passengerName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.passengerName.message}
            </p>
          )}
        </div>

        {/* Train Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Train Number
          </label>
          <Controller
            name="trainNumber"
            control={control}
            render={({ field }) => (
              <SmartInput
                {...field}
                type="train"
                placeholder="Enter train number (e.g., 12345)"
                className="font-mono"
                enableHistory={true}
                onSuggestionSelect={(suggestion) => {
                  field.onChange(suggestion.value)
                }}
              />
            )}
          />
          {errors.trainNumber && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.trainNumber.message}
            </p>
          )}
        </div>

        {/* Date of Journey - Smart Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date of Journey
          </label>
          <div className="space-y-2">
            {/* Quick date suggestions */}
            <div className="flex flex-wrap gap-2">
              {getDateSuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setValue('dateOfJourney', suggestion.value)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full border transition-colors',
                    'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                    'border-gray-300 dark:border-gray-600',
                    'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
            
            <Controller
              name="dateOfJourney"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Select date of journey"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  minDate={subDays(new Date(), 120)}
                  maxDate={addDays(new Date(), 120)}
                  showPopperArrow={false}
                  popperClassName="z-50"
                />
              )}
            />
          </div>
          {errors.dateOfJourney && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.dateOfJourney.message}
            </p>
          )}
        </div>

        {/* Route - From and To Stations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Station
            </label>
            <Controller
              name="fromStation"
              control={control}
              render={({ field }) => (
                <SmartInput
                  {...field}
                  type="station"
                  placeholder="Enter departure station"
                  enableHistory={true}
                  onSuggestionSelect={(suggestion) => {
                    field.onChange(suggestion.value)
                  }}
                />
              )}
            />
            {errors.fromStation && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.fromStation.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Station
            </label>
            <Controller
              name="toStation"
              control={control}
              render={({ field }) => (
                <SmartInput
                  {...field}
                  type="station"
                  placeholder="Enter destination station"
                  enableHistory={true}
                  onSuggestionSelect={(suggestion) => {
                    field.onChange(suggestion.value)
                  }}
                />
              )}
            />
            {errors.toStation && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.toStation.message}
              </p>
            )}
          </div>
        </div>

        {/* Class and Quota */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Controller
              name="classType"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Class"
                  placeholder="Select class"
                  options={[
                    { value: 'SL', label: 'Sleeper (SL)' },
                    { value: '3A', label: 'AC 3 Tier (3A)' },
                    { value: '2A', label: 'AC 2 Tier (2A)' },
                    { value: '1A', label: 'AC First Class (1A)' },
                    { value: 'CC', label: 'Chair Car (CC)' },
                    { value: 'EC', label: 'Executive Chair Car (EC)' },
                    { value: '2S', label: 'Second Sitting (2S)' },
                    { value: 'FC', label: 'First Class (FC)' }
                  ]}
                />
              )}
            />
          </div>

          <div>
            <Controller
              name="quota"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Quota"
                  placeholder="Select quota"
                  options={[
                    { value: 'GN', label: 'General (GN)' },
                    { value: 'TQ', label: 'Tatkal (TQ)' },
                    { value: 'PT', label: 'Premium Tatkal (PT)' },
                    { value: 'LD', label: 'Ladies (LD)' },
                    { value: 'HP', label: 'Handicapped (HP)' },
                    { value: 'DF', label: 'Defence (DF)' },
                    { value: 'FT', label: 'Foreign Tourist (FT)' },
                    { value: 'PH', label: 'Parliament House (PH)' }
                  ]}
                />
              )}
            />
          </div>
        </div>

        {/* Auto-save toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoSave"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoSave" className="text-sm text-gray-700 dark:text-gray-300">
              Auto-save draft
            </label>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isLoading}
          >
            Clear Form
          </Button>
          
          <Button
            type="submit"
            disabled={!isValid || isLoading}
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

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <QRCodeScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Batch Import Modal */}
      <AnimatePresence>
        {showBatchImport && onBatchImport && (
          <BatchImport
            onImport={handleBatchImportComplete}
            onClose={() => setShowBatchImport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}