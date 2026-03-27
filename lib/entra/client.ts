'use client'

import { PublicClientApplication, type AuthenticationResult, type AccountInfo, type Configuration, type RedirectRequest } from '@azure/msal-browser'

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID?.trim() ?? ''
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID?.trim() ?? ''
const redirectUri = process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI?.trim()

export const isEntraConfigured = Boolean(clientId && tenantId)

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
const resolvedRedirectUri = redirectUri || `${origin}/login`

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: resolvedRedirectUri,
    postLogoutRedirectUri: `${origin}/login`,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const entraLoginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

let msalClient: PublicClientApplication | null = null
let initializePromise: Promise<PublicClientApplication | null> | null = null

export async function getEntraClient() {
  if (!isEntraConfigured) {
    return null
  }

  if (!initializePromise) {
    initializePromise = (async () => {
      if (!msalClient) {
        msalClient = new PublicClientApplication(msalConfig)
        await msalClient.initialize()
      }
      return msalClient
    })()
  }

  return initializePromise
}

export async function handleEntraRedirect(): Promise<AuthenticationResult | null> {
  const client = await getEntraClient()
  if (!client) return null

  const response = await client.handleRedirectPromise()
  if (response?.account) {
    client.setActiveAccount(response.account)
  }

  return response
}

export async function getEntraAccount(): Promise<AccountInfo | null> {
  const client = await getEntraClient()
  if (!client) return null

  const active = client.getActiveAccount()
  if (active) return active

  const first = client.getAllAccounts()[0] ?? null
  if (first) {
    client.setActiveAccount(first)
  }

  return first
}

export async function getEntraIdToken(): Promise<string | null> {
  const client = await getEntraClient()
  const account = await getEntraAccount()
  if (!client || !account) return null

  const result = await client.acquireTokenSilent({
    ...entraLoginRequest,
    account,
  })

  return result.idToken || null
}

export async function startEntraLogin() {
  const client = await getEntraClient()
  if (!client) {
    throw new Error('Entra ID ist nicht konfiguriert.')
  }

  await client.loginRedirect(entraLoginRequest)
}

export async function logoutEntra() {
  const client = await getEntraClient()
  if (!client) return

  const account = client.getActiveAccount() ?? client.getAllAccounts()[0]
  await client.logoutRedirect({
    account: account ?? undefined,
    postLogoutRedirectUri: `${window.location.origin}/login`,
  })
}
