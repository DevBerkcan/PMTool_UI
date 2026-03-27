'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { permissions } from '@/lib/permissions'
import { useAuthStore } from '@/lib/store/authStore'

const fallbackByPermission: Record<string, (role?: string | null) => boolean> = {
  managePortfolio: permissions.canManagePortfolio,
  manageTeam: permissions.canManageTeam,
  editProject: permissions.canEditProject,
  managePmo: permissions.canManagePmo,
  decideApproval: permissions.canDecideApproval,
  configureIntegrations: permissions.canConfigureIntegrations,
}

export function useAccessMatrix() {
  const userRole = useAuthStore(state => state.user?.role)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const query = useQuery({
    queryKey: ['access-matrix'],
    queryFn: () => api.auth.getAccessMatrix(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })

  const can = (permission: keyof typeof fallbackByPermission) =>
    query.data?.permissions?.[permission] ?? fallbackByPermission[permission]?.(userRole) ?? false

  return {
    ...query,
    currentRole: query.data?.currentRole ?? userRole ?? '',
    availableRoles: query.data?.availableRoles ?? [],
    can,
  }
}
