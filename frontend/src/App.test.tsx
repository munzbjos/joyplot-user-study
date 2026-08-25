import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { api, ApiError } from './api'
import { storage } from './storage'

vi.mock('./api', () => {
  class TestApiError extends Error { constructor(message: string, readonly status?: number) { super(message) } }
  return {
    ApiError: TestApiError,
    api: {
      createSession: vi.fn(), recoverSession: vi.fn(), recordConsent: vi.fn(),
      saveParticipantInformation: vi.fn(), startMeasuredTest: vi.fn(), submitTrial: vi.fn(),
      submitPreference: vi.fn(), complete: vi.fn(), markTrialStarted: vi.fn(),
    },
  }
})

const created = { session_token: 'session-token', status: 'created' as const, completed_trials: 0 }

describe('versioned consent flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.createSession).mockResolvedValue(created)
  })

  it('waits for server acknowledgement before showing demographics and defaults to age 18', async () => {
    let acknowledge!: (value: Awaited<ReturnType<typeof api.recordConsent>>) => void
    vi.mocked(api.recordConsent).mockReturnValue(new Promise(resolve => { acknowledge = resolve }))
    render(<App />)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: /spatial data visualisation study/i })
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Saving consent…' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'Participant information' })).not.toBeInTheDocument()

    acknowledge({ ...created, status: 'consent_recorded', consent_recorded: true })
    expect(await screen.findByRole('heading', { name: 'Participant information' })).toBeInTheDocument()
    expect(screen.getByLabelText('What is your age?')).toHaveAttribute('min', '18')
    expect(api.recordConsent).toHaveBeenCalledWith('session-token', 'draft-v1')
  })

  it('recovers a recorded consent directly at demographics', async () => {
    storage.setSessionToken('existing-token')
    vi.mocked(api.recoverSession).mockResolvedValue({ ...created, session_token: 'existing-token', status: 'consent_recorded', consent_recorded: true })
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Participant information' })).toBeInTheDocument()
  })

  it('keeps the session token on a transient recovery error', async () => {
    storage.setSessionToken('existing-token')
    vi.mocked(api.recoverSession).mockRejectedValue(new ApiError('temporary', 503))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Unable to continue' })).toBeInTheDocument()
    expect(storage.getSessionToken()).toBe('existing-token')
    expect(api.createSession).not.toHaveBeenCalled()
    await waitFor(() => expect(api.recoverSession).toHaveBeenCalledWith('existing-token'))
  })
})
