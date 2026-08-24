import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'
import { uiConfig } from './config'
import { storage } from './storage'
import { afterVisiblePaint, preloadAndDecode } from './timing'
import type { ParticipantInformation, SafeTrial, StudySession, TrialMetrics } from './types'

type View = 'loading' | 'welcome' | 'demographics' | 'instructions' | 'training' | 'ready' |
  'preloading' | 'countdown' | 'trial' | 'preference' | 'thank-you' | 'resume' | 'error'

function initialView(session: StudySession): View {
  if (session.status === 'completed') return 'thank-you'
  if (session.assigned_version || session.status === 'in_progress' || session.status === 'preference_recorded') return 'resume'
  if (session.participant_information_complete || session.status === 'ready') return 'instructions'
  return 'welcome'
}

function DesktopGate({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (width < uiConfig.minimumViewportWidth) return (
    <main className="shell gate" role="alert">
      <h1>A larger screen is required</h1>
      <p>This study requires a desktop or laptop computer with a larger screen.</p>
      <p>Your progress is saved. You may continue on a suitable device.</p>
    </main>
  )
  return <>{children}</>
}

export function App() {
  const [view, setView] = useState<View>('loading')
  const [session, setSession] = useState<StudySession | null>(null)
  const [message, setMessage] = useState('')
  const [trainingIndex, setTrainingIndex] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [recoveredTrial, setRecoveredTrial] = useState(0)

  useEffect(() => {
    let active = true
    const initialise = async () => {
      try {
        const token = storage.getSessionToken()
        let result: StudySession
        if (token) {
          try { result = await api.recoverSession(token) }
          catch (error) {
            if (!(error instanceof ApiError && error.status === 401)) throw error
            storage.clearSessionToken(); result = await api.createSession()
          }
        } else result = await api.createSession()
        if (!active) return
        storage.setSessionToken(result.session_token)
        setSession(result)
        setView(initialView(result))
      } catch {
        if (active) { setMessage('The study could not connect to the server. Please try again.'); setView('error') }
      }
    }
    void initialise()
    return () => { active = false }
  }, [])

  const startLoadedSession = useCallback(async (source: StudySession, interrupted: boolean) => {
    if (source.status === 'preference_recorded' || source.completed_trials >= 6) { setView('preference'); return }
    if (!source.trials?.length) {
      setMessage('The assigned trials could not be recovered. Please retry.')
      setView('error')
      return
    }
    const nextPosition = source.current_trial_position ?? source.completed_trials + 1
    const active = storage.getActive()
    const restartCount = interrupted ? (active?.token === source.session_token && active.position === nextPosition ? active.restartCount + 1 : 1) : 0
    setRecoveredTrial(restartCount)
    setView('preloading')
    try {
      await preloadAndDecode(source.trials.map(trial => trial.stimulus_url))
      const pending = storage.getPending()
      if (pending?.token === source.session_token) {
        const acknowledged = await api.submitTrial(pending.token, pending.position, pending.metrics)
        storage.clearPending(); storage.clearActive()
        setSession(acknowledged)
        if (acknowledged.completed_trials >= 6) { setView('preference'); return }
      }
      if (source.completed_trials === 0 && !interrupted) { setCountdown(3); setView('countdown') }
      else setView('trial')
    } catch {
      setMessage('The stimuli could not be prepared. Check your connection and retry; timing has not started.')
      setView('error')
    }
  }, [])

  const beginMeasured = async () => {
    if (!session) return
    setView('preloading')
    try {
      const started = await api.startMeasuredTest(session.session_token)
      setSession(started)
      await startLoadedSession(started, false)
    } catch {
      setMessage('The measured test could not be started. No trial timing has begun.')
      setView('error')
    }
  }

  useEffect(() => {
    if (view !== 'countdown') return
    const timer = window.setTimeout(() => {
      if (countdown === 1) setView('trial')
      else setCountdown(value => value - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, view])

  if (!session && view !== 'error') return <main className="shell"><p>Preparing study…</p></main>

  return <DesktopGate><main className={`shell ${view === 'trial' ? 'trial-shell' : ''}`}>
    {view === 'loading' && <p>Preparing study…</p>}
    {view === 'welcome' && <Welcome onContinue={() => setView('demographics')} />}
    {view === 'demographics' && <Demographics onSave={async information => {
      const updated = await api.saveParticipantInformation(session!.session_token, information)
      setSession(updated); setView('instructions')
    }} />}
    {view === 'instructions' && <Instructions onContinue={() => { setTrainingIndex(0); setView('training') }} />}
    {view === 'training' && <Training index={trainingIndex} onContinue={() => {
      if (trainingIndex === uiConfig.training.length - 1) setView('ready')
      else setTrainingIndex(value => value + 1)
    }} />}
    {view === 'ready' && <Ready onStart={() => void beginMeasured()} />}
    {view === 'preloading' && <Status title="Preparing test…" text="Downloading and decoding all six stimuli. Timing has not started." />}
    {view === 'countdown' && <section className="countdown" aria-live="assertive"><span>{countdown}</span></section>}
    {view === 'trial' && session && <TrialScreen
      key={`${session.session_token}-${session.current_trial_position ?? session.completed_trials + 1}`}
      session={session}
      recovered={recoveredTrial}
      onAcknowledged={updated => {
        setRecoveredTrial(0); setSession(updated)
        setView(updated.completed_trials >= 6 ? 'preference' : 'trial')
      }}
    />}
    {view === 'preference' && session && <Preference onSubmit={async preference => {
      const saved = await api.submitPreference(session.session_token, preference)
      const completed = await api.complete(session.session_token)
      setSession({ ...saved, ...completed }); setView('thank-you')
    }} />}
    {view === 'thank-you' && <Status title="Thank you" text={uiConfig.finalText} />}
    {view === 'resume' && session && <Resume session={session}
      onResume={() => void (async () => {
        try {
          if (session.status === 'preference_recorded') {
            const completed = await api.complete(session.session_token)
            setSession({ ...session, ...completed }); setView('thank-you'); return
          }
          const recovered = await api.startMeasuredTest(session.session_token)
          setSession(recovered)
          await startLoadedSession(recovered, session.status === 'in_progress' && session.completed_trials < 6)
        } catch { setMessage('The saved session could not be recovered. Please retry.'); setView('error') }
      })()} />}
    {view === 'error' && <section><h1>Unable to continue</h1><p role="alert">{message}</p><button onClick={() => location.reload()}>Retry</button></section>}
  </main></DesktopGate>
}

function Welcome({ onContinue }: { onContinue: () => void }) {
  const [consent, setConsent] = useState(false)
  return <section><p className="eyebrow">{uiConfig.institution}</p><h1>Spatial data visualisation study</h1>
    <p className="lead">This study investigates how people interpret different visualisations of spatial data.</p>
    <dl className="facts"><div><dt>Investigator</dt><dd>{uiConfig.investigator}</dd></div><div><dt>Expected duration</dt><dd>{uiConfig.expectedDuration}</dd></div></dl>
    <div className="notice"><p>Participation is voluntary.</p><p>{uiConfig.dataHandling}</p><p>{uiConfig.withdrawal}</p><p>{uiConfig.ethicsContact}</p></div>
    <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I have read the information above and consent to participate.</label>
    <button disabled={!consent} onClick={onContinue}>Continue</button>
  </section>
}

function Demographics({ onSave }: { onSave: (value: ParticipantInformation) => Promise<void> }) {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<ParticipantInformation['gender'] | ''>('')
  const [background, setBackground] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    const parsed = Number(age)
    if (!Number.isInteger(parsed) || parsed < uiConfig.minimumParticipantAge || parsed > 120 || !gender || background === null) { setError(`Please complete all fields. Age must be between ${uiConfig.minimumParticipantAge} and 120.`); return }
    setSaving(true)
    try { await onSave({ age: parsed, gender, cartographic_background: background }) }
    catch { setError('Your information could not be saved. Please retry.'); setSaving(false) }
  }
  return <section><h1>Participant information</h1><form onSubmit={submit}>
    <label>What is your age?<input inputMode="numeric" type="number" min={uiConfig.minimumParticipantAge} max="120" value={age} onChange={e => setAge(e.target.value)} required /></label>
    <fieldset><legend>How do you describe your gender?</legend>{[
      ['man','Man'], ['woman','Woman'], ['another_gender','Another gender'], ['prefer_not_to_say','Prefer not to say'],
    ].map(([value,label]) => <label className="choice" key={value}><input type="radio" name="gender" value={value} checked={gender === value} onChange={() => setGender(value as ParticipantInformation['gender'])} />{label}</label>)}</fieldset>
    <fieldset><legend>Do you have an educational or professional background in cartography or GIS?</legend>
      <label className="choice"><input type="radio" name="background" checked={background === true} onChange={() => setBackground(true)} />Yes</label>
      <label className="choice"><input type="radio" name="background" checked={background === false} onChange={() => setBackground(false)} />No</label>
    </fieldset>{error && <p className="error" role="alert">{error}</p>}<button disabled={saving}>{saving ? 'Saving…' : 'Continue'}</button>
  </form></section>
}

function Instructions({ onContinue }: { onContinue: () => void }) {
  return <section><h1>How to read the visualisations</h1><div className="method-grid">
    <article><h2>Joy plot</h2><p><strong>Higher ridge = higher value.</strong></p><p>Variable A and Variable B are represented by their respective ridges. Compare ridge heights at the same location to interpret their values.</p></article>
    <article><h2>Bivariate choropleth</h2><div className="legend-demo" aria-label="Illustrative three by three bivariate legend"><span>High B</span><div>{Array.from({length: 9}, (_, i) => <i key={i} />)}</div><span>Low A → High A</span><span>Low B</span></div><p>The 3×3 legend combines classes of Variable A and Variable B. Read each axis from Low to High and match the map colour to the corresponding cell.</p></article>
  </div><button onClick={onContinue}>Continue to training</button></section>
}

function Training({ index, onContinue }: { index: number; onContinue: () => void }) {
  const item = uiConfig.training[index]
  return <section><p className="eyebrow">Practice — responses are not measured</p><h1>{item.title}</h1>
    {item.assetUrl ? <img className="training-image" src={item.assetUrl} alt={`Approved ${item.title} training stimulus`} /> :
      <div className="training-placeholder" role="note"><strong>Training asset pending researcher approval</strong><p>The training flow is ready, but no example is shown because an approved non-measured stimulus has not been supplied. None of the 36 measured stimuli is reused here.</p></div>}
    <p>{item.method === 'J' ? 'Remember: higher ridge means higher value.' : 'Use both axes of the 3×3 legend to interpret the combined class.'}</p>
    <button onClick={onContinue}>{index === uiConfig.training.length - 1 ? 'Finish training' : 'Next training method'}</button>
  </section>
}

function Ready({ onStart }: { onStart: () => void }) {
  return <section><h1>Measured test</h1><p>You will answer exactly six questions. Your experimental version is assigned only when you press Start.</p><p>Please work accurately. You may enlarge each image. Once an answer is submitted, you cannot go back.</p><button onClick={onStart}>Start measured test</button></section>
}

function TrialScreen({ session, recovered, onAcknowledged }: { session: StudySession; recovered: number; onAcknowledged: (s: StudySession) => void }) {
  const position = session.current_trial_position ?? session.completed_trials + 1
  const trial = session.trials?.find(item => item.position === position && !item.completed) ?? session.trials?.find(item => item.position === position)
  const [selected, setSelected] = useState('')
  const [onset, setOnset] = useState<number | null>(null)
  const [firstSelection, setFirstSelection] = useState<number | null>(null)
  const [changes, setChanges] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoomCount, setZoomCount] = useState(0)
  const [zoomDuration, setZoomDuration] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [stimulusError, setStimulusError] = useState(false)
  const zoomStarted = useRef<number | null>(null)
  const stimulusImage = useRef<HTMLImageElement | null>(null)
  const idempotencyKey = useRef(crypto.randomUUID())
  const startedAt = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!trial) return
    storage.setActive({ token: session.session_token, position: trial.position, restartCount: recovered })
    void api.markTrialStarted(session.session_token, trial.position, recovered > 0)
    let cancelled = false
    let cancelPaint: (() => void) | undefined
    const armTimer = async () => {
      const image = stimulusImage.current
      if (!image) return
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => reject(new Error('Displayed stimulus failed to load')), { once: true })
        })
      }
      if (typeof image.decode === 'function') await image.decode()
      if (!cancelled) cancelPaint = afterVisiblePaint(time => { startedAt.current = new Date().toISOString(); setOnset(time) })
    }
    void armTimer().catch(() => setStimulusError(true))
    return () => { cancelled = true; cancelPaint?.() }
  }, [recovered, session.session_token, trial])
  if (!trial) return <Status title="Preparing next question…" text="Please wait." />
  if (stimulusError) return <section><h1>Unable to display stimulus</h1><p role="alert">Timing has not started. Please reload to retry this question.</p><button onClick={() => location.reload()}>Retry</button></section>

  const choose = (answer: string) => {
    if (submitting || retrying || onset === null) return
    if (!selected) setFirstSelection(performance.now())
    else if (selected !== answer) setChanges(value => value + 1)
    setSelected(answer)
  }
  const closeZoom = () => {
    if (zoomStarted.current !== null) setZoomDuration(value => value + performance.now() - zoomStarted.current!)
    zoomStarted.current = null; setZoomOpen(false)
  }
  const submit = async () => {
    if (!selected || onset === null || firstSelection === null) return
    setSubmitting(true); setRetrying(false)
    const alreadyPending = storage.getPending()
    const now = performance.now()
    const openZoomDuration = zoomStarted.current === null ? 0 : now - zoomStarted.current
    const metrics: TrialMetrics = alreadyPending?.token === session.session_token && alreadyPending.position === trial.position ? alreadyPending.metrics : {
      selected_answer: selected,
      rt_selection_ms: Math.round((firstSelection - onset) * 1000) / 1000,
      rt_submit_ms: Math.round((now - onset) * 1000) / 1000,
      answer_changes: changes,
      zoom_used: zoomCount > 0,
      zoom_count: zoomCount,
      zoom_duration_ms: Math.round((zoomDuration + openZoomDuration) * 1000) / 1000,
      trial_restarted: recovered > 0 || (trial.restart_count ?? 0) > 0,
      restart_count: Math.max(recovered, trial.restart_count ?? 0),
      idempotency_key: idempotencyKey.current,
      trial_started_at: startedAt.current,
    }
    const pending = alreadyPending?.token === session.session_token && alreadyPending.position === trial.position
      ? alreadyPending : { token: session.session_token, position: trial.position, metrics }
    storage.setPending(pending)
    try {
      const updated = await api.submitTrial(pending.token, pending.position, pending.metrics)
      storage.clearPending(); storage.clearActive(); closeZoom(); onAcknowledged(updated)
    } catch { setRetrying(true); setSubmitting(false) }
  }
  return <section className="trial" aria-busy={onset === null}>
    <header><p className="eyebrow">Question {trial.position} of 6</p><progress value={trial.position} max="6">{trial.position} of 6</progress></header>
    <h1>{trial.question}</h1>
    <figure className="stimulus"><img ref={stimulusImage} src={trial.stimulus_url} alt="Experimental map stimulus" draggable={false} /></figure>
    <button className="secondary zoom-button" onClick={() => { setZoomCount(value => value + 1); zoomStarted.current = performance.now(); setZoomOpen(true) }}>Enlarge image</button>
    <fieldset className="answers"><legend className="sr-only">Choose one response</legend>{trial.options.map(option => <label className={`answer ${selected === option.id ? 'selected' : ''}`} key={option.id}><input type="radio" name="answer" checked={selected === option.id} onChange={() => choose(option.id)} />{option.label}</label>)}</fieldset>
    {retrying && <div className="retry" role="alert"><p>Your response has not been confirmed. It is saved on this device.</p><button onClick={() => void submit()}>Retry submission</button></div>}
    {!retrying && <button disabled={!selected || onset === null || submitting} onClick={() => void submit()}>{submitting ? 'Saving response…' : 'Next'}</button>}
    {zoomOpen && <div className="modal" role="dialog" aria-modal="true" aria-label="Enlarged stimulus"><button className="modal-close" onClick={closeZoom}>Close</button><div className="pan-area"><img src={trial.stimulus_url} alt="Enlarged experimental map stimulus" /></div></div>}
  </section>
}

function Preference({ onSubmit }: { onSubmit: (preference: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return <section><h1>Which visualisation method did you prefer overall?</h1><fieldset><legend className="sr-only">Method preference</legend>{[
    ['joy_plot','I preferred the joy plot.'], ['bivariate_choropleth','I preferred the bivariate choropleth map.'], ['no_preference','I had no preference.'],
  ].map(([id,label]) => <label className="choice" key={id}><input type="radio" name="preference" checked={value === id} onChange={() => setValue(id)} />{label}</label>)}</fieldset>
    {error && <p className="error" role="alert">{error}</p>}<button disabled={!value || saving} onClick={async () => { setSaving(true); try { await onSubmit(value) } catch { setError('Your preference could not be saved. Please retry.'); setSaving(false) } }}>{saving ? 'Saving…' : 'Submit'}</button>
  </section>
}

function Resume({ session, onResume }: { session: StudySession; onResume: () => void }) {
  return <section><h1>Continue your study</h1><p>We found your saved session. You have completed {session.completed_trials} of 6 measured questions.</p><p>If a question was interrupted, its timing will restart and the interruption will be recorded.</p><button onClick={onResume}>{session.status === 'preference_recorded' ? 'Finish study' : 'Resume'}</button></section>
}

function Status({ title, text }: { title: string; text: string }) { return <section className="status"><h1>{title}</h1><p>{text}</p></section> }
