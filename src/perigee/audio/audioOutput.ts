/**
 * iOS puts Web Audio and HTML media on two different output channels. Media
 * elements play on the media channel; an `AudioContext` plays on the ringer
 * channel, which the side switch mutes. So on an iPhone set to silent the
 * whole graph runs correctly and is heard by nobody: the control reports the
 * sound as on, the meters would move, and nothing comes out of the speaker.
 *
 * Safari 17 fixed this properly with the AudioSession API. Declaring
 * `playback` states that the page is here to play audio the listener asked
 * for, and moves the context onto the media channel where the side switch no
 * longer applies. It is the only browser that implements it, and it is the
 * only browser that needs it.
 *
 * `keepMediaChannelOpen` is the fallback for iOS 16 and earlier, which has no
 * such control: a looping silent media element holds the media channel open,
 * and the system then mixes the Web Audio output onto it. Nothing is heard
 * from the element itself — it is four seconds of digital silence.
 */

interface AudioSessionCapableNavigator extends Navigator {
  audioSession?: { type: string }
}

let silentElement: HTMLAudioElement | null = null
let silentUrl: string | null = null

/**
 * Four seconds of silence as a WAV, built rather than shipped: an asset for
 * this would be a network request whose only job is to be inaudible.
 */
function createSilentWav(): Blob {
  const sampleRate = 8_000
  const samples = sampleRate * 4
  const buffer = new ArrayBuffer(44 + samples)
  const view = new DataView(buffer)
  const ascii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  ascii(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  ascii(36, 'data')
  view.setUint32(40, samples, true)
  // 8-bit PCM is unsigned, so silence is 128, not 0.
  new Uint8Array(buffer, 44).fill(128)
  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * The fallback is for iOS and iPadOS only. Everywhere else a permanently
 * playing media element buys nothing and costs something visible: Chrome puts
 * a speaker badge on the tab and a Perigee entry in the system media controls
 * for as long as it runs. iPadOS reports itself as a Mac, so touch points are
 * what separate it from a desktop.
 */
function isAppleTouchDevice(): boolean {
  const { userAgent, maxTouchPoints } = navigator
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

/** True where the AudioSession API answered for us and no element is needed. */
function declarePlaybackSession(): boolean {
  const session = (navigator as AudioSessionCapableNavigator).audioSession
  if (!session) return false
  try {
    session.type = 'playback'
    return true
  } catch {
    return false
  }
}

function keepMediaChannelOpen(): void {
  if (silentElement) {
    void silentElement.play().catch(() => undefined)
    return
  }
  silentUrl = URL.createObjectURL(createSilentWav())
  const element = new Audio(silentUrl)
  element.loop = true
  element.preload = 'auto'
  // Not muted: a muted element is not playback as far as the system mixer is
  // concerned, and the channel stays closed.
  element.volume = 1
  element.setAttribute('playsinline', '')
  silentElement = element
  void element.play().catch(() => undefined)
}

/**
 * Call from inside the gesture that starts the sound, before the context is
 * resumed. Both paths are cheap and idempotent.
 */
export function claimPlaybackOutput(): void {
  if (typeof navigator === 'undefined') return
  if (declarePlaybackSession()) return
  if (isAppleTouchDevice()) keepMediaChannelOpen()
}

export function releasePlaybackOutput(): void {
  if (silentElement) {
    silentElement.pause()
    silentElement.removeAttribute('src')
    silentElement.load()
    silentElement = null
  }
  if (silentUrl) {
    URL.revokeObjectURL(silentUrl)
    silentUrl = null
  }
}
