import type { Bitrix24TaskStatus } from '../../../../../shared/bitrix24/bitrix24-types'
import { translate } from '@/i18n/i18n'

export function getBitrix24StatusLabel(status: Bitrix24TaskStatus): string {
  switch (status) {
    case 1:
      return translate('components.bitrix24.status.new', 'New')
    case 2:
      return translate('components.bitrix24.status.pending', 'Pending')
    case 3:
      return translate('components.bitrix24.status.inProgress', 'In progress')
    case 4:
      return translate('components.bitrix24.status.awaitingControl', 'Awaiting control')
    case 5:
      return translate('components.bitrix24.status.completed', 'Completed')
    case 6:
      return translate('components.bitrix24.status.deferred', 'Deferred')
    case 7:
      return translate('components.bitrix24.status.declined', 'Declined')
  }
}

export function getBitrix24StatusTone(status: Bitrix24TaskStatus): string {
  if (status === 5) {
    return 'border-status-success-border bg-status-success-background text-status-success'
  }
  if (status === 7) {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }
  if (status === 2 || status === 4) {
    return 'border-status-warning-border bg-status-warning-background text-status-warning-text'
  }
  return 'border-border bg-muted/50 text-muted-foreground'
}
