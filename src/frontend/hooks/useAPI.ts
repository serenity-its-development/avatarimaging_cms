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

export function useContactTasks(contactId: string) {
  return useQuery({
    queryKey: ['tasks', 'contact', contactId],
    queryFn: () => api.getContactTasks(contactId),
    enabled: !!contactId,
    staleTime: 10000,
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

// =============================================================================
// TAGS
// =============================================================================

export function useTags(category?: string, includeInactive = false) {
  return useQuery({
    queryKey: ['tags', { category, includeInactive }],
    queryFn: () => api.getTags(category, includeInactive),
    staleTime: 60000, // Tags don't change often
  })
}

export function useTag(id: string) {
  return useQuery({
    queryKey: ['tags', id],
    queryFn: () => api.getTag(id),
    enabled: !!id,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.UpdateTagInput }) =>
      api.updateTag(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['tags', variables.id] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useContactTags(contactId: string) {
  return useQuery({
    queryKey: ['tags', 'contact', contactId],
    queryFn: () => api.getContactTags(contactId),
    enabled: !!contactId,
  })
}

export function useAddTagToContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, tagId, addedBy }: { contactId: string; tagId: string; addedBy?: string }) =>
      api.addTagToContact(contactId, tagId, addedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'contact', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useRemoveTagFromContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: string; tagId: string }) =>
      api.removeTagFromContact(contactId, tagId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'contact', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useSuggestTags() {
  return useMutation({
    mutationFn: api.suggestTags,
  })
}

export function useAutoTagContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, contactData, minConfidence }: {
      contactId: string
      contactData: any
      minConfidence?: number
    }) => api.autoTagContact(contactId, contactData, minConfidence),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'contact', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// =============================================================================
// STAFF & ROLES
// =============================================================================

// Roles
export function useRoles(includeInactive = false) {
  return useQuery({
    queryKey: ['roles', includeInactive],
    queryFn: () => api.getRoles(includeInactive),
    staleTime: 60000, // Roles don't change often
  })
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => api.getRole(id),
    enabled: !!id,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.UpdateRoleInput }) =>
      api.updateRole(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}

// Staff
export function useStaff(options?: Parameters<typeof api.getStaff>[0]) {
  return useQuery({
    queryKey: ['staff', options],
    queryFn: () => api.getStaff(options),
    staleTime: 30000,
  })
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaffMember(id),
    enabled: !!id,
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.UpdateStaffInput }) =>
      api.updateStaff(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

// Staff Assignments
export function useContactStaffAssignments(contactId: string) {
  return useQuery({
    queryKey: ['staff', 'assignments', 'contact', contactId],
    queryFn: () => api.getContactStaffAssignments(contactId),
    enabled: !!contactId,
    staleTime: 10000,
  })
}

export function useStaffAssignments(staffId: string) {
  return useQuery({
    queryKey: ['staff', 'assignments', 'staff', staffId],
    queryFn: () => api.getStaffAssignments(staffId),
    enabled: !!staffId,
    staleTime: 10000,
  })
}

export function useAssignStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.assignStaff,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'assignments', 'contact', variables.contact_id] })
      queryClient.invalidateQueries({ queryKey: ['staff', 'assignments', 'staff', variables.staff_id] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useUnassignStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, staffId }: { contactId: string; staffId: string }) =>
      api.unassignStaff(contactId, staffId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'assignments', 'contact', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['staff', 'assignments', 'staff', variables.staffId] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

// AI Staff Suggestions
export function useSuggestStaff() {
  return useMutation({
    mutationFn: ({ contactData, assignmentType }: {
      contactData: Parameters<typeof api.suggestStaff>[0]
      assignmentType?: Parameters<typeof api.suggestStaff>[1]
    }) => api.suggestStaff(contactData, assignmentType),
  })
}

// =============================================================================
// TEMPLATES
// =============================================================================

export function useTemplates(filters?: Parameters<typeof api.getTemplates>[0]) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => api.getTemplates(filters),
    staleTime: 30000,
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => api.getTemplate(id),
    enabled: !!id,
  })
}

export function useDefaultTemplate(category: string) {
  return useQuery({
    queryKey: ['templates', 'default', category],
    queryFn: () => api.getDefaultTemplate(category),
    enabled: !!category,
  })
}

export function useQuickActionTemplates(category?: string) {
  return useQuery({
    queryKey: ['templates', 'quick-actions', category],
    queryFn: () => api.getQuickActionTemplates(category),
    staleTime: 60000,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.UpdateTemplateInput }) =>
      api.updateTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates', variables.id] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useRenderTemplate() {
  return useMutation({
    mutationFn: ({ templateId, variables }: { templateId: string; variables: Record<string, string> }) =>
      api.renderTemplate(templateId, variables),
  })
}

export function useExecuteAITemplate() {
  return useMutation({
    mutationFn: ({ templateId, variables }: { templateId: string; variables: Record<string, string> }) =>
      api.executeAITemplate(templateId, variables),
  })
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, newName }: { templateId: string; newName: string }) =>
      api.duplicateTemplate(templateId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

// =============================================================================
// BOOKING DRAFTS (AI Assistant)
// =============================================================================

export function useBookingDrafts() {
  return useQuery({
    queryKey: ['booking-drafts'],
    queryFn: api.getBookingDrafts,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  })
}

export function useApproveDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.approveDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-drafts'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useRejectDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ draftId, notes }: { draftId: string; notes?: string }) =>
      api.rejectDraft(draftId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-drafts'] })
    },
  })
}

// =============================================================================
// USER PREFERENCES
// =============================================================================

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: api.getPreferences,
    staleTime: 300000, // 5 minutes - preferences don't change often
  })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data)
    },
  })
}

export function useResetPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.resetPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data)
    },
  })
}

export function usePreferenceHistory() {
  return useQuery({
    queryKey: ['preferences', 'history'],
    queryFn: api.getPreferenceHistory,
  })
}
