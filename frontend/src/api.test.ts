import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

describe('consent API', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))

  it('sends the versioned consent with the session bearer token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'consent_recorded' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const result = await api.recordConsent('private-session-token', 'draft-v1')

    expect(fetch).toHaveBeenCalledWith('/api/session/consent', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ consented: true, consent_version: 'draft-v1' }),
      headers: expect.objectContaining({ Authorization: 'Bearer private-session-token' }),
    }))
    expect(result.consent_recorded).toBe(true)
  })
})
