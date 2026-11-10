import type { ActivityBarItem } from './activity-bar-buttons'

type RightSidebarActivityVisibilityState = {
  isFolder: boolean
  isFolderWorkspace: boolean
  /** The workspace runs on an SSH host, reached directly or through its managed server. */
  hasSshHost: boolean
  /** The active repo has a default Bitrix24 project to scope tasks to. */
  hasBitrix24Project: boolean
}

export function getVisibleRightSidebarActivityItems(
  items: ActivityBarItem[],
  {
    isFolder,
    isFolderWorkspace,
    hasSshHost,
    hasBitrix24Project
  }: RightSidebarActivityVisibilityState
): ActivityBarItem[] {
  return items.filter(
    (item) =>
      (!item.gitOnly || !isFolder || (isFolderWorkspace && item.id === 'source-control')) &&
      (!item.folderOnly || isFolderWorkspace) &&
      (!item.sshOnly || hasSshHost) &&
      (!item.bitrix24Only || hasBitrix24Project)
  )
}
