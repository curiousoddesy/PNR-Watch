import React, { useEffect, useRef } from 'react'

interface QRScannerProps {
  onScan: (text: string) => void
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
  const containerId = 'qr-reader'
  const scannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let scanner: any = null
    let cancelled = false

    ;(async () => {
      try {
        const { Html5QrcodeScanner, Html5QrcodeScanType } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5QrcodeScanner(
          containerId,
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          false,
        )
        scanner.render(
          (text: string) => {
            scanner?.clear().catch(() => {})
            onScan(text)
          },
          () => {},
        )
      } catch {
        // Camera unavailable
      }
    })()

    return () => {
      cancelled = true
      scanner?.clear().catch(() => {})
    }
  }, [onScan])

  return <div ref={scannerRef} id={containerId} className="w-full rounded-card overflow-hidden" />
}

export default QRScanner
