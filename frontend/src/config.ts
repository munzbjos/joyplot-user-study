import { participantCopy } from './participantCopy'

export const uiConfig = {
  minimumViewportWidth: Number(import.meta.env.VITE_MIN_VIEWPORT_WIDTH ?? 1100),
  minimumParticipantAge: Number(import.meta.env.VITE_MIN_PARTICIPANT_AGE ?? 18),
  consentTextVersion: import.meta.env.VITE_CONSENT_TEXT_VERSION ?? participantCopy.consentVersion,
  institution: import.meta.env.VITE_RESEARCH_INSTITUTION ?? 'CTU Prague',
  investigator: import.meta.env.VITE_INVESTIGATOR ?? 'Josef Münzberger',
  expectedDuration: import.meta.env.VITE_EXPECTED_DURATION ?? '5–10 minutes',
  dataHandling: import.meta.env.VITE_DATA_HANDLING ?? '[Anonymity and data handling information]',
  withdrawal: import.meta.env.VITE_WITHDRAWAL_INFO ?? '[Withdrawal information]',
  ethicsContact: import.meta.env.VITE_ETHICS_CONTACT ?? '[Ethics and contact information]',
  finalText: import.meta.env.VITE_FINAL_TEXT ?? 'Your responses have been recorded.',
  training: participantCopy.training,
}
