import { describe, expect, it } from 'vitest'
import { storage } from './storage'

describe('local resilience storage', () => {
  it('retains a recoverable session token', () => {
    storage.setSessionToken('anonymous-token')
    expect(storage.getSessionToken()).toBe('anonymous-token')
  })
  it('retains an idempotent pending response', () => {
    const pending = { token: 'token', position: 2, metrics: { selected_answer: 'region_1', rt_selection_ms: 100, rt_submit_ms: 200, answer_changes: 0, zoom_used: false, zoom_count: 0, zoom_duration_ms: 0, max_zoom_pct: 100, trial_restarted: false, restart_count: 0, idempotency_key: 'key' } }
    storage.setPending(pending)
    expect(storage.getPending()).toEqual(pending)
    storage.clearPending()
    expect(storage.getPending()).toBeNull()
  })
  it('retains interrupted-trial restart state', () => {
    storage.setActive({ token: 'token', position: 3, restartCount: 2 })
    expect(storage.getActive()).toEqual({ token: 'token', position: 3, restartCount: 2 })
    storage.clearActive()
    expect(storage.getActive()).toBeNull()
  })
})
