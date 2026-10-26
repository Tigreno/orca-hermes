import type { GlobalSettings } from '../../../shared/global-settings-types'
import { normalizeTerminalQuickCommands } from '../../../shared/terminal-quick-commands'
import { assertTerminalQuickCommandsStorable } from '../../../shared/terminal-quick-command-prompt-limit'
import { normalizeTerminalCustomThemes } from '../../../shared/terminal-custom-themes'
import { normalizeTerminalDefaultShell } from '../../../shared/terminal-default-shell'
import { normalizeTerminalCursorStyleDefault } from '../../../shared/terminal-cursor-style-settings'
import { normalizeDesktopTerminalScrollbackRows } from '../../../shared/terminal-scrollback-policy'
import { normalizeTerminalMinimumContrastRatio } from '../../../shared/terminal-minimum-contrast-settings'

/**
 * Terminal-scoped setting normalizations for one settings write.
 *
 * Extracted from the settings update so that file stays under its max-lines budget.
 */
export function applyTerminalSettingsNormalization(
  sanitizedUpdates: Partial<GlobalSettings>,
  updates: Partial<GlobalSettings>
): void {
  if ('terminalQuickCommands' in updates) {
    const terminalQuickCommands = normalizeTerminalQuickCommands(updates.terminalQuickCommands)
    // Every local and paired save lands here, so this is where an unstorable list is refused.
    assertTerminalQuickCommandsStorable(terminalQuickCommands)
    sanitizedUpdates.terminalQuickCommands = terminalQuickCommands
  }
  if ('terminalDefaultShell' in updates) {
    sanitizedUpdates.terminalDefaultShell = normalizeTerminalDefaultShell(
      updates.terminalDefaultShell
    )
  }
  if ('terminalCustomThemes' in updates) {
    sanitizedUpdates.terminalCustomThemes = normalizeTerminalCustomThemes(
      updates.terminalCustomThemes
    )
  }
  if ('terminalCursorStyle' in updates) {
    Object.assign(
      sanitizedUpdates,
      normalizeTerminalCursorStyleDefault(
        { terminalCursorStyle: updates.terminalCursorStyle },
        { preserveExplicitValue: true }
      )
    )
  }
  if ('terminalScrollbackRows' in updates) {
    sanitizedUpdates.terminalScrollbackRows = normalizeDesktopTerminalScrollbackRows(
      updates.terminalScrollbackRows
    )
  }
  // Why here: every writer (desktop IPC, web RPC, CLI) crosses this boundary, so xterm can never be
  // handed an out-of-range floor, and undefined stays undefined to mean "automatic" (#10754).
  if ('terminalMinimumContrastRatio' in updates) {
    sanitizedUpdates.terminalMinimumContrastRatio = normalizeTerminalMinimumContrastRatio(
      updates.terminalMinimumContrastRatio
    )
  }
  if (
    'terminalTuiScrollSensitivity' in updates ||
    'terminalTuiScrollSensitivityDefaultedToOne' in updates
  ) {
    sanitizedUpdates.terminalTuiScrollSensitivityDefaultedToOne = true
  }
}
