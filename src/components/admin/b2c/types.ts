export type TabKey = "sorting" | "manifest" | "history";

export interface TabProps {
  /** Interval auto-refresh (ms). 0 = mati. */
  pollMs: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ---------- History ----------
export type HistoryStatus = "DONE" | "CANCELLED" | "NOT_FOUND";

export interface HistoryLog {
  id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  handover_at: string;
  handover_by: string | null;
  status: HistoryStatus;
  is_instant: boolean;
  location_code: string | null;
}

export interface HistoryStats {
  total: number;
  done: number;
  cancelled: number;
  not_found: number;
  instant: number;
  regular: number;
}

// ---------- Manifest ----------
export interface Manifest {
  id: string;
  session_code: string;
  transporter_name: string | null;
  courier_name: string | null;
  security_name: string | null;
  total_packages_handed: number;
  total_discrepancy: number;
  signed_at: string;
}

// ---------- Sorting ----------
export type SessionStatus = "RUNNING" | "CLOSED";

export interface SortingDetail {
  id: string;
  barcode_resi: string;
  scanned_at: string;
  is_validated_handover: boolean;
  discrepancy_reason: string | null;
  validated_at: string | null;
  session_code: string;
  session_status: SessionStatus;
  transporter_name: string;
  source_type: "sorting" | "instant";
  instant_status?: "STORED" | "PICKED" | null;
  sorting_by_name?: string | null;
}

export interface SortingStats {
  total: number;
  handed_over: number;
  pending: number;
  discrepancy: number;
  in_running_session: number;
}