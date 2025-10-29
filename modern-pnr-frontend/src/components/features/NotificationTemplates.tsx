import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { NotificationTemplate } from '../../types'
import { cn } from '../../utils/cn'

interface NotificationTemplatesProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const NotificationTemplates: React.FC<NotificationTemplatesProps> = ({
  isOpen,
  onClose,
  className
}) => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
        className
      )}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Notification Templates
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => setEditingTemplate(template)}
                onDelete={() => {
                  setTemplates(templates.filter(t => t.id !== template.id))
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface TemplateCardProps {
  template: NotificationTemplate
  onEdit: () => void
  onDelete: () => void
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onEdit, onDelete }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
      <div className="flex items-center space-x-1">
        <button onClick={onEdit} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
          <Edit className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded">
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.title}</p>
    <p className="text-xs text-gray-500 dark:text-gray-500">{template.message}</p>
  </div>
)

export default NotificationTemplates