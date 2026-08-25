// Canonical participant copy: docs/PARTICIPANT_COPY.md. Do not edit wording
// here without updating that researcher-approved source.
export const participantCopy = {
  consentVersion: '1.0',
  welcome: {
    title: 'Visualisation of Spatial Data: User\u00a0Study',
    introduction: [
      'This research investigates how people interpret different visualisations of spatial data. You will first receive brief instructions and complete two practice tasks. You will then answer six map-reading questions.',
      'The study takes approximately 5–10 minutes and should be completed on a desktop or laptop computer.',
    ],
    consent: 'I confirm that I am at least 18 years old, that I have read the information above, and that I voluntarily agree to participate in this study.',
  },
  training: [
    { method: 'J' as const, headingPrefix: 'Practice 1 of 2:', methodLabel: 'Bivariate Joy Plot', assetUrl: '/training/T0a01_J.png', question: 'At which marked region is Variable B higher than Variable A?', correctAnswer: 'region_3', correctLabel: 'Region 3', next: 'Next Practice Question' },
    { method: 'CH' as const, headingPrefix: 'Practice 2 of 2:', methodLabel: 'Bivariate Choropleth Map', assetUrl: '/training/T0a01_CH.png', question: 'Which marked region shows a low value of Variable A and a high value of Variable B?', correctAnswer: 'region_2', correctLabel: 'Region 2', next: 'Continue' },
  ],
}
