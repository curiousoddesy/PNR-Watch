import React, { useState } from 'react'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  Modal,
  ModalBody,
  ModalFooter,
  useToastActions,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  Stack
} from './ui'
import { AdvancedUIDemo } from './AdvancedUIDemo'

export const DesignSystemDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSkeletons, setShowSkeletons] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const toast = useToastActions()

  return (
    <Stack spacing="xl">
      {/* Buttons Section */}
      <Card>
        <CardHeader>
          <CardTitle>Button Components</CardTitle>
          <CardDescription>Various button variants with loading states and micro-interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" onClick={() => toast.success('Success!', 'Primary button clicked')}>
              Primary
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Info', 'Secondary button clicked')}>
              Secondary
            </Button>
            <Button variant="outline" onClick={() => toast.warning('Warning', 'Outline button clicked')}>
              Outline
            </Button>
            <Button variant="ghost" onClick={() => toast.info('Ghost clicked')}>
              Ghost
            </Button>
            <Button variant="destructive" onClick={() => toast.error('Error!', 'Destructive action')}>
              Destructive
            </Button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4">
            <Button loading>Loading...</Button>
            <Button disabled>Disabled</Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="default" hoverable>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>A default card with hover effects</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              This card has hover animations and gesture support. Try hovering over it!
            </p>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">Action</Button>
          </CardFooter>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Elevated Card</CardTitle>
            <CardDescription>Card with elevated shadow</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              This card has a more prominent shadow for emphasis.
            </p>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Outlined Card</CardTitle>
            <CardDescription>Card with border styling</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              This card uses borders instead of shadows.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modal Section */}
      <Card>
        <CardHeader>
          <CardTitle>Modal Component</CardTitle>
          <CardDescription>Accessible modal with focus management and animations</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsModalOpen(true)}>
            Open Modal
          </Button>
        </CardContent>
      </Card>

      {/* Skeleton Section */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Components</CardTitle>
          <CardDescription>Loading placeholders with shimmer effects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={() => setShowSkeletons(!showSkeletons)}
              variant="outline"
            >
              {showSkeletons ? 'Hide' : 'Show'} Skeletons
            </Button>
            
            {showSkeletons ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Skeleton Card</h4>
                  <Card>
                    <SkeletonCard />
                  </Card>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Skeleton List</h4>
                  <SkeletonList items={4} />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Individual Skeletons</h4>
                  <div className="space-y-3">
                    <Skeleton variant="text" lines={3} />
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" width={48} height={48} />
                      <div className="flex-1">
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" className="mt-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Content Card</CardTitle>
                    <CardDescription>This is what the content looks like when loaded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 font-semibold">JD</span>
                      </div>
                      <div>
                        <p className="font-medium">John Doe</p>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400">Software Engineer</p>
                      </div>
                    </div>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      This is the actual content that would be displayed after loading is complete.
                      The skeleton components provide a smooth loading experience.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Components Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced UI Components</CardTitle>
          <CardDescription>DataTable, Grid, Forms, Progress, Tooltips and more</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant={showAdvanced ? "secondary" : "primary"}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Components
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Components Demo */}
      {showAdvanced && <AdvancedUIDemo />}

      {/* Modal Implementation */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        description="This modal demonstrates focus management and accessibility features"
        size="md"
      >
        <ModalBody>
          <div className="space-y-4">
            <p className="text-secondary-600 dark:text-secondary-400">
              This modal includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-secondary-600 dark:text-secondary-400">
              <li>Focus trap and management</li>
              <li>Escape key to close</li>
              <li>Click outside to close</li>
              <li>Smooth animations</li>
              <li>Accessible ARIA labels</li>
            </ul>
            
            <div className="flex gap-2">
              <Button size="sm" onClick={() => toast.success('Modal action', 'Button clicked inside modal')}>
                Test Toast
              </Button>
              <Button size="sm" variant="outline">
                Another Action
              </Button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            toast.success('Confirmed!', 'Modal action confirmed')
            setIsModalOpen(false)
          }}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  )
}