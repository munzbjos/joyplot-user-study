export const uiConfig = {
  minimumViewportWidth: Number(import.meta.env.VITE_MIN_VIEWPORT_WIDTH ?? 1100),
  minimumParticipantAge: Number(import.meta.env.VITE_MIN_PARTICIPANT_AGE ?? 1),
  institution: import.meta.env.VITE_RESEARCH_INSTITUTION ?? '[Research institution]',
  investigator: import.meta.env.VITE_INVESTIGATOR ?? '[Investigator]',
  expectedDuration: import.meta.env.VITE_EXPECTED_DURATION ?? '[Expected duration]',
  dataHandling: import.meta.env.VITE_DATA_HANDLING ?? '[Anonymity and data handling information]',
  withdrawal: import.meta.env.VITE_WITHDRAWAL_INFO ?? '[Withdrawal information]',
  ethicsContact: import.meta.env.VITE_ETHICS_CONTACT ?? '[Ethics and contact information]',
  finalText: import.meta.env.VITE_FINAL_TEXT ?? 'Your responses have been recorded.',
  training: [
    { method: 'J' as const, title: 'Training 1: Joy plot', assetUrl: import.meta.env.VITE_TRAINING_JOY_ASSET || '' },
    { method: 'CH' as const, title: 'Training 2: Bivariate choropleth', assetUrl: import.meta.env.VITE_TRAINING_CH_ASSET || '' },
  ],
}
