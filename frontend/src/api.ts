import type { ParticipantInformation, SafeTrial, StudySession, TrialMetrics } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message) }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new ApiError(`Request failed (${response.status})`, response.status)
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

function auth(token: string): HeadersInit { return { Authorization: `Bearer ${token}` } }
function normaliseTrials(trials: Array<SafeTrial & { stimulus_filename?: string }> | undefined): SafeTrial[] | undefined {
  return trials?.map(trial => ({
    ...trial,
    stimulus_url: trial.stimulus_url || `/stimuli/${encodeURIComponent(trial.stimulus_filename ?? '')}`,
    completed: trial.completed ?? false,
  }))
}

export const api = {
  createSession: (_sessionToken?: string) => request<StudySession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: innerWidth,
      viewport_height: innerHeight,
      device_pixel_ratio: devicePixelRatio,
    }),
  }),
  recoverSession: async (token: string) => ({ session_token: token, ...await request<Omit<StudySession, 'session_token'>>('/session', { headers: auth(token) }) }),
  saveParticipantInformation: (token: string, information: ParticipantInformation) =>
    request<{ status: StudySession['status'] }>('/session/demographics', {
      method: 'PUT', body: JSON.stringify(information), headers: auth(token),
    }).then(result => ({ session_token: token, assigned_version: undefined, completed_trials: 0, participant_information_complete: true, ...result })),
  startMeasuredTest: async (token: string) => {
    const current = await request<Omit<StudySession, 'session_token'>>('/session', { headers: auth(token) })
    const started = await request<Pick<StudySession, 'assigned_version'> & { trials: SafeTrial[] }>('/session/start', { method: 'POST', headers: auth(token) })
    return { ...current, ...started, session_token: token, status: 'in_progress' as const, trials: normaliseTrials(started.trials) }
  },
  markTrialStarted: async (_token: string, _position: number, _restarted: boolean) => undefined,
  submitTrial: async (token: string, position: number, metrics: TrialMetrics) => {
    const { idempotency_key: _key, ...body } = metrics
    await request<{ stored: boolean }>(`/trials/${position}/response`, { method: 'POST', body: JSON.stringify(body), headers: auth(token) })
    const current = await request<Omit<StudySession, 'session_token'>>('/session', { headers: auth(token) })
    if (current.completed_trials >= 6) return { ...current, session_token: token }
    const started = await request<{ assigned_version: string; trials: SafeTrial[] }>('/session/start', { method: 'POST', headers: auth(token) })
    return { ...current, ...started, session_token: token, trials: normaliseTrials(started.trials) }
  },
  submitPreference: (token: string, preference: string) =>
    request<{ stored: boolean }>('/session/preference', {
      method: 'POST', body: JSON.stringify({ preference }), headers: auth(token),
    }).then(() => ({ session_token: token, status: 'preference_recorded' as const, completed_trials: 6 })),
  complete: (token: string) => request<{ status: 'completed' }>('/session/complete', { method: 'POST', headers: auth(token) })
    .then(result => ({ session_token: token, completed_trials: 6, ...result })),
}
