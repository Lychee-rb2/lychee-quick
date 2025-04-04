import * as vscode from "vscode";
import { EXTENSION } from "./const";

export const register = <T>(cmd: string, fn: (item: T) => void) =>
  vscode.commands.registerCommand(`${EXTENSION}.${cmd}`, fn);

export const getConfig = () => vscode.workspace.getConfiguration(EXTENSION);
const map = {
  draft: ["git-pull-request-draft", "pullRequests.draft"],
  open: ["git-pull-request", "pullRequests.open"],
  closed: ["git-pull-request-closed", "pullRequests.closed"],
  merged: ["git-merge", "pullRequests.merged"],
  unstarted: ["star-empty", "terminal.foreground"],
  started: ["star-full", "terminal.ansiBlue"],
  completed: ["star-full", "terminal.ansiGreen"],
  canceled: ["close", "terminal.ansiRed"],
  backlog: ["info", "terminal.foreground"],
  triage: ["info", "terminal.foreground"],
  branch: ["git-branch", "terminal.foreground"],
  deployments: ["versions", "terminal.foreground"],
  preview: ["preview", "terminal.foreground"],
  production: ["coffee", "terminal.ansiGreen"],
  vercel_ready: ["circle-filled", "terminal.ansiGreen"],
  vercel_error: ["circle-filled", "terminal.ansiRed"],
  vercel_building: ["circle-filled", "terminal.ansiYellow"],
  vercel_queued: ["circle-filled", "terminal.ansiMagenta"],
} as const;
export const iconMap = (key: keyof typeof map) => {
  const icon = map[key];
  if (icon) {
    return new vscode.ThemeIcon(icon[0], new vscode.ThemeColor(icon[1]));
  }
  return undefined;
};

export const onViewCheckboxStateChange = <V, T extends V>(
  view: vscode.TreeView<V>,
  onChecked: (item: T) => void,
  onUnchecked: (item: T) => void,
  filter?: (item: V) => boolean,
) => {
  view.onDidChangeCheckboxState((event) => {
    if (event.items.length === 0) return;
    event.items.forEach(([item, state]) => {
      if (filter && !filter(item)) return;
      switch (state) {
        case vscode.TreeItemCheckboxState.Checked:
          onChecked(item as T);
          break;
        case vscode.TreeItemCheckboxState.Unchecked:
          onUnchecked(item as T);
          break;
      }
    });
  });
};
