// Share modal component for fallback sharing

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shareService, ShareData } from '../../services/shareService'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  data?: ShareData
  pnr?: PNR
  className?: string
}

export function ShareModal({ isOpen, onClose, data, pnr, className }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  // Generate share data from PNR if provided
  const shareData: ShareData = pnr ? {
    title: `PNR Status: ${pnr.number}`,
    text: `${pnr.passengerName} - ${pnr.trainNumber} ${pnr.trainName}\n${pnr.from} → ${pnr.to}\nStatus: ${pnr.status.currentStatus}\nDate: ${new Date(pnr.dateOfJourney).toLocaleDateString()}`,
    url: window.location.href
  } : (data || {})

  const handleCopyLink = async () => {
    const text = shareData.url || `${shareData.title || ''}\n${shareData.text || ''}`.trim()
    const success = await shareService.copyToClipboard(text)
    
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'whatsapp' | 'telegram') => {
    shareService.shareToSocial(platform, shareData)
    onClose()
  }

  const shareText = `${shareData.title || ''}\n${shareData.text || ''}`.trim()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Share
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-6 h-6"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-6 border-b bg-gray-50">
              <div className="space-y-2">
                {shareData.title && (
                  <h3 className="font-medium text-gray-900 line-clamp-2">
                    {shareData.title}
                  </h3>
                )}
                {shareData.text && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {shareData.text}
                  </p>
                )}
                {shareData.url && (
                  <p className="text-xs text-blue-600 truncate">
                    {shareData.url}
                  </p>
                )}
              </div>
            </div>

            {/* Share Options */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Social Media Platforms */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Share to social media
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      onClick={() => handleSocialShare('whatsapp')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 text-white"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.106" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleSocialShare('twitter')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 text-white"
                        >
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">Twitter</span>
                    </button>

                    <button
                      onClick={() => handleSocialShare('facebook')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 text-white"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">Facebook</span>
                    </button>

                    <button
                      onClick={() => handleSocialShare('telegram')}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 text-white"
                        >
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-600">Telegram</span>
                    </button>
                  </div>
                </div>

                {/* Copy Link */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Copy link
                  </h4>
                  <button
                    onClick={handleCopyLink}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                      copied
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        copied ? 'bg-green-100' : 'bg-gray-200'
                      )}>
                        {copied ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-4 h-4"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-4 h-4"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {copied ? 'Copied!' : 'Copy link'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Global share modal manager
export function ShareModalManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [shareData, setShareData] = useState<ShareData>({})

  useEffect(() => {
    const handleShowModal = (event: CustomEvent) => {
      setShareData(event.detail)
      setIsOpen(true)
    }

    window.addEventListener('show-share-modal', handleShowModal as EventListener)
    
    return () => {
      window.removeEventListener('show-share-modal', handleShowModal as EventListener)
    }
  }, [])

  return (
    <ShareModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      data={shareData}
    />
  )
}

// Share button component
export function ShareButton({
  data,
  children = 'Share',
  className,
  variant = 'primary',
  size = 'md'
}: {
  data: ShareData
  children?: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    try {
      await shareService.share(data, {
        fallbackMethod: 'modal',
        showSuccessMessage: true,
      })
    } finally {
      setIsSharing(false)
    }
  }

  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg'
  }
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
    >
      {isSharing ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-full h-full"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </motion.div>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
      <span>{children}</span>
    </button>
  )
}