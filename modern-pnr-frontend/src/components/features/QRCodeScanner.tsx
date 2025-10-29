import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeResult } from 'html5-qrcode'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

interface QRCodeScannerProps {
  onScan: (result: string) => void
  onClose: () => void
  className?: string
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScan,
  onClose,
  className
}) => {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  // Initialize scanner
  useEffect(() => {
    if (!elementRef.current) return

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false // verbose
    )

    const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
      console.log('QR Code scanned:', decodedText)
      setScanResult(decodedText)
      setIsScanning(false)
      
      // Stop scanner
      scanner.clear().catch(console.error)
      
      // Call parent handler
      onScan(decodedText)
    }

    const onScanFailure = (error: string) => {
      // Handle scan failure - this is called frequently, so we don't log it
      // console.warn('QR scan failed:', error)
    }

    // Check camera permission
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then(() => {
        setHasPermission(true)
        setIsScanning(true)
        scanner.render(onScanSuccess, onScanFailure)
        scannerRef.current = scanner
      })
      .catch((err) => {
        console.error('Camera permission denied:', err)
        setHasPermission(false)
        setError('Camera access is required to scan QR codes. Please allow camera access and try again.')
      })

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [onScan])

  // Handle manual input fallback
  const [manualInput, setManualInput] = useState('')
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim())
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Scan QR Code"
      className="max-w-md"
    >
      <div className={cn('space-y-4', className)}>
        {/* Scanner area */}
        <div className="relative">
          {hasPermission === null && (
            <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Requesting camera access...
                </p>
              </div>
            </div>
          )}

          {hasPermission === false && (
            <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-center p-4">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Camera access is required to scan QR codes
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {hasPermission === true && (
            <div className="relative">
              <div
                id="qr-reader"
                ref={elementRef}
                className="w-full"
              />
              
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg"
                >
                  <div className="text-center text-white">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Scanning for QR code...</p>
                  </div>
                </motion.div>
              )}

              {scanResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-90 rounded-lg"
                >
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2">✓</div>
                    <p className="text-sm font-medium">QR Code Scanned!</p>
                    <p className="text-xs mt-1 opacity-80">
                      {scanResult.length > 20 ? `${scanResult.substring(0, 20)}...` : scanResult}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Position the QR code within the frame to scan automatically
          </p>
        </div>

        {/* Manual input fallback */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Or enter manually:
          </p>
          <div className="flex space-x-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter PNR or ticket details"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit()
                }
              }}
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              size="sm"
            >
              Use
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            Scanning Tips:
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Ensure good lighting</li>
            <li>• Hold the device steady</li>
            <li>• Keep the QR code within the frame</li>
            <li>• Clean your camera lens if needed</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}