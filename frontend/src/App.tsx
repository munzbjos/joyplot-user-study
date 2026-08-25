import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'
import { uiConfig } from './config'
import { participantCopy } from './participantCopy'
import { ImageViewer } from './ImageViewer'
import { storage } from './storage'
import { afterVisiblePaint, preloadAndDecode } from './timing'
import type { ParticipantInformation, SafeTrial, StudySession, TrialMetrics } from './types'

type View = 'loading' | 'welcome' | 'demographics' | 'instructions-intro' | 'instructions-joy' | 'instructions-ch' | 'practice-intro' | 'training' | 'ready' |
  'preloading' | 'countdown' | 'trial' | 'preference' | 'thank-you' | 'resume' | 'error'

function initialView(session: StudySession): View {
  if (session.status === 'completed') return 'thank-you'
  if (session.assigned_version || session.status === 'in_progress' || session.status === 'preference_recorded') return 'resume'
  if (session.participant_information_complete || session.status === 'ready') return 'instructions-intro'
  if (session.consent_recorded || session.status === 'consent_recorded') return 'demographics'
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

  const usesMapCanvas = view === 'instructions-joy' || view === 'instructions-ch' || view === 'training' || view === 'trial'
  return <DesktopGate><main className={`shell ${usesMapCanvas ? 'map-shell' : ''} ${view === 'trial' ? 'trial-shell' : ''}`}>
    {view === 'loading' && <p>Preparing study…</p>}
    {view === 'welcome' && <Welcome onContinue={async () => {
      const updated = await api.recordConsent(session!.session_token, uiConfig.consentTextVersion)
      setSession(current => current ? { ...current, ...updated } : updated)
      setView('demographics')
    }} />}
    {view === 'demographics' && <Demographics onSave={async information => {
      const updated = await api.saveParticipantInformation(session!.session_token, information)
      setSession(updated); setView('instructions-intro')
    }} />}
    {view === 'instructions-intro' && <InstructionsIntro onContinue={() => setView('instructions-joy')} />}
    {view === 'instructions-joy' && <JoyInstructions onBack={() => setView('instructions-intro')} onContinue={() => setView('instructions-ch')} />}
    {view === 'instructions-ch' && <ChoroplethInstructions onBack={() => setView('instructions-joy')} onContinue={() => setView('practice-intro')} />}
    {view === 'practice-intro' && <PracticeIntro onContinue={() => { setTrainingIndex(0); setView('training') }} />}
    {view === 'training' && <Training key={trainingIndex} index={trainingIndex} onContinue={() => {
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
    {view === 'thank-you' && <section className="status"><h1>Thank You</h1><p>Thank you for taking part in this study.</p><p>Your responses have been recorded successfully.</p><p><strong>[OPTIONAL FINAL CONTACT / RESEARCH INFORMATION TO BE CONFIRMED]</strong></p></section>}
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

export function Welcome({ onContinue }: { onContinue: () => Promise<void> }) {
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const continueAfterConsent = async () => {
    if (!consent || saving) return
    setSaving(true); setError('')
    try { await onContinue() }
    catch { setError('Your consent could not be recorded. Please check your connection and retry.'); setSaving(false) }
  }
  return <section><h1>{participantCopy.welcome.title}</h1>
    {participantCopy.welcome.introduction.map((text, index) => <p className={index === 0 ? 'lead' : undefined} key={text}>{text}</p>)}
    <h2>Participation requirements</h2><ul><li>You must be <strong>18 years of age or older</strong>.</li><li>Please complete the study on a <strong>desktop or laptop computer</strong>.</li><li>Please complete the study in one sitting if possible.</li></ul>
    <h2>Participation and data</h2><p>Participation is voluntary. You may stop the study at any time by closing the browser window.</p><p>We do not ask for your name, email address, or other directly identifying information. The study records your responses, response times, basic demographic information provided in the questionnaire, and limited technical information about the device and browser used to complete the study.</p><p>The collected data will be used for academic research and may be reported in aggregated or anonymised form in scientific publications and related research outputs.</p>
    <h2>Research contact</h2><p>This study is conducted by <strong>Josef Münzberger</strong>, <strong>CTU Prague</strong>.</p><p>If you have questions about the study, please contact:</p><p><strong>josef.munzberger@fsv.cvut.cz</strong></p>
    <h2>Consent</h2><label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> <strong>{participantCopy.welcome.consent}</strong></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button disabled={!consent || saving} onClick={() => void continueAfterConsent()}>{saving ? 'Saving consent…' : 'Continue'}</button>
  </section>
}

function Demographics({ onSave }: { onSave: (value: ParticipantInformation) => Promise<void> }) {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<ParticipantInformation['gender'] | ''>('')
  const [background, setBackground] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const parsedAge = Number(age)
  const ageIsEligible = age !== '' && Number.isInteger(parsedAge) && parsedAge >= uiConfig.minimumParticipantAge && parsedAge <= 120
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    const parsed = Number(age)
    if (!Number.isInteger(parsed) || parsed < uiConfig.minimumParticipantAge || parsed > 120 || !gender || background === null) { setError(`Please complete all fields. Age must be between ${uiConfig.minimumParticipantAge} and 120.`); return }
    setSaving(true)
    try { await onSave({ age: parsed, gender, cartographic_background: background }) }
    catch { setError('Your information could not be saved. Please retry.'); setSaving(false) }
  }
  return <section><h1>About You</h1><p>Before we begin, please answer three short questions about yourself.</p><form onSubmit={submit}>
    <label>What is your age?<input aria-label="Age" placeholder="Age" inputMode="numeric" type="number" min={uiConfig.minimumParticipantAge} max="120" value={age} onChange={e => setAge(e.target.value)} required /></label>
    <fieldset><legend>How do you describe your gender?</legend>{[
      ['man','Man'], ['woman','Woman'], ['another_gender','Another gender'], ['prefer_not_to_say','Prefer not to say'],
    ].map(([value,label]) => <label className="choice" key={value}><input type="radio" name="gender" value={value} checked={gender === value} onChange={() => setGender(value as ParticipantInformation['gender'])} />{label}</label>)}</fieldset>
    <fieldset><legend>Do you have an educational or professional background in cartography or GIS?</legend>
      <label className="choice"><input type="radio" name="background" checked={background === true} onChange={() => setBackground(true)} />Yes</label>
      <label className="choice"><input type="radio" name="background" checked={background === false} onChange={() => setBackground(false)} />No</label>
    </fieldset>{error && <p className="error" role="alert">{error}</p>}<button disabled={saving || !ageIsEligible}>{saving ? 'Saving…' : 'Continue'}</button>
  </form></section>
}

function InstructionsIntro({ onContinue }: { onContinue: () => void }) { return <section><h1>How to Read the Visualisations</h1><p>In this study, you will work with two different methods for visualising two spatial variables: <strong>Variable A</strong> and <strong>Variable B</strong>.</p><p>The following screens briefly explain how to read each visualisation. You will then complete two practice questions before starting the measured part of the study.</p><h2>How to interact with maps</h2><p>Move the pointer over an image and use the mouse wheel to zoom up to 200%. When zoomed, click and drag to pan. You can try these controls during practice.</p><button onClick={onContinue}>Continue</button></section> }

function JoyInstructions({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) { return <section><h1>Joy Plot</h1><p>A joy plot represents spatial values using a series of profiles.</p><p><strong>Variable A</strong> and <strong>Variable B</strong> are shown as two overlaid sets of ridges.</p><p>The <strong>height of a ridge represents the value of the variable at that location:</strong></p><p><strong>Higher ridge = higher value.</strong></p><p>To compare values, look at the relative heights of the corresponding ridges at the location of interest.</p><p><strong>Variable A — blue</strong><br /><strong>Variable B — red</strong></p><ImageViewer className="instruction-viewer" src="/training/T0a01_J.png" alt="Joy plot training map with legend" /><div className="button-row"><button className="secondary" onClick={onBack}>Back</button><button onClick={onContinue}>Continue</button></div></section> }

function ChoroplethInstructions({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) { return <section><h1>Bivariate Choropleth Map</h1><p>A bivariate choropleth map represents <strong>Variable A</strong> and <strong>Variable B</strong> simultaneously using colour.</p><p>Each map cell belongs to one of nine colour classes representing a combination of values of the two variables.</p><p>Use the <strong>3 × 3 legend</strong> to interpret the colour of a cell:</p><ul><li>one direction of the legend represents <strong>Variable A</strong>, from low to high;</li><li>the other direction represents <strong>Variable B</strong>, from low to high.</li></ul><p>To identify the values at a location, match the colour of the corresponding map cell to the legend.</p><ImageViewer className="instruction-viewer" src="/training/T0a01_CH.png" alt="Bivariate choropleth training map with 3 × 3 legend" /><div className="button-row"><button className="secondary" onClick={onBack}>Back</button><button onClick={onContinue}>Continue</button></div></section> }

function PracticeIntro({ onContinue }: { onContinue: () => void }) { return <section><h1>Practice</h1><p>You will now complete two practice questions:</p><ul><li>one using a <strong>joy plot</strong>;</li><li>one using a <strong>bivariate choropleth map</strong>.</li></ul><p>These practice questions are <strong>not part of the measured test</strong>, and your response time will not be analysed.</p><p>After submitting each answer, you will see the correct response.</p><p>The numbered circles indicate the <strong>regions to be compared</strong>. Consider the visual pattern within the marked circle rather than trying to identify a single exact pixel or point.</p><button onClick={onContinue}>Start Practice</button></section> }

export function Training({ index, onContinue }: { index: number; onContinue: () => void }) {
  const item = uiConfig.training[index]
  const [selected, setSelected] = useState(''); const [checked, setChecked] = useState(false)
  const correct = selected === item.correctAnswer
  return <section><h1>{item.header}</h1><ImageViewer className="practice-viewer" src={item.assetUrl} alt={`${item.header} training stimulus`} />
    <h2>{item.question}</h2><fieldset className="answers"><legend className="sr-only">Choose one response</legend>{[1,2,3,4].map(region => { const id=`region_${region}`; return <label className={`answer ${selected === id ? 'selected' : ''}`} key={id}><input disabled={checked} type="radio" name="training-answer" checked={selected === id} onChange={() => setSelected(id)} />Region {region}</label> })}</fieldset>
    {!checked ? <button disabled={!selected} onClick={() => setChecked(true)}>Check answer</button> : <div className="training-feedback" role="status"><p><strong>{correct ? 'Correct.' : `Not quite. The correct answer is ${item.correctLabel}.`}</strong></p>{item.method === 'J' ? <><p>At <strong>Region 3</strong>, Variable B is higher than Variable A.</p><p>In a joy plot, compare the ridge heights within the marked region. Remember:</p><p><strong>Higher ridge = higher value.</strong></p></> : <><p><strong>Region 2</strong> represents a low value of Variable A and a high value of Variable B.</p><p>To interpret a bivariate choropleth map, match the colour of the cells within the marked region to the corresponding position in the <strong>3 × 3 legend</strong>.</p></>}<button onClick={onContinue}>{item.next}</button></div>}
  </section>
}

function Ready({ onStart }: { onStart: () => void }) {
  return <section><h1>Ready to Begin</h1><p>The practice is complete.</p><p>The measured part of the study contains <strong>six questions</strong>.</p><p>Please answer each question as <strong>accurately and efficiently as you can</strong>.</p><p>Your response time will be measured from the moment each question and visualisation appear until you submit your answer.</p><p>You may enlarge the visualisation if needed.</p><p>Once you submit an answer, you cannot return to the previous question.</p><p>Please complete all six questions in one sitting if possible.</p><p><strong>The test will begin after a short 3–2–1 countdown.</strong></p><button onClick={onStart}>Start Test</button></section>
}

function TrialScreen({ session, recovered, onAcknowledged }: { session: StudySession; recovered: number; onAcknowledged: (s: StudySession) => void }) {
  const position = session.current_trial_position ?? session.completed_trials + 1
  const trial = session.trials?.find(item => item.position === position && !item.completed) ?? session.trials?.find(item => item.position === position)
  const [selected, setSelected] = useState('')
  const [onset, setOnset] = useState<number | null>(null)
  const [firstSelection, setFirstSelection] = useState<number | null>(null)
  const [changes, setChanges] = useState(0)
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
  const finishZoom = () => {
    if (zoomStarted.current !== null) setZoomDuration(value => value + performance.now() - zoomStarted.current!)
    zoomStarted.current = null
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
      storage.clearPending(); storage.clearActive(); onAcknowledged(updated)
    } catch { setRetrying(true); setSubmitting(false) }
  }
  return <section className="trial" aria-busy={onset === null}>
    <header><p className="eyebrow">Question {trial.position} of 6</p><progress value={trial.position} max="6">{trial.position} of 6</progress></header>
    <h1>{trial.question}</h1>
    <ImageViewer className="measured-viewer" imageRef={stimulusImage} interactive={onset !== null} src={trial.stimulus_url} alt="Experimental map stimulus" onZoomGesture={() => setZoomCount(value => value + 1)} onZoomStart={() => { zoomStarted.current = performance.now() }} onZoomEnd={finishZoom} />
    <fieldset className="answers"><legend className="sr-only">Choose one response</legend>{trial.options.map(option => <label className={`answer ${selected === option.id ? 'selected' : ''}`} key={option.id}><input type="radio" name="answer" checked={selected === option.id} onChange={() => choose(option.id)} />{option.label}</label>)}</fieldset>
    {retrying && <div className="retry" role="alert"><p>Your response has not been confirmed. It is saved on this device.</p><button onClick={() => void submit()}>Retry submission</button></div>}
    {!retrying && <button disabled={!selected || onset === null || submitting} onClick={() => void submit()}>{submitting ? 'Saving response…' : 'Next'}</button>}
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
