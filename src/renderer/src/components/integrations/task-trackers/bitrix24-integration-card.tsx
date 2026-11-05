import { useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Unlink } from 'lucide-react'
import { Bitrix24Icon } from '@/components/icons/Bitrix24Icon'
import { Bitrix24ConnectDialog } from '@/components/bitrix24-connect-dialog'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  refreshBitrix24ConnectionStatus,
  useBitrix24ConnectionStatus
} from '@/hooks/use-bitrix24-connection-status'
import { bitrix24Disconnect, bitrix24TestConnection } from '@/runtime/runtime-bitrix24-client'
import { getLocalExecutionHostLabel } from '../../../../../shared/execution-host'
import { taskProviderErrorMessage } from '@/lib/task-provider-error-copy'
import {
  IntegrationCardDetails,
  IntegrationCardShell
} from '../presentation/integration-card-shell'
import { useIntegrationSubordinateRowClass } from '../presentation/integration-card-presentation'
import { BITRIX24_INTEGRATION_SECTION_ID } from './task-provider-integration-section-ids'
import { translate } from '@/i18n/i18n'

type VerificationResult = { state: 'ok' | 'error'; error?: string }

export function Bitrix24IntegrationCard(): React.JSX.Element {
  const connection = useBitrix24ConnectionStatus()
  const mountedRef = useMountedRef()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<VerificationResult | null>(null)
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')

  const status = connection.status
  const checking = connection.checking && status === null
  const connected = status?.connected === true

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await bitrix24TestConnection()
      if (!mountedRef.current) {
        return
      }
      setTestResult(
        result.ok ? { state: 'ok' } : { state: 'error', error: taskProviderErrorMessage(result) }
      )
    } catch (error) {
      if (mountedRef.current) {
        setTestResult({
          state: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    } finally {
      if (mountedRef.current) {
        setTesting(false)
      }
    }
  }

  const handleDisconnect = async (): Promise<void> => {
    await bitrix24Disconnect()
    if (mountedRef.current) {
      setTestResult(null)
    }
    await refreshBitrix24ConnectionStatus()
  }

  return (
    <IntegrationCardShell
      settingsSectionId={BITRIX24_INTEGRATION_SECTION_ID}
      icon={<Bitrix24Icon className="size-5" />}
      name="Bitrix24"
      description={
        connected
          ? translate(
              'components.Bitrix24IntegrationCard.connectedDescription',
              'Connected to {{portal}} as user {{userId}}.',
              { portal: status?.portalHost ?? '', userId: status?.userId ?? '' }
            )
          : checking
            ? translate(
                'components.Bitrix24IntegrationCard.checking',
                'Checking Bitrix24 access before showing setup actions.'
              )
            : translate(
                'components.Bitrix24IntegrationCard.description',
                'Browse tasks and start workspaces from a Bitrix24 project.'
              )
      }
      checking={checking}
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={
        connected
          ? translate('components.Bitrix24IntegrationCard.statusConnected', 'Connected')
          : translate('components.Bitrix24IntegrationCard.statusNotConnected', 'Not connected')
      }
      actions={
        !checking ? (
          <Button
            variant={connected ? 'outline' : 'default'}
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            {connected
              ? translate('components.Bitrix24IntegrationCard.reconnect', 'Reconnect Bitrix24')
              : translate('components.Bitrix24IntegrationCard.connect', 'Connect Bitrix24')}
          </Button>
        ) : null
      }
    >
      <IntegrationCardDetails>
        <div className={subordinateRowClass}>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {translate(
                'components.Bitrix24IntegrationCard.scope',
                'Stored on this desktop: {{host}}',
                { host: getLocalExecutionHostLabel() }
              )}
            </p>
          </div>
        </div>
        {connected && status ? (
          <div className={subordinateRowClass}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{status.portalHost}</p>
              <p className="truncate text-xs text-muted-foreground">
                {translate('components.Bitrix24IntegrationCard.userLabel', 'User ID {{id}}', {
                  id: status.userId ?? ''
                })}
                {status.scopes.length > 0 ? ` · ${status.scopes.join(', ')}` : ''}
              </p>
            </div>
            {testResult?.state === 'ok' ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-status-success">
                <CheckCircle2 className="size-3.5" />
                {translate('components.Bitrix24IntegrationCard.verified', 'Verified')}
              </span>
            ) : null}
            {testResult?.state === 'error' ? (
              <span className="flex min-w-0 max-w-[220px] shrink items-center gap-1 truncate text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="truncate">{testResult.error}</span>
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTest()}
              disabled={testing}
            >
              {testing ? (
                <>
                  <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                  {translate('components.Bitrix24IntegrationCard.testing', 'Testing...')}
                </>
              ) : (
                translate('components.Bitrix24IntegrationCard.test', 'Test')
              )}
            </Button>
            <button
              onClick={() => void handleDisconnect()}
              aria-label={translate(
                'components.Bitrix24IntegrationCard.disconnect',
                'Disconnect Bitrix24'
              )}
              className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
            >
              <Unlink className="size-3.5" />
            </button>
          </div>
        ) : !checking ? (
          <p className="text-xs text-muted-foreground">
            {translate(
              'components.Bitrix24IntegrationCard.credentials',
              'Bitrix24 uses an incoming webhook. The token is stored locally and never leaves this desktop.'
            )}
          </p>
        ) : null}
        {connection.error ? (
          <p role="alert" className="text-xs text-destructive">
            {connection.error}
          </p>
        ) : null}
      </IntegrationCardDetails>

      <Bitrix24ConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={() => setTestResult(null)}
      />
    </IntegrationCardShell>
  )
}
