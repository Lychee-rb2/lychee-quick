import { EXTENSION, LINEAR_VIEW, openExternal, register } from "@/help";

import type { Sdk } from "@/graphql/linear.client";
import * as vscode from "vscode";

import { createClient } from "@/fetch/linear";
import {
  createBranch,
  releaseIssues,
  sendPreview,
} from "@/views/linear/action";
import { AssigneeTreeItem } from "@/views/linear/assignee-tree-item";
import { LinearIssuesCache } from "@/views/linear/cache";
import { IssueTreeItem } from "@/views/linear/issue-tree-item";
import { PullRequestTreeItem } from "@/views/linear/pull-request-tree-item";

type TreeItem = IssueTreeItem | AssigneeTreeItem | PullRequestTreeItem;

export class LinearTreeDataProvider
  implements vscode.TreeDataProvider<TreeItem>
{
  readonly id = LINEAR_VIEW;
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> =
    new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> =
    this._onDidChangeTreeData.event;
  private cache: LinearIssuesCache;

  public isReleaseCheckboxEnabled = false;
  private selectedItems: Set<IssueTreeItem> = new Set();
  private _onDidChangeCheckboxState = new vscode.EventEmitter<
    vscode.TreeCheckboxChangeEvent<IssueTreeItem>
  >();

  readonly onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;

  private client: Sdk;
  private register = (
    command: string,
    callback: Parameters<typeof register>[1],
  ) => {
    register(`${this.id}.${command}`, callback);
  };
  constructor(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration(EXTENSION);
    this.client = createClient(config.get<string>("linearApiKey"));
    this.cache = new LinearIssuesCache(context, this.client);
    const view = vscode.window.createTreeView(`${EXTENSION}.${this.id}`, {
      treeDataProvider: this,
      manageCheckboxStateManually: true,
    });

    view.onDidChangeCheckboxState((event) => {
      event.items.forEach(([item, state]) => {
        if (item instanceof IssueTreeItem) {
          if (state === vscode.TreeItemCheckboxState.Checked) {
            this.selectedItems.add(item);
          } else {
            this.selectedItems.delete(item);
          }
        }
      });
    });
    this.initCommands();
  }

  private initCommands() {
    this.register("open-issue", (item: IssueTreeItem) =>
      openExternal(item.issue.url),
    );
    this.register("create-branch", (item: IssueTreeItem) => createBranch(item));
    this.register("refresh", () => this.refresh());
    this.register("send-preview", (item: PullRequestTreeItem) =>
      sendPreview(item),
    );
    this.register("release-issues", () => this.releaseIssues());
    this.register("open-pull-request", (item: PullRequestTreeItem) =>
      openExternal(item.attachment.metadata.url),
    );
  }

  getTreeItem(element: TreeItem) {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    const issues = await this.cache.getIssues();
    if (!element) {
      return AssigneeTreeItem.from(issues);
    }
    return element.getChildren(this);
  }

  refresh(): void {
    this.cache.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  async releaseIssues(): Promise<void> {
    switch (this.isReleaseCheckboxEnabled) {
      case true: {
        releaseIssues(this.selectedItems);
        break;
      }
    }
    this.isReleaseCheckboxEnabled = !this.isReleaseCheckboxEnabled;
    this.selectedItems.clear();
    this._onDidChangeTreeData.fire(undefined);
  }
}
