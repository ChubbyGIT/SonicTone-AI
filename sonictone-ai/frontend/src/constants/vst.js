export const VST_OPTIONS_FULL = [
  { value: '', label: 'Any Plugin (Default)' },
  { value: 'Neural DSP Archetype Nolly', label: 'Archetype Nolly' },
  { value: 'Neural DSP Archetype Gojira', label: 'Archetype Gojira' },
  { value: 'Neural DSP Archetype Petrucci', label: 'Archetype Petrucci' },
  { value: 'Neural DSP Archetype Tim Henson', label: 'Archetype Tim Henson' },
  { value: 'Neural DSP Archetype Rabea', label: 'Archetype Rabea' },
  { value: 'Neural DSP Archetype Cory Wong', label: 'Archetype Cory Wong' },
  { value: 'Neural DSP Parallax', label: 'Neural DSP Parallax' },
  { value: 'Neural DSP Fortin Nameless', label: 'Fortin Nameless' },
  { value: 'Neural DSP Fortin Cali Suite', label: 'Fortin Cali Suite' },
  { value: 'Neural DSP Soldano SLO-100', label: 'Soldano SLO-100' },
  { value: 'Neural DSP Tone King Imperial', label: 'Tone King Imperial' },
  { value: 'Neural DSP Nameless Suite', label: 'Nameless Suite' },
  { value: 'Neural DSP Plini', label: 'Neural DSP Plini' },
  { value: 'Neural DSP Abasi Pathos', label: 'Abasi Pathos' },
  { value: 'STL Tonality Andy James', label: 'STL Andy James' },
  { value: 'STL Tonality Howard Benson', label: 'STL Howard Benson' },
  { value: 'STL Tonality Echotone', label: 'STL Echotone' },
  { value: 'STL Tonality Naraic Mac', label: 'STL Naraic Mac' },
]

export const VST_LABELS = Object.fromEntries(
  VST_OPTIONS_FULL.map(v => [v.value, v.label])
)