import { iconMap, treeId, VERCEL_VIEW } from "@/help";
import * as vscode from "vscode";
import { Project, type DeployHook as _DeployHook } from "./type";

interface DeployHook extends _DeployHook {
  projectName: Project["name"];
}

export class ReleaseTreeItem extends vscode.TreeItem {
  contextValue = treeId(VERCEL_VIEW, "releases.branch");
  constructor(
    public label: string,
    public deployHooks: DeployHook[],
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = iconMap("branch");
  }

  static from(projects: Project[]) {
    const map = projects.reduce<Record<string, DeployHook[]>>(
      (acc, { link, name }) => {
        link?.deployHooks.forEach((deployHook) => {
          const branch = deployHook.ref;
          acc[branch] = acc[branch] || [];
          acc[branch].push({ ...deployHook, projectName: name });
        });
        return acc;
      },
      {},
    );
    return Object.entries(map).map(
      ([branch, deployHooks]) => new ReleaseTreeItem(branch, deployHooks),
    );
  }
}

export class DeployHookTreeItem extends vscode.TreeItem {
  contextValue = treeId(VERCEL_VIEW, "releases.branch.project");
  constructor(public deployHook: DeployHook) {
    super(deployHook.projectName, vscode.TreeItemCollapsibleState.None);
  }

  static from(releaseTreeItem: ReleaseTreeItem) {
    return releaseTreeItem.deployHooks.map(
      (deployHook) => new DeployHookTreeItem(deployHook),
    );
  }
}
