import type { TrialMetrics } from './types'

const SESSION_KEY = 'joyplot-study-session'
const PENDING_KEY = 'joyplot-study-pending-response'
const ACTIVE_KEY = 'joyplot-study-active-trial'

export interface PendingResponse { token: string; position: number; metrics: TrialMetrics }
export interface ActiveTrial { token: string; position: number; restartCount: number }
export const storage = {
  getSessionToken: () => localStorage.getItem(SESSION_KEY),
  setSessionToken: (token: string) => localStorage.setItem(SESSION_KEY, token),
  clearSessionToken: () => localStorage.removeItem(SESSION_KEY),
  getPending: (): PendingResponse | null => {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as PendingResponse | null }
    catch { localStorage.removeItem(PENDING_KEY); return null }
  },
  setPending: (pending: PendingResponse) => localStorage.setItem(PENDING_KEY, JSON.stringify(pending)),
  clearPending: () => localStorage.removeItem(PENDING_KEY),
  getActive: (): ActiveTrial | null => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) ?? 'null') as ActiveTrial | null }
    catch { localStorage.removeItem(ACTIVE_KEY); return null }
  },
  setActive: (active: ActiveTrial) => localStorage.setItem(ACTIVE_KEY, JSON.stringify(active)),
  clearActive: () => localStorage.removeItem(ACTIVE_KEY),
}
