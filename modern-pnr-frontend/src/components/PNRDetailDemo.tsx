import React, { useState } from 'react'
import { PNRDetailView } from './features/PNRDetailView'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { PNR } from '../types'

// Mock PNR data for demonstration
const mockPNR: PNR = {
  id: '1',
  number: '1234567890',
  status: {
    currentStatus: 'CNF',
    chartPrepared: true,
    passengers: [
      {
        serialNumber: 1,
        name: 'John Doe',
        age: 35,
        gender: 'M',
        currentStatus: 'CNF',
        bookingStatus: 'WL/15',
        seatNumber: 'S1/45',
        coachPosition: 'S1'
      },
      {
        serialNumber: 2,
        name: 'Jane Doe',
        age: 32,
        gender: 'F',
        currentStatus: 'CNF',
        bookingStatus: 'WL/16',
        seatNumber: 'S1/46',
        coachPosition: 'S1'
      }
    ],
    trainInfo: {
      number: '12345',
      name: 'Rajdhani Express',
      departureTime: '16:30',
      arrivalTime: '08:15',
      duration: '15h 45m',
      distance: '1447 km',
      runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    lastUpdated: new Date().toISOString()
  },
  passengerName: 'John Doe',
  trainNumber: '12345',
  trainName: 'Rajdhani Express',
  dateOfJourney: '2024-12-15',
  from: 'NDLS',
  to: 'HWH',
  class: '3A',
  quota: 'GN',
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString()
}

export const PNRDetailDemo: React.FC = () => {
  const [showDetailView, setShowDetailView] = useState(false)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>PNR Detail Views Demo</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            This demo showcases the advanced PNR detail views with animated timeline, 
            journey map, status charts, and export functionality.
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <h4 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
                  Features Included:
                </h4>
                <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
                  <li>• Animated status timeline with progress indicators</li>
                  <li>• Interactive journey map with station details</li>
                  <li>• Visual status history charts and analytics</li>
                  <li>• Comprehensive passenger information</li>
                  <li>• Share functionality with social media integration</li>
                  <li>• Export options (PDF, Excel, CSV, JSON, Image)</li>
                  <li>• Print-friendly layouts</li>
                  <li>• Fullscreen mode for detailed analysis</li>
                </ul>
              </div>
              
              <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <h4 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
                  Mock PNR Details:
                </h4>
                <div className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
                  <div><strong>PNR:</strong> {mockPNR.number}</div>
                  <div><strong>Train:</strong> {mockPNR.trainNumber} {mockPNR.trainName}</div>
                  <div><strong>Route:</strong> {mockPNR.from} → {mockPNR.to}</div>
                  <div><strong>Status:</strong> {mockPNR.status.currentStatus}</div>
                  <div><strong>Passengers:</strong> {mockPNR.status.passengers.length}</div>
                  <div><strong>Class:</strong> {mockPNR.class}</div>
                  <div><strong>Date:</strong> {new Date(mockPNR.dateOfJourney).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowDetailView(true)}
              className="w-full md:w-auto"
            >
              Open PNR Detail View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PNR Detail View Modal */}
      <PNRDetailView
        pnr={mockPNR}
        isOpen={showDetailView}
        onClose={() => setShowDetailView(false)}
      />
    </div>
  )
}