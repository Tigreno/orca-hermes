import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import {
  addMobilePairingCustomAddress,
  normalizeMobilePairingCustomAddress,
  normalizeMobilePairingCustomAddresses
} from '../../../../shared/remote-runtime/pairing/mobile-pairing-custom-address'

export function normalizeLoadedMobilePairingSettings(
  settings: GlobalSettings | undefined,
  markNeedsSave: () => void
): Pick<GlobalSettings, 'mobilePairingCustomAddress' | 'mobilePairingCustomAddresses'> {
  const mobilePairingCustomAddress = normalizeMobilePairingCustomAddress(
    settings?.mobilePairingCustomAddress
  )
  const rawMobilePairingCustomAddresses = settings?.mobilePairingCustomAddresses
  const mobilePairingCustomAddresses = mobilePairingCustomAddress
    ? addMobilePairingCustomAddress(
        normalizeMobilePairingCustomAddresses(rawMobilePairingCustomAddresses),
        mobilePairingCustomAddress
      )
    : normalizeMobilePairingCustomAddresses(rawMobilePairingCustomAddresses)
  if (
    settings?.mobilePairingCustomAddress !== undefined &&
    settings.mobilePairingCustomAddress !== mobilePairingCustomAddress
  ) {
    markNeedsSave()
  }
  const customAddressesMatch =
    Array.isArray(rawMobilePairingCustomAddresses) &&
    rawMobilePairingCustomAddresses.length === mobilePairingCustomAddresses.length &&
    rawMobilePairingCustomAddresses.every(
      (address, index) => address === mobilePairingCustomAddresses[index]
    )
  if (
    (rawMobilePairingCustomAddresses !== undefined || mobilePairingCustomAddress !== null) &&
    !customAddressesMatch
  ) {
    markNeedsSave()
  }
  return { mobilePairingCustomAddress, mobilePairingCustomAddresses }
}
