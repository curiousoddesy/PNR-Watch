import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { cn } from '../../utils/cn'
import { usePNRStore } from '../../stores/pnrStore'

interface PNRBulkActionsProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDelete: () => void
}

export const PNRBulkActions: React.FC<PNRBulkActionsProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  
  const { selectedPNRs, bulkUpdateStatus } = usePNRStore()

  const statusOptions = [
    { value: 'CNF', label: 'Confirmed', color: 'bg-green-500' },
    { value: 'RAC', label: 'RAC', color: 'bg-yellow-500' },
    { value: 'WL', label: 'Waiting List', color: 'bg-orange-500' },
    { value: 'CAN', label: 'Cancelled', color: 'bg-red-500' },
    { value: 'PQWL', label: 'PQWL', color: 'bg-blue-500' },
    { value: 'RLWL', label: 'RLWL', color: 'bg-purple-500' },
  ]

  const handleBulkStatusUpdate = () => {
    if (newStatus) {
      const selectedIds = Array.from(selectedPNRs)
      bulkUpdateStatus(selectedIds, newStatus)
      setShowStatusModal(false)
      setNewStatus('')
      onClearSelection()
    }
  }

  const handleBulkDelete = () => {
    onBulkDelete()
    setShowDeleteModal(false)
  }

  const isAllSelected = selectedCount === totalCount && totalCount > 0

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSelectAll}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isAllSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : selectedCount > 0
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-500'
                    )}
                  >
                    {isAllSelected ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : selectedCount > 0 ? (
                      <div className="w-2 h-2 bg-white rounded-sm" />
                    ) : null}
                  </button>
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {selectedCount} of {totalCount} selected
                  </span>
                </div>
                
                {selectedCount > 0 && (
                  <button
                    onClick={onClearSelection}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusModal(true)}
                  disabled={selectedCount === 0}
                  className="border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Update Status
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Export functionality would go here
                    console.log('Export selected PNRs:', Array.from(selectedPNRs))
                  }}
                  disabled={selectedCount === 0}
                  className="border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={selectedCount === 0}
                  className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        size="md"
      >
        <ModalHeader>
          <h3 className="text-lg font-semibold">Update Status</h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Update status for {selectedCount} selected PNR{selectedCount > 1 ? 's' : ''}
          </p>
        </ModalHeader>
        
        <ModalBody>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Select New Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setNewStatus(option.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors',
                    newStatus === option.value
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowStatusModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkStatusUpdate}
            disabled={!newStatus}
          >
            Update Status
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="md"
      >
        <ModalHeader>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Delete PNRs
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            This action cannot be undone.
          </p>
        </ModalHeader>
        
        <ModalBody>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-secondary-900 dark:text-secondary-100">
                Are you sure you want to delete {selectedCount} selected PNR{selectedCount > 1 ? 's' : ''}? 
                This will permanently remove all associated data including passenger information and status history.
              </p>
            </div>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
          >
            Delete {selectedCount} PNR{selectedCount > 1 ? 's' : ''}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}