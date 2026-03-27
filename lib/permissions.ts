const normalizeRole = (role?: string | null) => (role ?? '').trim().toLowerCase()

const hasAnyRole = (role: string | null | undefined, allowedRoles: string[]) =>
  allowedRoles.map(normalizeRole).includes(normalizeRole(role))

export const permissions = {
  canManagePortfolio: (role?: string | null) => hasAnyRole(role, ['admin', 'management', 'projektleiter', 'pmo']),
  canManageTeam: (role?: string | null) => hasAnyRole(role, ['admin', 'management', 'projektleiter', 'pmo']),
  canEditProject: (role?: string | null) => hasAnyRole(role, ['admin', 'management', 'projektleiter', 'pmo', 'product owner']),
  canManagePmo: (role?: string | null) => hasAnyRole(role, ['admin', 'management', 'projektleiter', 'pmo']),
  canDecideApproval: (role?: string | null) => hasAnyRole(role, ['admin', 'management', 'pmo']),
  canConfigureIntegrations: (role?: string | null) => hasAnyRole(role, ['admin', 'management', 'projektleiter', 'pmo']),
}

export const routePermissions = [
  { match: (pathname: string) => pathname === '/team', allowed: permissions.canManageTeam },
  { match: (pathname: string) => pathname === '/governance', allowed: permissions.canManagePmo },
  { match: (pathname: string) => pathname === '/settings', allowed: permissions.canConfigureIntegrations },
]

export const canAccessRoute = (pathname: string, role?: string | null) => {
  const rule = routePermissions.find(entry => entry.match(pathname))
  return rule ? rule.allowed(role) : true
}
