/**
 * vst.js — VST Plugin Constants
 * --------------------------------
 * Defines the list of supported guitar amp plugins from Neural DSP and STL Tonality.
 *
 * VST_OPTIONS_FULL — dropdown options array with { value, label }
 *   value: the full product name sent to the backend / Groq prompt
 *   label: the short display name shown in the UI dropdown
 *
 * VST_LABELS — convenience lookup map: value → label
 *   Used in Sidebar chat titles and any place that needs to display just the
 *   short name given the full plugin name string.
 */

export const VST_OPTIONS_FULL = [
  { value: '',                               label: 'Any Plugin (Default)' },
  // Neural DSP — Archetype series (artist-branded amp sims)
  { value: 'Neural DSP Archetype Nolly',     label: 'Archetype Nolly' },
  { value: 'Neural DSP Archetype Gojira',    label: 'Archetype Gojira' },
  { value: 'Neural DSP Archetype Petrucci',  label: 'Archetype Petrucci' },
  { value: 'Neural DSP Archetype Tim Henson',label: 'Archetype Tim Henson' },
  { value: 'Neural DSP Archetype Rabea',     label: 'Archetype Rabea' },
  { value: 'Neural DSP Archetype Cory Wong', label: 'Archetype Cory Wong' },
  // Neural DSP — standalone amp sims
  { value: 'Neural DSP Parallax',            label: 'Neural DSP Parallax' },
  { value: 'Neural DSP Fortin Nameless',     label: 'Fortin Nameless' },
  { value: 'Neural DSP Fortin Cali Suite',   label: 'Fortin Cali Suite' },
  { value: 'Neural DSP Soldano SLO-100',     label: 'Soldano SLO-100' },
  { value: 'Neural DSP Tone King Imperial',  label: 'Tone King Imperial' },
  { value: 'Neural DSP Nameless Suite',      label: 'Nameless Suite' },
  { value: 'Neural DSP Plini',               label: 'Neural DSP Plini' },
  { value: 'Neural DSP Abasi Pathos',        label: 'Abasi Pathos' },
  // STL Tonality — artist-branded tone suites
  { value: 'STL Tonality Andy James',        label: 'STL Andy James' },
  { value: 'STL Tonality Howard Benson',     label: 'STL Howard Benson' },
  { value: 'STL Tonality Echotone',          label: 'STL Echotone' },
  { value: 'STL Tonality Naraic Mac',        label: 'STL Naraic Mac' },
]

/**
 * VST_LABELS — quick lookup from plugin value → short label.
 * Example: VST_LABELS['Neural DSP Archetype Nolly'] === 'Archetype Nolly'
 */
export const VST_LABELS = Object.fromEntries(
  VST_OPTIONS_FULL.map(v => [v.value, v.label])
)