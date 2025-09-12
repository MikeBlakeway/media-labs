import { useState, useCallback } from 'react'

export type VolumeOperation =
  | 'seed'
  | 'verify'
  | 'ls'
  | 'stat'
  | 'mkdir'
  | 'rm'
  | 'mv'
  | 'checksum'
  | 'df'
  | 'gc_cache'
  | 'ping'
  | 'status'
  | 'logs'

export interface VolumeRequest {
  op: VolumeOperation
  args?: Record<string, unknown>
  endpointId?: string
}

export interface VolumeResponse {
  ok?: boolean
  error?: string
  [key: string]: unknown
}

export interface ManifestEntry {
  repo: string
  remote: string
  destDir: string
  filename: string
  required?: boolean
}

export interface SeedResult {
  status: 'downloaded' | 'skipped' | 'failed-optional' | 'would-download'
  dest: string
  bytes?: number
  sha256?: string
  error?: string
}

export interface FileInfo {
  path: string
  type: 'file' | 'dir'
  bytes: number
  mtime: number
}

export interface StatInfo {
  path: string
  exists: boolean
  type?: 'file' | 'dir'
  bytes?: number
  mtime?: number
  sha256?: string
  error?: string
}

export interface VolumeState {
  isLoading: boolean
  error: string | null
  lastResult: VolumeResponse | null
}

export function useVolumeOperations() {
  const [state, setState] = useState<VolumeState>({
    isLoading: false,
    error: null,
    lastResult: null
  })

  const executeOperation = useCallback(async (request: VolumeRequest): Promise<VolumeResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      setState(prev => ({ ...prev, isLoading: false, lastResult: result }))
      return result
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ ...prev, isLoading: false, error }))
      throw err
    }
  }, [])

  // Health check
  const ping = useCallback(async (): Promise<VolumeResponse> => {
    return executeOperation({ op: 'ping' })
  }, [executeOperation])

  // Seed models from manifest
  const seedModels = useCallback(
    async (
      manifest: ManifestEntry[],
      dryRun: boolean = false
    ): Promise<{ ok: boolean; results: SeedResult[]; error?: string }> => {
      return executeOperation({
        op: 'seed',
        args: { manifest, dryRun }
      }) as Promise<{ ok: boolean; results: SeedResult[]; error?: string }>
    },
    [executeOperation]
  )

  // Verify model presence
  const verifyModels = useCallback(
    async (manifest: ManifestEntry[]): Promise<{ present: string[]; missing: string[] }> => {
      return executeOperation({
        op: 'verify',
        args: { manifest }
      }) as Promise<{ present: string[]; missing: string[] }>
    },
    [executeOperation]
  )

  // List directory contents
  const listDirectory = useCallback(
    async (
      path: string = '/runpod-volume',
      options: {
        recursive?: boolean
        max?: number
        pattern?: string
      } = {}
    ): Promise<FileInfo[]> => {
      return executeOperation({
        op: 'ls',
        args: { path, ...options }
      }) as unknown as Promise<FileInfo[]>
    },
    [executeOperation]
  )

  // Get file/directory stats
  const getStats = useCallback(
    async (paths: string[], includeChecksum: boolean = false): Promise<StatInfo[]> => {
      return executeOperation({
        op: 'stat',
        args: { paths, checksum: includeChecksum }
      }) as unknown as Promise<StatInfo[]>
    },
    [executeOperation]
  )

  // Create directory
  const createDirectory = useCallback(
    async (path: string, parents: boolean = true): Promise<{ ok: boolean; path: string }> => {
      return executeOperation({
        op: 'mkdir',
        args: { path, parents }
      }) as Promise<{ ok: boolean; path: string }>
    },
    [executeOperation]
  )

  // Remove files/directories (requires ALLOW_DELETE=true on server)
  const removeFiles = useCallback(
    async (
      paths: string[],
      options: {
        dryRun?: boolean
        recursive?: boolean
      } = { dryRun: true }
    ): Promise<{ ok: boolean; results: Array<{ path: string; status: string }> }> => {
      return executeOperation({
        op: 'rm',
        args: { paths, ...options }
      }) as Promise<{ ok: boolean; results: Array<{ path: string; status: string }> }>
    },
    [executeOperation]
  )

  // Move/rename files
  const moveFile = useCallback(
    async (
      src: string,
      dest: string,
      overwrite: boolean = false
    ): Promise<{ ok: boolean; src: string; dest: string; error?: string }> => {
      return executeOperation({
        op: 'mv',
        args: { src, dest, overwrite }
      }) as Promise<{ ok: boolean; src: string; dest: string; error?: string }>
    },
    [executeOperation]
  )

  // Calculate checksums
  const calculateChecksums = useCallback(
    async (paths: string[]): Promise<Array<{ path: string; sha256?: string; bytes?: number; error?: string }>> => {
      return executeOperation({
        op: 'checksum',
        args: { paths }
      }) as unknown as Promise<Array<{ path: string; sha256?: string; bytes?: number; error?: string }>>
    },
    [executeOperation]
  )

  // Get disk usage
  const getDiskUsage = useCallback(
    async (
      paths: string[] = ['/runpod-volume']
    ): Promise<{ ok: boolean; usage: Array<{ path: string; bytes: number }> }> => {
      return executeOperation({
        op: 'df',
        args: { paths }
      }) as Promise<{ ok: boolean; usage: Array<{ path: string; bytes: number }> }>
    },
    [executeOperation]
  )

  // Garbage collect HuggingFace cache
  const gcCache = useCallback(
    async (
      maxSizeGB: number = 50,
      dryRun: boolean = true
    ): Promise<{
      ok: boolean
      reclaimed: number
      dryRun: boolean
      victims: Array<{ path: string; bytes: number }>
    }> => {
      return executeOperation({
        op: 'gc_cache',
        args: { maxSizeGB, dryRun }
      }) as Promise<{
        ok: boolean
        reclaimed: number
        dryRun: boolean
        victims: Array<{ path: string; bytes: number }>
      }>
    },
    [executeOperation]
  )

  // Get operation status
  const getStatus = useCallback(async (): Promise<VolumeResponse> => {
    return executeOperation({ op: 'status' })
  }, [executeOperation])

  // Get operation logs
  const getLogs = useCallback(
    async (limit: number = 100): Promise<VolumeResponse> => {
      return executeOperation({
        op: 'logs',
        args: { limit }
      })
    },
    [executeOperation]
  )

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    lastResult: state.lastResult,

    // Operations
    ping,
    seedModels,
    verifyModels,
    listDirectory,
    getStats,
    createDirectory,
    removeFiles,
    moveFile,
    calculateChecksums,
    getDiskUsage,
    gcCache,
    getStatus,
    getLogs,

    // Raw operation for custom use cases
    executeOperation
  }
}
