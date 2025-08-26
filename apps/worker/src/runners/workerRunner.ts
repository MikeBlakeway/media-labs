export async function startWorker(): Promise<void> {
  console.log('workerRunner: startWorker called')
  await new Promise(resolve => setTimeout(resolve, 100))
  console.log('workerRunner: started')
}

export default startWorker
