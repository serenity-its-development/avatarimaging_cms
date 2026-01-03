/**
 * ResourceService - Business logic for resources
 */

import { D1ResourceRepository, ListResourcesParams, PaginatedResult } from '../repositories/ResourceRepository'
import type {
  Resource,
  ResourceType,
  ResourceSubtype,
  ResourceRole,
  ResourceWithType,
  ResourceWithRoles,
  CreateResourceInput,
  UpdateResourceInput
} from '../types/resources'

export interface ResourceServiceContext {
  tenant_id?: string
  user_id?: string
}

export class ResourceService {
  constructor(private repository: D1ResourceRepository) {}

  // =====================================================================
  // RESOURCE TYPES
  // =====================================================================

  async getResourceTypes(includeInactive = false): Promise<ResourceType[]> {
    return this.repository.getResourceTypes(includeInactive)
  }

  async getResourceType(id: string): Promise<ResourceType | null> {
    return this.repository.getResourceType(id)
  }

  async getResourceTypeByCode(code: string): Promise<ResourceType | null> {
    return this.repository.getResourceTypeByCode(code)
  }

  // =====================================================================
  // RESOURCE SUBTYPES
  // =====================================================================

  async getResourceSubtypes(resourceTypeId?: string, includeInactive = false): Promise<ResourceSubtype[]> {
    return this.repository.getResourceSubtypes(resourceTypeId, includeInactive)
  }

  async getResourceSubtype(id: string): Promise<ResourceSubtype | null> {
    return this.repository.getResourceSubtype(id)
  }

  // =====================================================================
  // RESOURCES
  // =====================================================================

  async createResource(data: CreateResourceInput, context: ResourceServiceContext): Promise<Resource> {
    // Validate type and subtype exist
    const type = await this.repository.getResourceType(data.resource_type_id)
    if (!type) {
      throw new Error(`Resource type not found: ${data.resource_type_id}`)
    }

    const subtype = await this.repository.getResourceSubtype(data.resource_subtype_id)
    if (!subtype) {
      throw new Error(`Resource subtype not found: ${data.resource_subtype_id}`)
    }

    // Validate subtype belongs to type
    if (subtype.resource_type_id !== data.resource_type_id) {
      throw new Error(`Subtype ${data.resource_subtype_id} does not belong to type ${data.resource_type_id}`)
    }

    // Validate parent resource if provided
    if (data.parent_resource_id) {
      const parent = await this.repository.getResource(data.parent_resource_id)
      if (!parent) {
        throw new Error(`Parent resource not found: ${data.parent_resource_id}`)
      }

      // Parent must be a place type
      const parentType = await this.repository.getResourceType(parent.resource_type_id)
      if (parentType?.code !== 'place') {
        throw new Error('Parent resource must be a place type')
      }

      // Cannot be parent of itself
      // (This check will be more relevant during updates)
    }

    // Validate stored_in resource if provided
    if (data.stored_in_resource_id) {
      const storedIn = await this.repository.getResource(data.stored_in_resource_id)
      if (!storedIn) {
        throw new Error(`Stored-in resource not found: ${data.stored_in_resource_id}`)
      }

      const storedInType = await this.repository.getResourceType(storedIn.resource_type_id)
      if (storedInType?.code !== 'place') {
        throw new Error('Stored-in resource must be a place type')
      }
    }

    // Validate roles if provided
    if (data.role_ids && data.role_ids.length > 0) {
      for (const roleId of data.role_ids) {
        const role = await this.repository.getRole(roleId)
        if (!role) {
          throw new Error(`Role not found: ${roleId}`)
        }

        // Role must be for this resource type
        if (role.resource_type_id !== data.resource_type_id) {
          throw new Error(`Role ${roleId} is not valid for resource type ${data.resource_type_id}`)
        }
      }
    }

    // Set tenant_id from context if not provided
    const inputWithTenant: CreateResourceInput = {
      ...data,
      tenant_id: data.tenant_id || context.tenant_id
    }

    return this.repository.createResource(inputWithTenant)
  }

  async updateResource(id: string, data: UpdateResourceInput, context: ResourceServiceContext): Promise<Resource> {
    const existing = await this.repository.getResource(id)
    if (!existing) {
      throw new Error(`Resource not found: ${id}`)
    }

    // Validate parent if changing
    if (data.parent_resource_id !== undefined && data.parent_resource_id !== null) {
      if (data.parent_resource_id === id) {
        throw new Error('Resource cannot be its own parent')
      }

      const parent = await this.repository.getResource(data.parent_resource_id)
      if (!parent) {
        throw new Error(`Parent resource not found: ${data.parent_resource_id}`)
      }

      const parentType = await this.repository.getResourceType(parent.resource_type_id)
      if (parentType?.code !== 'place') {
        throw new Error('Parent resource must be a place type')
      }

      // Check for circular references
      if (await this.isDescendant(data.parent_resource_id, id)) {
        throw new Error('Cannot create circular parent-child relationship')
      }
    }

    // Validate roles if changing
    if (data.role_ids !== undefined) {
      for (const roleId of data.role_ids) {
        const role = await this.repository.getRole(roleId)
        if (!role) {
          throw new Error(`Role not found: ${roleId}`)
        }

        if (role.resource_type_id !== existing.resource_type_id) {
          throw new Error(`Role ${roleId} is not valid for this resource type`)
        }
      }
    }

    return this.repository.updateResource(id, data)
  }

  async deleteResource(id: string, context: ResourceServiceContext): Promise<void> {
    const existing = await this.repository.getResource(id)
    if (!existing) {
      throw new Error(`Resource not found: ${id}`)
    }

    // Check for children
    const children = await this.repository.getChildResources(id)
    if (children.length > 0) {
      throw new Error('Cannot delete resource with children. Remove children first.')
    }

    // TODO: Check for active bookings/appointments using this resource

    return this.repository.deleteResource(id)
  }

  async getResource(id: string): Promise<Resource | null> {
    return this.repository.getResource(id)
  }

  async getResourceWithType(id: string): Promise<ResourceWithType | null> {
    return this.repository.getResourceWithType(id)
  }

  async getResourceWithRoles(id: string): Promise<ResourceWithRoles | null> {
    return this.repository.getResourceWithRoles(id)
  }

  async listResources(params: ListResourcesParams): Promise<PaginatedResult<Resource>> {
    return this.repository.listResources(params)
  }

  async getResourcesByType(typeCode: string, tenantId?: string): Promise<Resource[]> {
    return this.repository.getResourcesByType(typeCode, tenantId)
  }

  async getChildResources(parentId: string): Promise<Resource[]> {
    return this.repository.getChildResources(parentId)
  }

  async getResourceHierarchy(rootId: string): Promise<ResourceWithType & { children: any[] }> {
    const root = await this.repository.getResourceWithType(rootId)
    if (!root) {
      throw new Error(`Resource not found: ${rootId}`)
    }

    const children = await this.repository.getChildResources(rootId)
    const childrenWithHierarchy = await Promise.all(
      children.map(child => this.getResourceHierarchy(child.id))
    )

    return {
      ...root,
      children: childrenWithHierarchy
    }
  }

  // =====================================================================
  // ROLES
  // =====================================================================

  async getRoles(resourceTypeId?: string, includeInactive = false): Promise<ResourceRole[]> {
    return this.repository.getRoles(resourceTypeId, includeInactive)
  }

  async getRole(id: string): Promise<ResourceRole | null> {
    return this.repository.getRole(id)
  }

  async getRoleByCode(code: string): Promise<ResourceRole | null> {
    return this.repository.getRoleByCode(code)
  }

  async getResourcesForRole(roleId: string, tenantId?: string): Promise<Resource[]> {
    return this.repository.getResourcesForRole(roleId, tenantId)
  }

  async assignRole(resourceId: string, roleId: string, priority = 0): Promise<void> {
    const resource = await this.repository.getResource(resourceId)
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`)
    }

    const role = await this.repository.getRole(roleId)
    if (!role) {
      throw new Error(`Role not found: ${roleId}`)
    }

    if (role.resource_type_id !== resource.resource_type_id) {
      throw new Error('Role is not valid for this resource type')
    }

    await this.repository.assignRole(resourceId, roleId, priority)
  }

  async unassignRole(resourceId: string, roleId: string): Promise<void> {
    await this.repository.unassignRole(resourceId, roleId)
  }

  // =====================================================================
  // INVENTORY
  // =====================================================================

  async updateInventory(resourceId: string, quantityChange: number): Promise<number> {
    return this.repository.updateInventory(resourceId, quantityChange)
  }

  async getLowStockResources(tenantId?: string): Promise<Resource[]> {
    return this.repository.getLowStockResources(tenantId)
  }

  async checkInventoryForProcedure(procedureId: string, tenantId?: string): Promise<{
    sufficient: boolean
    warnings: string[]
  }> {
    // This will be implemented when we integrate with ProcedureService
    // For now, return default
    return { sufficient: true, warnings: [] }
  }

  // =====================================================================
  // HELPERS
  // =====================================================================

  private async isDescendant(potentialAncestorId: string, potentialDescendantId: string): Promise<boolean> {
    const children = await this.repository.getChildResources(potentialAncestorId)

    for (const child of children) {
      if (child.id === potentialDescendantId) {
        return true
      }

      if (await this.isDescendant(child.id, potentialDescendantId)) {
        return true
      }
    }

    return false
  }
}
