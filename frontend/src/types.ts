export type Method = 'J' | 'CH'
export type SessionStatus = 'created' | 'ready' | 'in_progress' | 'preference_recorded' | 'completed'

export interface Option { id: string; label: string }
export interface SafeTrial {
  position: number
  task_id: string
  method: Method
  question: string
  options: Option[]
  stimulus_url: string
  stimulus_filename?: string
  completed: boolean
  restart_count?: number
}
export interface StudySession {
  session_token: string
  status: SessionStatus
  assigned_version?: string
  completed_trials: number
  current_trial_position?: number
  trials?: SafeTrial[]
  participant_information_complete?: boolean
}
export interface ParticipantInformation {
  age: number
  gender: 'man' | 'woman' | 'another_gender' | 'prefer_not_to_say'
  cartographic_background: boolean
}
export interface TrialMetrics {
  selected_answer: string
  rt_selection_ms: number
  rt_submit_ms: number
  answer_changes: number
  zoom_used: boolean
  zoom_count: number
  zoom_duration_ms: number
  trial_restarted: boolean
  restart_count: number
  idempotency_key: string
  trial_started_at?: string
}
