export type IntegrationStatus =
  | 'not-configured'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unsupported'
  | 'error';

export interface IntegrationHealth {
  providerId: string;
  status: IntegrationStatus;
  message?: string;
  updatedAt: number;
}

/**
 * UI-facing integration state. Never expose access tokens or provider secrets
 * through this object.
 */
export function createIntegrationHealth(
  providerId: string,
  status: IntegrationHealth['status'],
  message?: string,
): IntegrationHealth {
  return { providerId, status, message, updatedAt: Date.now() };
}
