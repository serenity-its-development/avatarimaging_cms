/**
 * Custom React hooks for API data fetching
 * Uses React Query for caching, loading states, and automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../lib/api'

// =============================================================================
// HEALTH CHECK
// =============================================================================

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.checkHealth,
    refetchInterval: 60000, // Refetch every minute
  })
}

// =============================================================================
// CONTACTS
// =============================================================================

export function useContacts(params?: Parameters<typeof api.getContacts>[0]) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => api.getContacts(params),
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => api.getContact(id),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.Contact> }) =>
      api.updateContact(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useRecalculateWarmness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.recalculateWarmness,
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', contactId] })
    },
  })
}

// =============================================================================
// TASKS
// =============================================================================

export function useTasks(params?: Parameters<typeof api.getTasks>[0]) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.getTasks(params),
    staleTime: 10000, // Tasks change frequently
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.getTask(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.Task> }) =>
      api.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// =============================================================================
// BOOKINGS
// =============================================================================

export function useBookings(params?: Parameters<typeof api.getBookings>[0]) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => api.getBookings(params),
    staleTime: 30000,
  })
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => api.getBooking(id),
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.Booking> }) =>
      api.updateBooking(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.id] })
    },
  })
}

export function useDeleteBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

// =============================================================================
// DASHBOARD
// =============================================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })
}

export function usePerformanceReport() {
  return useQuery({
    queryKey: ['reports', 'performance'],
    queryFn: api.getPerformanceReport,
  })
}

// =============================================================================
// AI
// =============================================================================

export function useAIQuery() {
  return useMutation({
    mutationFn: api.queryAI,
  })
}

// =============================================================================
// MESSAGES
// =============================================================================

export function useSendSMS() {
  return useMutation({
    mutationFn: api.sendSMS,
  })
}

export function useSendEmail() {
  return useMutation({
    mutationFn: api.sendEmail,
  })
}

// =============================================================================
// PIPELINES
// =============================================================================

export function usePipelines(includeInactive = false) {
  return useQuery({
    queryKey: ['pipelines', { includeInactive }],
    queryFn: () => api.getPipelines(includeInactive),
    staleTime: 60000, // Pipelines don't change often
  })
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => api.getPipeline(id),
    enabled: !!id,
  })
}

export function useDefaultPipeline() {
  return useQuery({
    queryKey: ['pipelines', 'default'],
    queryFn: api.getDefaultPipeline,
    staleTime: 60000,
  })
}

export function useCreatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createPipeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.UpdatePipelineInput }) =>
      api.updatePipeline(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.id] })
    },
  })
}

export function useDeletePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deletePipeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useCreateStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pipelineId, data }: {
      pipelineId: string
      data: { name: string; key: string; description?: string; color?: string }
    }) => api.createStage(pipelineId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] })
    },
  })
}

export function useUpdateStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      data
    }: {
      pipelineId: string
      stageId: string
      data: api.UpdateStageInput
    }) => api.updateStage(pipelineId, stageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] })
    },
  })
}

export function useDeleteStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      api.deleteStage(pipelineId, stageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] })
    },
  })
}

export function useReorderStages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      pipelineId,
      stages
    }: {
      pipelineId: string
      stages: Array<{ stage_id: string; new_order: number }>
    }) => api.reorderStages(pipelineId, stages),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.pipelineId] })
    },
  })
}
