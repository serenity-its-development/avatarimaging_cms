/**
 * ResourceRouter - API routing for resource booking system
 */

import type { D1Database } from '../types/env'
import { D1ResourceRepository } from '../repositories/ResourceRepository'
import { D1AvailabilityRepository } from '../repositories/AvailabilityRepository'
import { D1ProcedureRepository } from '../repositories/ProcedureRepository'
import { D1AppointmentRepository } from '../repositories/AppointmentRepository'
import { ResourceService } from '../services/ResourceService'
import { AvailabilityService } from '../services/AvailabilityService'
import { ProcedureService } from '../services/ProcedureService'
import { SlotGenerationService } from '../services/SlotGenerationService'
import { AppointmentBookingService } from '../services/AppointmentBookingService'

interface RouterContext {
  tenant_id: string
  user_id: string
}

export class ResourceRouter {
  private resourceService: ResourceService
  private availabilityService: AvailabilityService
  private procedureService: ProcedureService
  private slotGenerationService: SlotGenerationService
  private bookingService: AppointmentBookingService

  constructor(db: D1Database) {
    // Initialize repositories
    const resourceRepo = new D1ResourceRepository(db)
    const availabilityRepo = new D1AvailabilityRepository(db)
    const procedureRepo = new D1ProcedureRepository(db)
    const appointmentRepo = new D1AppointmentRepository(db)

    // Initialize services with dependencies
    this.resourceService = new ResourceService(resourceRepo)
    this.availabilityService = new AvailabilityService(availabilityRepo, resourceRepo, appointmentRepo)
    this.procedureService = new ProcedureService(procedureRepo, resourceRepo)
    this.slotGenerationService = new SlotGenerationService(
      procedureRepo,
      resourceRepo,
      appointmentRepo,
      this.availabilityService,
      this.procedureService
    )
    this.bookingService = new AppointmentBookingService(
      procedureRepo,
      resourceRepo,
      appointmentRepo,
      this.availabilityService,
      this.procedureService,
      this.slotGenerationService
    )
  }

  async handle(request: Request, path: string, method: string): Promise<Response | null> {
    const context = this.getContext(request)

    // Resource Types
    if (path === '/api/resources/types' && method === 'GET') {
      return this.handleGetResourceTypes()
    }

    // Resource Subtypes
    if (path === '/api/resources/subtypes' && method === 'GET') {
      const url = new URL(request.url)
      const typeId = url.searchParams.get('type_id') || undefined
      return this.handleGetResourceSubtypes(typeId)
    }

    // Resources
    if (path === '/api/resources' && method === 'GET') {
      const url = new URL(request.url)
      return this.handleListResources(url, context)
    }

    if (path === '/api/resources' && method === 'POST') {
      const data = await request.json()
      return this.handleCreateResource(data, context)
    }

    if (path.match(/^\/api\/resources\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      return this.handleGetResource(id)
    }

    if (path.match(/^\/api\/resources\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      return this.handleUpdateResource(id, data, context)
    }

    if (path.match(/^\/api\/resources\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      return this.handleDeleteResource(id, context)
    }

    if (path.match(/^\/api\/resources\/[^\/]+\/children$/) && method === 'GET') {
      const id = path.split('/')[3]
      return this.handleGetChildResources(id)
    }

    if (path.match(/^\/api\/resources\/[^\/]+\/hierarchy$/) && method === 'GET') {
      const id = path.split('/')[3]
      return this.handleGetResourceHierarchy(id)
    }

    // Roles
    if (path === '/api/resources/roles' && method === 'GET') {
      const url = new URL(request.url)
      const typeId = url.searchParams.get('type_id') || undefined
      return this.handleGetRoles(typeId)
    }

    if (path.match(/^\/api\/resources\/roles\/[^\/]+\/resources$/) && method === 'GET') {
      const roleId = path.split('/')[4]
      return this.handleGetResourcesForRole(roleId, context)
    }

    // Availability
    if (path === '/api/availability' && method === 'GET') {
      const url = new URL(request.url)
      const resourceId = url.searchParams.get('resource_id')
      const startTime = parseInt(url.searchParams.get('start_time') || '0')
      const endTime = parseInt(url.searchParams.get('end_time') || Date.now().toString())

      if (!resourceId) {
        return this.errorResponse('resource_id required', 400)
      }

      return this.handleGetAvailability(resourceId, startTime, endTime)
    }

    if (path === '/api/availability' && method === 'POST') {
      const data = await request.json()
      return this.handleCreateAvailability(data, context)
    }

    if (path.match(/^\/api\/availability\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      return this.handleUpdateAvailability(id, data, context)
    }

    if (path.match(/^\/api\/availability\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      return this.handleDeleteAvailability(id, context)
    }

    if (path === '/api/availability/check' && method === 'POST') {
      const data = await request.json()
      return this.handleCheckAvailability(data)
    }

    // Procedures
    if (path === '/api/procedures' && method === 'GET') {
      const url = new URL(request.url)
      return this.handleListProcedures(url, context)
    }

    if (path === '/api/procedures' && method === 'POST') {
      const data = await request.json()
      return this.handleCreateProcedure(data, context)
    }

    if (path.match(/^\/api\/procedures\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      return this.handleGetProcedure(id)
    }

    if (path.match(/^\/api\/procedures\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      return this.handleUpdateProcedure(id, data, context)
    }

    if (path.match(/^\/api\/procedures\/[^\/]+\/requirements$/) && method === 'GET') {
      const id = path.split('/')[3]
      return this.handleGetRequirements(id, context)
    }

    if (path.match(/^\/api\/procedures\/[^\/]+\/requirements$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      return this.handleAddRequirement(id, data, context)
    }

    // Slots
    if (path === '/api/slots' && method === 'GET') {
      const url = new URL(request.url)
      return this.handleListSlots(url, context)
    }

    if (path === '/api/slots/generate' && method === 'POST') {
      const data = await request.json()
      return this.handleGenerateSlots(data, context)
    }

    if (path.match(/^\/api\/slots\/[^\/]+\/validate$/) && method === 'GET') {
      const id = path.split('/')[3]
      return this.handleValidateSlot(id)
    }

    // Appointments
    if (path === '/api/appointments' && method === 'GET') {
      const url = new URL(request.url)
      return this.handleListAppointments(url, context)
    }

    if (path === '/api/appointments' && method === 'POST') {
      const data = await request.json()
      return this.handleBook(data, context)
    }

    if (path.match(/^\/api\/appointments\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      return this.handleGetAppointment(id)
    }

    if (path.match(/^\/api\/appointments\/[^\/]+\/cancel$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      return this.handleCancelAppointment(id, data.reason, context)
    }

    if (path.match(/^\/api\/appointments\/[^\/]+\/complete$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      return this.handleCompleteAppointment(id, data.notes, context)
    }

    if (path.match(/^\/api\/appointments\/[^\/]+\/no-show$/) && method === 'POST') {
      const id = path.split('/')[3]
      return this.handleNoShowAppointment(id, context)
    }

    if (path.match(/^\/api\/appointments\/[^\/]+\/reschedule$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      return this.handleRescheduleAppointment(id, data.new_slot_id, context)
    }

    // Inventory
    if (path === '/api/inventory/low-stock' && method === 'GET') {
      return this.handleGetLowStock(context)
    }

    // Not handled by this router
    return null
  }

  // =====================================================================
  // HANDLERS
  // =====================================================================

  private async handleGetResourceTypes(): Promise<Response> {
    const types = await this.resourceService.getResourceTypes()
    return this.jsonResponse(types)
  }

  private async handleGetResourceSubtypes(typeId?: string): Promise<Response> {
    const subtypes = await this.resourceService.getResourceSubtypes(typeId)
    return this.jsonResponse(subtypes)
  }

  private async handleListResources(url: URL, context: RouterContext): Promise<Response> {
    const params = {
      tenant_id: url.searchParams.get('tenant_id') || context.tenant_id,
      resource_type_id: url.searchParams.get('type_id') || undefined,
      resource_subtype_id: url.searchParams.get('subtype_id') || undefined,
      parent_resource_id: url.searchParams.get('parent_id') || undefined,
      is_active: url.searchParams.get('is_active') !== 'false',
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    }
    const result = await this.resourceService.listResources(params)
    return this.jsonResponse(result)
  }

  private async handleCreateResource(data: any, context: RouterContext): Promise<Response> {
    try {
      const resource = await this.resourceService.createResource(data, context)
      return this.jsonResponse(resource, 201)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to create resource', 400)
    }
  }

  private async handleGetResource(id: string): Promise<Response> {
    const resource = await this.resourceService.getResourceWithRoles(id)
    if (!resource) {
      return this.errorResponse('Resource not found', 404)
    }
    return this.jsonResponse(resource)
  }

  private async handleUpdateResource(id: string, data: any, context: RouterContext): Promise<Response> {
    try {
      const resource = await this.resourceService.updateResource(id, data, context)
      return this.jsonResponse(resource)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to update resource', 400)
    }
  }

  private async handleDeleteResource(id: string, context: RouterContext): Promise<Response> {
    try {
      await this.resourceService.deleteResource(id, context)
      return this.jsonResponse({ success: true })
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to delete resource', 400)
    }
  }

  private async handleGetChildResources(id: string): Promise<Response> {
    const children = await this.resourceService.getChildResources(id)
    return this.jsonResponse(children)
  }

  private async handleGetResourceHierarchy(id: string): Promise<Response> {
    try {
      const hierarchy = await this.resourceService.getResourceHierarchy(id)
      return this.jsonResponse(hierarchy)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Resource not found', 404)
    }
  }

  private async handleGetRoles(typeId?: string): Promise<Response> {
    const roles = await this.resourceService.getRoles(typeId)
    return this.jsonResponse(roles)
  }

  private async handleGetResourcesForRole(roleId: string, context: RouterContext): Promise<Response> {
    const resources = await this.resourceService.getResourcesForRole(roleId, context.tenant_id)
    return this.jsonResponse(resources)
  }

  private async handleGetAvailability(resourceId: string, startTime: number, endTime: number): Promise<Response> {
    const availability = await this.availabilityService.getAvailabilityForResource(resourceId, startTime, endTime)
    return this.jsonResponse(availability)
  }

  private async handleCreateAvailability(data: any, context: RouterContext): Promise<Response> {
    try {
      const availability = await this.availabilityService.createAvailability(data, context)
      return this.jsonResponse(availability, 201)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to create availability', 400)
    }
  }

  private async handleUpdateAvailability(id: string, data: any, context: RouterContext): Promise<Response> {
    try {
      const availability = await this.availabilityService.updateAvailability(id, data, context)
      return this.jsonResponse(availability)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to update availability', 400)
    }
  }

  private async handleDeleteAvailability(id: string, context: RouterContext): Promise<Response> {
    try {
      await this.availabilityService.deleteAvailability(id, context)
      return this.jsonResponse({ success: true })
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to delete availability', 400)
    }
  }

  private async handleCheckAvailability(data: { resource_id: string; start_time: number; end_time: number }): Promise<Response> {
    try {
      const check = await this.availabilityService.checkResourceAvailability(
        data.resource_id,
        data.start_time,
        data.end_time
      )
      return this.jsonResponse(check)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to check availability', 400)
    }
  }

  private async handleListProcedures(url: URL, context: RouterContext): Promise<Response> {
    const params = {
      tenant_id: context.tenant_id,
      procedure_type: url.searchParams.get('type') as 'atomic' | 'composite' | undefined,
      is_active: url.searchParams.get('is_active') !== 'false'
    }
    const procedures = await this.procedureService.listProcedures(params)
    return this.jsonResponse(procedures)
  }

  private async handleCreateProcedure(data: any, context: RouterContext): Promise<Response> {
    try {
      const procedure = await this.procedureService.createProcedure(data, context)
      return this.jsonResponse(procedure, 201)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to create procedure', 400)
    }
  }

  private async handleGetProcedure(id: string): Promise<Response> {
    const procedure = await this.procedureService.getProcedureWithDetails(id)
    if (!procedure) {
      return this.errorResponse('Procedure not found', 404)
    }
    return this.jsonResponse(procedure)
  }

  private async handleUpdateProcedure(id: string, data: any, context: RouterContext): Promise<Response> {
    try {
      const procedure = await this.procedureService.updateProcedure(id, data, context)
      return this.jsonResponse(procedure)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to update procedure', 400)
    }
  }

  private async handleGetRequirements(procedureId: string, context: RouterContext): Promise<Response> {
    const requirements = await this.procedureService.getExpandedRequirements(procedureId, context.tenant_id)
    return this.jsonResponse(requirements)
  }

  private async handleAddRequirement(procedureId: string, data: any, context: RouterContext): Promise<Response> {
    try {
      const requirement = await this.procedureService.addRequirement(procedureId, data, context)
      return this.jsonResponse(requirement, 201)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to add requirement', 400)
    }
  }

  private async handleListSlots(url: URL, context: RouterContext): Promise<Response> {
    const procedureId = url.searchParams.get('procedure_id')
    const startTime = parseInt(url.searchParams.get('start_time') || Date.now().toString())
    const endTime = parseInt(url.searchParams.get('end_time') || (Date.now() + 7 * 24 * 60 * 60 * 1000).toString())

    const slots = await this.slotGenerationService.generateSlots({
      procedure_id: procedureId || '',
      start_date: startTime,
      end_date: endTime,
      tenant_id: context.tenant_id
    }, context)

    return this.jsonResponse(slots)
  }

  private async handleGenerateSlots(data: any, context: RouterContext): Promise<Response> {
    try {
      const slots = await this.slotGenerationService.createSlotsInRange({
        procedure_id: data.procedure_id,
        start_date: data.start_date,
        end_date: data.end_date,
        tenant_id: context.tenant_id,
        location_resource_id: data.location_resource_id,
        slot_interval_minutes: data.slot_interval_minutes
      }, context)
      return this.jsonResponse({ created: slots.length, slots }, 201)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to generate slots', 400)
    }
  }

  private async handleValidateSlot(id: string): Promise<Response> {
    const validation = await this.slotGenerationService.validateSlot(id)
    return this.jsonResponse(validation)
  }

  private async handleListAppointments(url: URL, context: RouterContext): Promise<Response> {
    const contactId = url.searchParams.get('contact_id') || undefined
    const status = url.searchParams.get('status') as any || undefined
    const startTime = url.searchParams.get('start_time') ? parseInt(url.searchParams.get('start_time')!) : undefined
    const endTime = url.searchParams.get('end_time') ? parseInt(url.searchParams.get('end_time')!) : undefined

    // Note: Would need to implement in AppointmentRepository
    return this.jsonResponse({ message: 'List appointments - implement based on needs' })
  }

  private async handleBook(data: any, context: RouterContext): Promise<Response> {
    try {
      const result = await this.bookingService.book({
        procedure_id: data.procedure_id,
        slot_id: data.slot_id,
        start_time: data.start_time,
        contact_id: data.contact_id,
        preferences: data.preferences,
        notes: data.notes
      }, context)

      if (result.success) {
        return this.jsonResponse(result, 201)
      } else {
        return this.jsonResponse(result, 409)
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to book appointment', 400)
    }
  }

  private async handleGetAppointment(id: string): Promise<Response> {
    // Would need AppointmentRepository.getAppointmentWithDetails
    return this.jsonResponse({ message: 'Get appointment - implement' })
  }

  private async handleCancelAppointment(id: string, reason: string, context: RouterContext): Promise<Response> {
    try {
      const appointment = await this.bookingService.cancel(id, reason, context)
      return this.jsonResponse(appointment)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to cancel appointment', 400)
    }
  }

  private async handleCompleteAppointment(id: string, notes: string, context: RouterContext): Promise<Response> {
    try {
      const appointment = await this.bookingService.complete(id, notes, context)
      return this.jsonResponse(appointment)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to complete appointment', 400)
    }
  }

  private async handleNoShowAppointment(id: string, context: RouterContext): Promise<Response> {
    try {
      const appointment = await this.bookingService.markNoShow(id, context)
      return this.jsonResponse(appointment)
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to mark no-show', 400)
    }
  }

  private async handleRescheduleAppointment(id: string, newSlotId: string, context: RouterContext): Promise<Response> {
    try {
      const result = await this.bookingService.reschedule(id, newSlotId, context)
      if (result.success) {
        return this.jsonResponse(result)
      } else {
        return this.jsonResponse(result, 409)
      }
    } catch (error) {
      return this.errorResponse(error instanceof Error ? error.message : 'Failed to reschedule', 400)
    }
  }

  private async handleGetLowStock(context: RouterContext): Promise<Response> {
    const resources = await this.resourceService.getLowStockResources(context.tenant_id)
    return this.jsonResponse(resources)
  }

  // =====================================================================
  // HELPERS
  // =====================================================================

  private getContext(request: Request): RouterContext {
    // TODO: Extract from auth headers
    return {
      tenant_id: 'location_avatar_sydney',
      user_id: 'system'
    }
  }

  private jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  private errorResponse(message: string, status: number): Response {
    return this.jsonResponse({ error: message }, status)
  }
}
