import { useState, useEffect } from 'react'
import { useWebVitals } from '../../utils/webVitals'
import { useErrorTracking } from '../../utils/errorTracking'
import { useMemoryManagement } from '../../utils/memoryManagement'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export function PerformanceDashboard() {
  const { metrics, report, score } = useWebVitals()
  const { getStats } = useErrorTracking()
  const { stats: memoryStats } = useMemoryManagement()
  const [errorStats, setErrorStats] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setErrorStats(getStats())
  }, [getStats])

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="secondary"
          size="sm"
          className="shadow-lg"
        >
          📊 Performance
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance Monitor</h3>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
          >
            ✕
          </Button>
        </div>

        {/* Performance Score */}
        <Card className="mb-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-sm text-gray-600">Performance Score</div>
          </div>
        </Card>

        {/* Web Vitals */}
        <Card className="mb-4">
          <h4 className="font-medium mb-2">Web Vitals</h4>
          <div className="space-y-2 text-sm">
            <MetricRow label="FCP" value={metrics.FCP} unit="ms" threshold={1800} />
            <MetricRow label="LCP" value={metrics.LCP} unit="ms" threshold={2500} />
            <MetricRow label="FID" value={metrics.FID} unit="ms" threshold={100} />
            <MetricRow label="CLS" value={metrics.CLS} unit="" threshold={0.1} />
            <MetricRow label="TTFB" value={metrics.TTFB} unit="ms" threshold={800} />
          </div>
        </Card>

        {/* Memory Usage */}
        {memoryStats?.current && (
          <Card className="mb-4">
            <h4 className="font-medium mb-2">Memory Usage</h4>
            <div className="text-sm">
              <div>Used: {formatBytes(memoryStats.current.usedJSHeapSize)}</div>
              <div>Total: {formatBytes(memoryStats.current.totalJSHeapSize)}</div>
              <div>Limit: {formatBytes(memoryStats.current.jsHeapSizeLimit)}</div>
            </div>
          </Card>
        )}

        {/* Error Stats */}
        {errorStats && (
          <Card className="mb-4">
            <h4 className="font-medium mb-2">Error Statistics</h4>
            <div className="text-sm">
              <div>Total Errors: {errorStats.total}</div>
              {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
                <div key={severity}>
                  {severity}: {count as number}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Performance Issues */}
        {report?.issues && report.issues.length > 0 && (
          <Card>
            <h4 className="font-medium mb-2">Issues</h4>
            <div className="space-y-1 text-sm">
              {report.issues.slice(0, 3).map((issue, index) => (
                <div key={index} className={`text-${getSeverityColor(issue.severity)}-600`}>
                  {issue.description}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function MetricRow({ 
  label, 
  value, 
  unit, 
  threshold 
}: { 
  label: string
  value: number | null
  unit: string
  threshold: number 
}) {
  if (value === null) {
    return (
      <div className="flex justify-between">
        <span>{label}:</span>
        <span className="text-gray-400">-</span>
      </div>
    )
  }

  const isGood = value <= threshold
  const color = isGood ? 'text-green-600' : 'text-red-600'

  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <span className={color}>
        {value.toFixed(unit === '' ? 3 : 0)}{unit}
      </span>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 75) return 'text-yellow-600'
  return 'text-red-600'
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'red'
    case 'medium': return 'yellow'
    case 'low': return 'blue'
    default: return 'gray'
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}