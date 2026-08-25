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
    await screen.findByRole('heading', { name: /visualisation of spatial data: user.study/i })
    expect(screen.queryByRole('heading', { name: 'What data will be collected?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Risks and benefits' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ethics / data protection information' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Saving consent…' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'About You' })).not.toBeInTheDocument()

    acknowledge({ ...created, status: 'consent_recorded', consent_recorded: true })
    expect(await screen.findByRole('heading', { name: 'About You' })).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toHaveAttribute('min', '18')
    await user.type(screen.getByLabelText('Age'), '17')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(api.recordConsent).toHaveBeenCalledWith('session-token', '1.0')
  })

  it('recovers a recorded consent directly at demographics', async () => {
    storage.setSessionToken('existing-token')
    vi.mocked(api.recoverSession).mockResolvedValue({ ...created, session_token: 'existing-token', status: 'consent_recorded', consent_recorded: true })
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'About You' })).toBeInTheDocument()
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

  it('shows the approved accessible researcher links after completion', async () => {
    storage.setSessionToken('completed-token')
    vi.mocked(api.recoverSession).mockResolvedValue({ session_token: 'completed-token', status: 'completed', completed_trials: 6 })
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Thank You!' })).toBeInTheDocument()
    expect(screen.queryByText(/OPTIONAL FINAL CONTACT/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Josef Münzberger on LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/josef-m%C3%BCnzberger-a71a29204/')
    expect(screen.getByRole('link', { name: 'Email Josef Münzberger' })).toHaveAttribute('href', 'mailto:josef.munzberger@fsv.cvut.cz')
    expect(screen.getByRole('link', { name: 'Bivariate Joy Plot article' })).toHaveAttribute('href', 'https://doi.org/10.1080/00087041.2026.2715285')
  })
})
