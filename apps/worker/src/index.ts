import { startWorker } from './runners/workerRunner'

const main = async () => {
  console.log('Starting Media Labs Worker...')
  await startWorker()
}

main().catch(err => {
  console.error('Error starting worker:', err)
  process.exit(1)
})
