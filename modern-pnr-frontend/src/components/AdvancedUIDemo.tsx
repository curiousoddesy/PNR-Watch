import React, { useState } from 'react'
import { 
  DataTable,
  Grid,
  GridItem,
  Container,
  Flex,
  Stack,
  Center,
  Spacer,
  FormField,
  Textarea,
  Select,
  AutoComplete,
  Progress,
  CircularProgress,
  Stepper,
  Tooltip,
  Popover,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  useToastActions,
  type Column
} from './ui'

interface SampleData {
  id: string
  name: string
  status: 'active' | 'inactive' | 'pending'
  date: string
  progress: number
}

const sampleData: SampleData[] = [
  { id: '1', name: 'PNR 12345', status: 'active', date: '2024-01-15', progress: 85 },
  { id: '2', name: 'PNR 67890', status: 'pending', date: '2024-01-16', progress: 45 },
  { id: '3', name: 'PNR 11111', status: 'inactive', date: '2024-01-17', progress: 100 },
  { id: '4', name: 'PNR 22222', status: 'active', date: '2024-01-18', progress: 30 },
  { id: '5', name: 'PNR 33333', status: 'pending', date: '2024-01-19', progress: 75 },
]

const autoCompleteOptions = [
  { value: 'mumbai', label: 'Mumbai Central' },
  { value: 'delhi', label: 'New Delhi' },
  { value: 'bangalore', label: 'Bangalore City' },
  { value: 'chennai', label: 'Chennai Central' },
  { value: 'kolkata', label: 'Howrah Junction' },
  { value: 'pune', label: 'Pune Junction' },
]

const selectOptions = [
  { value: 'ac1', label: '1st AC' },
  { value: 'ac2', label: '2nd AC' },
  { value: 'ac3', label: '3rd AC' },
  { value: 'sl', label: 'Sleeper' },
  { value: 'cc', label: 'Chair Car' },
]

export const AdvancedUIDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    pnr: '',
    from: '',
    to: '',
    class: '',
    notes: '',
  })
  const [progress, setProgress] = useState(65)
  const [currentStep, setCurrentStep] = useState(1)
  const toast = useToastActions()

  const columns: Column<SampleData>[] = [
    {
      key: 'name',
      header: 'PNR Number',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'active' 
            ? 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400'
            : value === 'pending'
            ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400'
            : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-400'
        }`}>
          {String(value)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (value) => (
        <div className="w-20">
          <Progress value={Number(value)} size="sm" />
        </div>
      ),
    },
  ]

  const steps = [
    {
      label: 'Enter PNR',
      description: 'Input your PNR number',
      completed: currentStep > 0,
      current: currentStep === 0,
    },
    {
      label: 'Verify Details',
      description: 'Check journey information',
      completed: currentStep > 1,
      current: currentStep === 1,
    },
    {
      label: 'Track Status',
      description: 'Monitor real-time updates',
      completed: currentStep > 2,
      current: currentStep === 2,
    },
    {
      label: 'Complete',
      description: 'Journey finished',
      completed: currentStep > 3,
      current: currentStep === 3,
    },
  ]

  return (
    <Container size="xl">
      <Stack spacing="xl">
        {/* DataTable Section */}
        <Card>
          <CardHeader>
            <CardTitle>DataTable Component</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={sampleData}
              columns={columns}
              searchable
              sortable
              pageSize={3}
              onRowClick={(row) => toast.info('Row clicked', `Selected: ${row.name}`)}
            />
          </CardContent>
        </Card>

        {/* Grid Layout Section */}
        <Card>
          <CardHeader>
            <CardTitle>Grid & Layout Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack spacing="lg">
              <div>
                <h4 className="text-sm font-medium mb-3">Responsive Grid</h4>
                <Grid cols={1} responsive={{ md: 2, lg: 3 }} gap="md">
                  <GridItem>
                    <Card variant="outlined" padding="md">
                      <Center className="h-20">
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Grid Item 1</span>
                      </Center>
                    </Card>
                  </GridItem>
                  <GridItem>
                    <Card variant="outlined" padding="md">
                      <Center className="h-20">
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Grid Item 2</span>
                      </Center>
                    </Card>
                  </GridItem>
                  <GridItem>
                    <Card variant="outlined" padding="md">
                      <Center className="h-20">
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Grid Item 3</span>
                      </Center>
                    </Card>
                  </GridItem>
                </Grid>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Flex Layout</h4>
                <Flex justify="between" align="center" className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <span className="text-sm">Left Content</span>
                  <Spacer />
                  <span className="text-sm">Right Content</span>
                </Flex>
              </div>
            </Stack>
          </CardContent>
        </Card>

        {/* Form Components Section */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={1} responsive={{ md: 2 }} gap="lg">
              <GridItem>
                <Stack spacing="md">
                  <FormField
                    label="PNR Number"
                    placeholder="Enter PNR number"
                    value={formData.pnr}
                    onChange={(e) => setFormData(prev => ({ ...prev, pnr: e.target.value }))}
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    }
                    required
                  />

                  <AutoComplete
                    label="From Station"
                    placeholder="Search stations..."
                    options={autoCompleteOptions}
                    onSelect={(option) => setFormData(prev => ({ ...prev, from: option.value }))}
                    required
                  />

                  <AutoComplete
                    label="To Station"
                    placeholder="Search stations..."
                    options={autoCompleteOptions}
                    onSelect={(option) => setFormData(prev => ({ ...prev, to: option.value }))}
                    required
                  />
                </Stack>
              </GridItem>

              <GridItem>
                <Stack spacing="md">
                  <Select
                    label="Class"
                    placeholder="Select class"
                    options={selectOptions}
                    value={formData.class}
                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    required
                  />

                  <Textarea
                    label="Additional Notes"
                    placeholder="Enter any additional information..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    helperText="Optional field for extra details"
                  />
                </Stack>
              </GridItem>
            </Grid>
          </CardContent>
        </Card>

        {/* Progress Components Section */}
        <Grid cols={1} responsive={{ lg: 2 }} gap="lg">
          <GridItem>
            <Card>
              <CardHeader>
                <CardTitle>Progress Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <Stack spacing="lg">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Linear Progress</h4>
                    <Stack spacing="md">
                      <Progress value={progress} showLabel label="Journey Progress" />
                      <Progress value={85} variant="success" showLabel label="Booking Confirmed" />
                      <Progress value={45} variant="warning" showLabel label="Waiting List" />
                      <Progress value={15} variant="error" showLabel label="Cancelled" />
                    </Stack>
                    
                    <Flex gap="sm" className="mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setProgress(Math.max(0, progress - 10))}
                      >
                        Decrease
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setProgress(Math.min(100, progress + 10))}
                      >
                        Increase
                      </Button>
                    </Flex>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Circular Progress</h4>
                    <Flex gap="lg" align="center">
                      <CircularProgress value={progress} showLabel size={80} />
                      <CircularProgress value={100} variant="success" label="Complete" size={80} />
                    </Flex>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </GridItem>

          <GridItem>
            <Card>
              <CardHeader>
                <CardTitle>Stepper Component</CardTitle>
              </CardHeader>
              <CardContent>
                <Stack spacing="lg">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Horizontal Stepper</h4>
                    <Stepper steps={steps} />
                    
                    <Flex gap="sm" className="mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                      >
                        Previous
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                        disabled={currentStep === 3}
                      >
                        Next
                      </Button>
                    </Flex>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Vertical Stepper</h4>
                    <Stepper steps={steps.slice(0, 3)} orientation="vertical" />
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </GridItem>
        </Grid>

        {/* Tooltip & Popover Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tooltip & Popover Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={1} responsive={{ md: 2 }} gap="lg">
              <GridItem>
                <Stack spacing="md">
                  <h4 className="text-sm font-medium">Tooltips</h4>
                  <Flex gap="md" wrap="wrap">
                    <Tooltip content="This is a top tooltip" placement="top">
                      <Button variant="outline" size="sm">Top</Button>
                    </Tooltip>
                    <Tooltip content="This is a bottom tooltip" placement="bottom">
                      <Button variant="outline" size="sm">Bottom</Button>
                    </Tooltip>
                    <Tooltip content="This is a left tooltip" placement="left">
                      <Button variant="outline" size="sm">Left</Button>
                    </Tooltip>
                    <Tooltip content="This is a right tooltip" placement="right">
                      <Button variant="outline" size="sm">Right</Button>
                    </Tooltip>
                  </Flex>
                </Stack>
              </GridItem>

              <GridItem>
                <Stack spacing="md">
                  <h4 className="text-sm font-medium">Popovers</h4>
                  <Flex gap="md" wrap="wrap">
                    <Popover
                      content={
                        <div className="p-4 max-w-xs">
                          <h3 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                            PNR Information
                          </h3>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                            Click to view detailed information about your PNR status and journey details.
                          </p>
                          <Button size="sm" onClick={() => toast.info('Popover action', 'Button clicked in popover')}>
                            View Details
                          </Button>
                        </div>
                      }
                      placement="bottom"
                    >
                      <Button variant="outline" size="sm">Click Popover</Button>
                    </Popover>

                    <Popover
                      content={
                        <div className="p-3">
                          <p className="text-sm text-secondary-600 dark:text-secondary-400">
                            Hover to see this popover
                          </p>
                        </div>
                      }
                      trigger="hover"
                      placement="top"
                    >
                      <Button variant="outline" size="sm">Hover Popover</Button>
                    </Popover>
                  </Flex>
                </Stack>
              </GridItem>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}