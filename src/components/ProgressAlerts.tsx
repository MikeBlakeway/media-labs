/**
 * ProgressAlerts Component
 *
 * Displays additional status alerts and warnings.
 */

'use client'

interface ProgressAlertsProps {
  status: string
  attempts?: number
  className?: string
}

export function ProgressAlerts({ 
  status, 
  attempts = 0, 
  className = '' 
}: ProgressAlertsProps) {
  return (
    <div className={className}>
      {/* Retry attempt warning */}
      {attempts > 1 && (
        <div className='text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-2'>
          ⚠️ Retry attempt #{attempts}
        </div>
      )}

      {/* Timeout warning */}
      {status === 'timed-out' && (
        <div className='text-xs text-red-600 bg-red-50 px-2 py-1 rounded'>
          ⏰ Job timed out - this usually indicates a worker issue
        </div>
      )}
    </div>
  )
}
