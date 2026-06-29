/**
 * Future: Cloud sync between devices (admin + daughter accounts).
 */
export interface SyncState {
  last_synced_at: string | null;
  device_id: string;
  pending_changes: number;
}

export interface CloudSyncConfig {
  enabled: boolean;
  provider: "none" | "icloud" | "custom";
}

export const DEFAULT_SYNC_CONFIG: CloudSyncConfig = {
  enabled: false,
  provider: "none",
};

/** Placeholder — not yet implemented */
export function cloudSyncEnabled(): boolean {
  return false;
}
