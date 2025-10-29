import React, { useEffect, useState } from 'react'
import { PNRDashboard } from './features/PNRDashboard'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { usePNRStore } from '../stores/pnrStore'
import { PNR } from '../types'

// Sample PNR data for demonstration
const samplePNRs: PNR[] = [
  {
    id: '1',
    number: '2301234567',
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
          bookingStatus: 'CNF',
          coachPosition: 'S1',
          seatNumber: '23'
        },
        {
          serialNumber: 2,
          name: 'Jane Doe',
          age: 32,
          gender: 'F',
          currentStatus: 'CNF',
          bookingStatus: 'CNF',
          coachPosition: 'S1',
          seatNumber: '24'
        }
      ],
      trainInfo: {
        number: '12345',
        name: 'Rajdhani Express',
        departureTime: '16:55',
        arrivalTime: '08:20',
        duration: '15h 25m',
        distance: '1447 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date().toISOString()
    },
    passengerName: 'John Doe',
    trainNumber: '12345',
    trainName: 'Rajdhani Express',
    dateOfJourney: '2024-12-15',
    from: 'New Delhi',
    to: 'Mumbai Central',
    class: '2A',
    quota: 'GN',
    createdAt: '2024-10-28T10:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    number: '2301234568',
    status: {
      currentStatus: 'RAC',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'Alice Smith',
          age: 28,
          gender: 'F',
          currentStatus: 'RAC 15',
          bookingStatus: 'RAC 15'
        }
      ],
      trainInfo: {
        number: '12951',
        name: 'Mumbai Rajdhani',
        departureTime: '17:15',
        arrivalTime: '08:35',
        duration: '15h 20m',
        distance: '1384 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date(Date.now() - 3600000).toISOString()
    },
    passengerName: 'Alice Smith',
    trainNumber: '12951',
    trainName: 'Mumbai Rajdhani',
    dateOfJourney: '2024-12-20',
    from: 'Mumbai Central',
    to: 'New Delhi',
    class: '3A',
    quota: 'GN',
    createdAt: '2024-10-27T14:30:00Z',
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '3',
    number: '2301234569',
    status: {
      currentStatus: 'WL',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'Bob Johnson',
          age: 45,
          gender: 'M',
          currentStatus: 'WL 25',
          bookingStatus: 'WL 25'
        },
        {
          serialNumber: 2,
          name: 'Carol Johnson',
          age: 42,
          gender: 'F',
          currentStatus: 'WL 26',
          bookingStatus: 'WL 26'
        }
      ],
      trainInfo: {
        number: '12002',
        name: 'Shatabdi Express',
        departureTime: '06:00',
        arrivalTime: '12:30',
        duration: '6h 30m',
        distance: '448 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      },
      lastUpdated: new Date(Date.now() - 7200000).toISOString()
    },
    passengerName: 'Bob Johnson',
    trainNumber: '12002',
    trainName: 'Shatabdi Express',
    dateOfJourney: '2024-11-05',
    from: 'New Delhi',
    to: 'Chandigarh',
    class: 'CC',
    quota: 'GN',
    createdAt: '2024-10-25T09:15:00Z',
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: '4',
    number: '2301234570',
    status: {
      currentStatus: 'CAN',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'David Wilson',
          age: 38,
          gender: 'M',
          currentStatus: 'CAN',
          bookingStatus: 'CNF'
        }
      ],
      trainInfo: {
        number: '12626',
        name: 'Kerala Express',
        departureTime: '22:00',
        arrivalTime: '11:45',
        duration: '37h 45m',
        distance: '2649 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date(Date.now() - 86400000).toISOString()
    },
    passengerName: 'David Wilson',
    trainNumber: '12626',
    trainName: 'Kerala Express',
    dateOfJourney: '2024-11-01',
    from: 'New Delhi',
    to: 'Thiruvananthapuram',
    class: 'SL',
    quota: 'GN',
    createdAt: '2024-10-20T16:45:00Z',
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '5',
    number: '2301234571',
    status: {
      currentStatus: 'PQWL',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'Emma Davis',
          age: 29,
          gender: 'F',
          currentStatus: 'PQWL 8',
          bookingStatus: 'PQWL 8'
        }
      ],
      trainInfo: {
        number: '12301',
        name: 'Howrah Rajdhani',
        departureTime: '16:55',
        arrivalTime: '10:05',
        duration: '17h 10m',
        distance: '1447 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date(Date.now() - 1800000).toISOString()
    },
    passengerName: 'Emma Davis',
    trainNumber: '12301',
    trainName: 'Howrah Rajdhani',
    dateOfJourney: '2024-12-25',
    from: 'New Delhi',
    to: 'Howrah',
    class: '1A',
    quota: 'GN',
    createdAt: '2024-10-28T08:20:00Z',
    updatedAt: new Date(Date.now() - 1800000).toISOString()
  }
]

export const PNRManagementDemo: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedPNR, setSelectedPNR] = useState<PNR | null>(null)
  
  const { setPNRs, removePNR } = usePNRStore()

  // Load sample data on component mount
  useEffect(() => {
    setPNRs(samplePNRs)
  }, [setPNRs])

  const handlePNREdit = (pnr: PNR) => {
    console.log('Edit PNR:', pnr)
    // In a real app, this would open an edit modal
  }

  const handlePNRDelete = (id: string) => {
    removePNR(id)
  }

  const handlePNRDetails = (pnr: PNR) => {
    setSelectedPNR(pnr)
    setShowDetailsModal(true)
  }

  const handleAddPNR = () => {
    setShowAddModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
          Advanced PNR Management Interface
        </h2>
        <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto">
          Experience the modern PNR dashboard with real-time updates, advanced filtering, 
          swipe gestures, bulk operations, and virtualized performance for handling large datasets.
        </p>
      </div>

      <PNRDashboard
        onPNREdit={handlePNREdit}
        onPNRDelete={handlePNRDelete}
        onPNRDetails={handlePNRDetails}
        onAddPNR={handleAddPNR}
      />

      {/* Add PNR Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        size="lg"
      >
        <ModalHeader>
          <h3 className="text-lg font-semibold">Add New PNR</h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Enter PNR details to start tracking
          </p>
        </ModalHeader>
        
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                PNR Number
              </label>
              <input
                type="text"
                placeholder="Enter 10-digit PNR number"
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Passenger Name
              </label>
              <input
                type="text"
                placeholder="Enter passenger name"
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              This is a demo. In a real application, the PNR would be validated and details fetched automatically.
            </p>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowAddModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => setShowAddModal(false)}>
            Add PNR
          </Button>
        </ModalFooter>
      </Modal>

      {/* PNR Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        size="xl"
      >
        {selectedPNR && (
          <>
            <ModalHeader>
              <h3 className="text-lg font-semibold">
                PNR Details: {selectedPNR.number}
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Complete journey and passenger information
              </p>
            </ModalHeader>
            
            <ModalBody>
              <div className="space-y-6">
                {/* Train Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Train Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Train Number</span>
                        <p className="font-medium">{selectedPNR.trainNumber}</p>
                      </div>
                      <div>
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Train Name</span>
                        <p className="font-medium">{selectedPNR.trainName}</p>
                      </div>
                      <div>
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Departure</span>
                        <p className="font-medium">{selectedPNR.status.trainInfo.departureTime}</p>
                      </div>
                      <div>
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Arrival</span>
                        <p className="font-medium">{selectedPNR.status.trainInfo.arrivalTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Passenger Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Passengers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedPNR.status.passengers.map((passenger, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-md">
                          <div>
                            <p className="font-medium">{passenger.name}</p>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">
                              {passenger.age} years, {passenger.gender}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{passenger.currentStatus}</p>
                            {passenger.seatNumber && (
                              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                                {passenger.coachPosition}-{passenger.seatNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  )
}