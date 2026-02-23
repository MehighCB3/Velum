/**
 * useVolumeShortcut
 *
 * Fires onTrigger when the user double-presses the volume-down button.
 * Android only — iOS blocks volume button interception at the OS level.
 *
 * Why double-press and not long-press:
 *   react-native-volume-manager (and expo-av) surface VOLUME VALUE CHANGES,
 *   not raw keydown/keyup events. Without keyup timing, detecting a sustained
 *   hold is unreliable. Double-press is the standard alternative used by most
 *   apps that offer a hardware-button shortcut (e.g. SOS, flashlight, camera).
 */

import { useEffect, useRef, useCallback } from 'react'
import { Platform } from 'react-native'
import { VolumeManager } from 'react-native-volume-manager'

/** Two presses within this window = shortcut trigger */
const DOUBLE_PRESS_MS = 450

export function useVolumeShortcut(onTrigger: () => void) {
  const lastDecreaseAt = useRef(0)
  const lastVolume = useRef<number | null>(null)

  const trigger = useCallback(() => {
    onTrigger()
  }, [onTrigger])

  useEffect(() => {
    // Android only — iOS volume interception is not supported
    if (Platform.OS !== 'android') return

    const sub = VolumeManager.addVolumeListener((result) => {
      const vol = result.volume

      if (lastVolume.current !== null && vol < lastVolume.current) {
        // Volume went down — a button press
        const now = Date.now()

        if (now - lastDecreaseAt.current < DOUBLE_PRESS_MS) {
          // Second press within the window → trigger
          lastDecreaseAt.current = 0  // reset so a third press starts fresh
          trigger()
        } else {
          // First press — record the time
          lastDecreaseAt.current = now
        }
      }

      lastVolume.current = vol
    })

    return () => {
      sub.remove()
    }
  }, [trigger])
}
