import { useId, useLayoutEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { taskProviderErrorMessage, taskProviderErrorText } from '@/lib/task-provider-error-copy'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMountedRef } from '@/hooks/useMountedRef'
import { refreshBitrix24ConnectionStatus } from '@/hooks/use-bitrix24-connection-status'
import { bitrix24Connect } from '@/runtime/runtime-bitrix24-client'
import { preventOutsideDismissWhenDirty } from '@/lib/outside-dismiss-guard'
import { translate } from '@/i18n/i18n'

type ConnectState = 'idle' | 'connecting' | 'error'

export function Bitrix24ConnectDialog({
  open,
  onOpenChange,
  onConnected
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: () => void
}): React.JSX.Element {
  const mountedRef = useMountedRef()
  const inputId = useId()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)

  // Clear the secret before paint on each open so a prior token cannot flash.
  useLayoutEffect(() => {
    if (!open) {
      return
    }
    setWebhookUrl('')
    setConnectState('idle')
    setConnectError(null)
  }, [open])

  const clearErrorOnEdit = (): void => {
    if (connectState === 'error') {
      setConnectState('idle')
      setConnectError(null)
    }
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (connectState !== 'connecting') {
      onOpenChange(nextOpen)
    }
  }

  const guardOutsideDismiss = preventOutsideDismissWhenDirty(() => webhookUrl !== '')

  const handleConnect = async (): Promise<void> => {
    const trimmed = webhookUrl.trim()
    if (!trimmed || connectState === 'connecting') {
      return
    }
    setConnectState('connecting')
    setConnectError(null)
    try {
      const result = await bitrix24Connect({ webhookUrl: trimmed })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        setWebhookUrl('')
        setConnectState('idle')
        await refreshBitrix24ConnectionStatus()
        onOpenChange(false)
        onConnected?.()
        return
      }
      setConnectState('error')
      setConnectError(taskProviderErrorMessage(result))
    } catch (error) {
      if (mountedRef.current) {
        setConnectState('error')
        setConnectError(
          error instanceof Error
            ? taskProviderErrorText(error.message)
            : translate('components.bitrix24ConnectDialog.failed', 'Connection failed')
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="z-[110]"
        className="z-[120]"
        onPointerDownOutside={guardOutsideDismiss}
        onInteractOutside={guardOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>
            {translate('components.bitrix24ConnectDialog.title', 'Connect Bitrix24')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'components.bitrix24ConnectDialog.description',
              'Paste an incoming webhook URL from your Bitrix24 portal. Orca stores it on this desktop and uses it to read tasks.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void handleConnect()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>
              {translate('components.bitrix24ConnectDialog.webhookLabel', 'Incoming webhook URL')}
            </Label>
            <Input
              id={inputId}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={webhookUrl}
              disabled={connectState === 'connecting'}
              placeholder={translate(
                'components.bitrix24ConnectDialog.webhookPlaceholder',
                'https://portal.bitrix24.ru/rest/1/token/'
              )}
              onChange={(event) => {
                setWebhookUrl(event.target.value)
                clearErrorOnEdit()
              }}
            />
            <p className="text-xs text-muted-foreground">
              {translate(
                'components.bitrix24ConnectDialog.hint',
                'Create it in Bitrix24 under Developer resources → Other → Incoming webhook. Required scopes: task, tasks, sonet_group.'
              )}
            </p>
          </div>
          {connectState === 'error' && connectError ? (
            <p role="alert" className="text-xs text-destructive">
              {connectError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={connectState === 'connecting'}
            >
              {translate('components.bitrix24ConnectDialog.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!webhookUrl.trim() || connectState === 'connecting'}>
              {connectState === 'connecting' ? (
                <>
                  <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                  {translate('components.bitrix24ConnectDialog.connecting', 'Connecting...')}
                </>
              ) : (
                translate('components.bitrix24ConnectDialog.connect', 'Connect')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
