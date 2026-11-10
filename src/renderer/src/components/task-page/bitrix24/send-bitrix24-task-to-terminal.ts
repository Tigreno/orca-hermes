import type { Bitrix24TaskDetail } from '../../../../../shared/bitrix24/bitrix24-types'
import { sendAgentDraftPasteContent } from '@/lib/agent-session/messaging/paste/agent-draft-paste-content'
import { useAppStore } from '@/store/index'
import { resolveWorktreeTerminalPtyId } from '@/store/terminals/worktree-terminal-pty'

export type Bitrix24TaskTerminalSendResult = 'sent' | 'no-terminal' | 'rejected'

export function formatBitrix24TaskTerminalText(
  task: Pick<Bitrix24TaskDetail, 'id' | 'title' | 'descriptionText'>
): string {
  const header = `Битрикс #${task.id} ${task.title}`
  const description = task.descriptionText?.trim()
  return description ? `${header}\n${description}` : header
}

export async function sendBitrix24TaskToActiveTerminal(
  task: Bitrix24TaskDetail
): Promise<Bitrix24TaskTerminalSendResult> {
  const ptyId = resolveWorktreeTerminalPtyId(useAppStore.getState())
  if (!ptyId) {
    return 'no-terminal'
  }
  try {
    const accepted = await sendAgentDraftPasteContent(
      ptyId,
      formatBitrix24TaskTerminalText(task),
      'driving'
    )
    return accepted ? 'sent' : 'rejected'
  } catch {
    return 'rejected'
  }
}
