import { auditAPI, AuditLog } from "./api";
export type { AuditLog };

// NOTE: The `logAction()` function has been completely removed.
// Audit logging is now a side-effect handled automatically by the backend controllers.
// The frontend no longer manually dispatches audit logs.
// This file is now read-only for fetching audit logs in the admin dashboard.

export async function getAuditLogs(params?: Record<string, unknown>): Promise<AuditLog[]> {
  const res = await auditAPI.list(params);
  return res.data.data.map(log => ({
    ...log,
    id: log._id || log.targetId, // ensure id exists for UI components relying on it
  }));
}
