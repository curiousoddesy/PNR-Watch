// Web Share API integration service

export interface ShareData {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

export interface ShareOptions {
  fallbackMethod?: 'clipboard' | 'modal' | 'none'
  showSuccessMessage?: boolean
  customFallback?: (data: ShareData) => void
}

class ShareService {
  private readonly isShareSupported = 'share' in navigator
  private readonly isClipboardSupported = 'clipboard' in navigator

  /**
   * Share content using Web Share API or fallback
   */
  async share(data: ShareData, options: ShareOptions = {}): Promise<boolean> {
    const {
      fallbackMethod = 'clipboard',
      showSuccessMessage = true,
      customFallback
    } = options

    try {
      // Use native Web Share API if supported
      if (this.isShareSupported && this.canShare(data)) {
        await navigator.share(data)
        
        if (showSuccessMessage) {
          this.showSuccessMessage('Content shared successfully!')
        }
        
        console.log('Content shared via Web Share API')
        return true
      }

      // Use custom fallback if provided
      if (customFallback) {
        customFallback(data)
        return true
      }

      // Use built-in fallback methods
      return await this.handleFallback(data, fallbackMethod, showSuccessMessage)

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Share cancelled by user')
        return false
      }
      
      console.error('Share failed:', error)
      
      // Try fallback on error
      if (fallbackMethod !== 'none') {
        return await this.handleFallback(data, fallbackMethod, showSuccessMessage)
      }
      
      return false
    }
  }

  /**
   * Share PNR details
   */
  async sharePNR(pnrData: any): Promise<boolean> {
    const shareData: ShareData = {
      title: `PNR Status - ${pnrData.pnrNumber}`,
      text: this.formatPNRText(pnrData),
      url: `${window.location.origin}/pnr/${pnrData.pnrNumber}`,
    }

    return await this.share(shareData, {
      fallbackMethod: 'modal',
      showSuccessMessage: true,
    })
  }

  /**
   * Share app with friends
   */
  async shareApp(): Promise<boolean> {
    const shareData: ShareData = {
      title: 'PNR Tracker - Track Your Train Journey',
      text: 'Check out this awesome PNR tracking app! Track your train journey in real-time with offline support.',
      url: window.location.origin,
    }

    return await this.share(shareData, {
      fallbackMethod: 'modal',
      showSuccessMessage: true,
    })
  }

  /**
   * Share journey details
   */
  async shareJourney(journeyData: any): Promise<boolean> {
    const shareData: ShareData = {
      title: `Journey Details - ${journeyData.trainName}`,
      text: this.formatJourneyText(journeyData),
      url: `${window.location.origin}/journey/${journeyData.id}`,
    }

    return await this.share(shareData)
  }

  /**
   * Share with specific platform
   */
  async shareToSocial(platform: 'twitter' | 'facebook' | 'whatsapp' | 'telegram', data: ShareData): Promise<boolean> {
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.text || '')}&url=${encodeURIComponent(data.url || '')}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url || '')}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${data.text || ''} ${data.url || ''}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(data.url || '')}&text=${encodeURIComponent(data.text || '')}`,
    }

    try {
      window.open(urls[platform], '_blank', 'width=600,height=400')
      return true
    } catch (error) {
      console.error(`Failed to share to ${platform}:`, error)
      return false
    }
  }

  /**
   * Copy to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (this.isClipboardSupported) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      
      console.log('Text copied to clipboard')
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Check if sharing is supported
   */
  isSupported(): boolean {
    return this.isShareSupported
  }

  /**
   * Check if specific data can be shared
   */
  canShare(data: ShareData): boolean {
    if (!this.isShareSupported) return false
    
    try {
      return navigator.canShare ? navigator.canShare(data) : true
    } catch {
      return false
    }
  }

  /**
   * Private helper methods
   */
  private async handleFallback(data: ShareData, method: string, showSuccess: boolean): Promise<boolean> {
    switch (method) {
      case 'clipboard':
        const text = this.formatShareText(data)
        const success = await this.copyToClipboard(text)
        if (success && showSuccess) {
          this.showSuccessMessage('Link copied to clipboard!')
        }
        return success

      case 'modal':
        this.showShareModal(data)
        return true

      case 'none':
      default:
        return false
    }
  }

  private formatShareText(data: ShareData): string {
    const parts: string[] = []
    
    if (data.title) parts.push(data.title)
    if (data.text) parts.push(data.text)
    if (data.url) parts.push(data.url)
    
    return parts.join('\n\n')
  }

  private formatPNRText(pnrData: any): string {
    return `🚂 PNR Status Update

PNR: ${pnrData.pnrNumber}
Train: ${pnrData.trainName || 'N/A'} (${pnrData.trainNumber || 'N/A'})
Status: ${pnrData.status || 'Unknown'}
Journey: ${pnrData.from || 'N/A'} → ${pnrData.to || 'N/A'}
Date: ${pnrData.journeyDate || 'N/A'}

Track your PNR with our app!`
  }

  private formatJourneyText(journeyData: any): string {
    return `🚂 Journey Details

Train: ${journeyData.trainName || 'N/A'} (${journeyData.trainNumber || 'N/A'})
Route: ${journeyData.from || 'N/A'} → ${journeyData.to || 'N/A'}
Departure: ${journeyData.departureTime || 'N/A'}
Arrival: ${journeyData.arrivalTime || 'N/A'}
Date: ${journeyData.date || 'N/A'}

Plan your journey with our app!`
  }

  private showSuccessMessage(message: string): void {
    // Dispatch custom event for success message
    window.dispatchEvent(new CustomEvent('share-success', {
      detail: { message }
    }))
  }

  private showShareModal(data: ShareData): void {
    // Dispatch custom event to show share modal
    window.dispatchEvent(new CustomEvent('show-share-modal', {
      detail: data
    }))
  }
}

export const shareService = new ShareService()

// React hook for sharing
export function useShare() {
  const [isSupported] = useState(shareService.isSupported())

  return {
    isSupported,
    share: (data: ShareData, options?: ShareOptions) => shareService.share(data, options),
    sharePNR: (pnrData: any) => shareService.sharePNR(pnrData),
    shareApp: () => shareService.shareApp(),
    shareJourney: (journeyData: any) => shareService.shareJourney(journeyData),
    shareToSocial: (platform: 'twitter' | 'facebook' | 'whatsapp' | 'telegram', data: ShareData) => 
      shareService.shareToSocial(platform, data),
    copyToClipboard: (text: string) => shareService.copyToClipboard(text),
    canShare: (data: ShareData) => shareService.canShare(data),
  }
}

// Import React hooks
import { useState } from 'react'