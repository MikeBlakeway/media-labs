import { app } from './app'
import { validateRunPodConfig } from './config/runpod'
import { validateStorageConfig } from './config/storage'

const PORT = process.env.PORT || 4000

// Validate cloud mode configuration before starting server
console.log('🔧 Validating cloud mode configuration...')
validateRunPodConfig()
validateStorageConfig()

app.listen(PORT, () => {
  console.log(`✅ API server is running on http://localhost:${PORT}`)
})
