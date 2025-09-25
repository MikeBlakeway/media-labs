import { CacheDashboard } from '@/components/CacheDashboard'
import S3CacheManager from '@/components/S3CacheManager'

export default function CacheAdminPage() {
  return (
    <div className='min-h-screen bg-gray-100 dark:bg-slate-900 space-y-8'>
      <CacheDashboard />
      <S3CacheManager />
    </div>
  )
}
