import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Type definitions for SSE connections
interface SSEConnection {
  res: Response
  jobId: string
  clientId: string
  connectedAt: Date
}

interface SSEMessage {
  type: string
  data?: any
  timestamp?: string
}

// In-memory channel registry to track connections by jobId
const connectionRegistry = new Map<string, SSEConnection[]>()

// Helper function to generate unique client ID
const generateClientId = (): string => {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Helper function to send SSE message to a specific connection
const sendSSEMessage = (connection: SSEConnection, message: SSEMessage): boolean => {
  try {
    const sseData = `data: ${JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    })}\n\n`
    
    connection.res.write(sseData)
    return true
  } catch (error) {
    console.error('Failed to send SSE message:', error)
    return false
  }
}

// Helper function to broadcast message to all clients for a specific jobId
const broadcastToJob = (jobId: string, message: SSEMessage): number => {
  const connections = connectionRegistry.get(jobId) || []
  let successCount = 0
  
  // Clean up dead connections while broadcasting
  const activeConnections: SSEConnection[] = []
  
  for (const connection of connections) {
    if (sendSSEMessage(connection, message)) {
      activeConnections.push(connection)
      successCount++
    } else {
      // Connection is dead, don't keep it
      console.log(`Removing dead connection for job ${jobId}, client ${connection.clientId}`)
    }
  }
  
  // Update registry with only active connections
  if (activeConnections.length > 0) {
    connectionRegistry.set(jobId, activeConnections)
  } else {
    connectionRegistry.delete(jobId)
  }
  
  return successCount
}

// Helper function to remove a specific connection
const removeConnection = (jobId: string, clientId: string): void => {
  const connections = connectionRegistry.get(jobId) || []
  const filteredConnections = connections.filter(conn => conn.clientId !== clientId)
  
  if (filteredConnections.length > 0) {
    connectionRegistry.set(jobId, filteredConnections)
  } else {
    connectionRegistry.delete(jobId)
  }
  
  console.log(`Removed connection for job ${jobId}, client ${clientId}. Remaining connections: ${filteredConnections.length}`)
}

// GET /api/jobs/stream?jobId=... - SSE endpoint for job status updates
router.get('/api/jobs/stream', async (req: Request, res: Response) => {
  const jobId = req.query.jobId as string
  
  if (!jobId) {
    return res.status(400).json({
      error: 'Missing required parameter: jobId'
    })
  }
  
  try {
    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      })
    }
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })
    
    // Generate unique client ID
    const clientId = generateClientId()
    
    // Create connection object
    const connection: SSEConnection = {
      res,
      jobId,
      clientId,
      connectedAt: new Date()
    }
    
    // Add to registry
    const existingConnections = connectionRegistry.get(jobId) || []
    existingConnections.push(connection)
    connectionRegistry.set(jobId, existingConnections)
    
    console.log(`New SSE connection for job ${jobId}, client ${clientId}. Total connections: ${existingConnections.length}`)
    
    // Send immediate connection confirmation
    sendSSEMessage(connection, {
      type: 'connected',
      data: {
        clientId,
        jobId,
        connectedAt: connection.connectedAt.toISOString(),
        jobStatus: job.status,
        progressPct: job.progressPct
      }
    })
    
    // Handle client disconnect
    let isCleanedUp = false
    const cleanup = () => {
      if (!isCleanedUp) {
        isCleanedUp = true
        removeConnection(jobId, clientId)
      }
    }
    
    req.on('close', cleanup)
    req.on('aborted', cleanup)
    res.on('close', cleanup)
    res.on('error', cleanup)
    
    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      if (!sendSSEMessage(connection, { type: 'heartbeat' })) {
        clearInterval(heartbeatInterval)
        cleanup()
      }
    }, 30000) // 30 seconds
    
    // Clean up interval on disconnect
    const cleanupWithInterval = () => {
      clearInterval(heartbeatInterval)
      cleanup()
    }
    
    req.on('close', cleanupWithInterval)
    req.on('aborted', cleanupWithInterval)
    res.on('close', cleanupWithInterval)
    res.on('error', cleanupWithInterval)
    
  } catch (error) {
    console.error('SSE connection error:', error)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
})

// GET /api/jobs/stream/stats - Debug endpoint to see connection stats
router.get('/api/jobs/stream/stats', (req: Request, res: Response) => {
  const stats = {
    totalJobs: connectionRegistry.size,
    connections: Array.from(connectionRegistry.entries()).map(([jobId, connections]) => ({
      jobId,
      connectionCount: connections.length,
      clients: connections.map(conn => ({
        clientId: conn.clientId,
        connectedAt: conn.connectedAt.toISOString()
      }))
    }))
  }
  
  res.json(stats)
})

// POST /api/jobs/stream/broadcast/:jobId - Test endpoint to broadcast messages
router.post('/api/jobs/stream/broadcast/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params
  const { type, data } = req.body
  
  if (!type) {
    return res.status(400).json({ error: 'Missing message type' })
  }
  
  const result = broadcastToJob(jobId, { type, data })
  
  res.json({
    jobId,
    message: { type, data },
    clientsNotified: result
  })
})

export { router as sseRouter, broadcastToJob }