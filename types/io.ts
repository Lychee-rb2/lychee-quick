/**
 * 接口定义文件 - 用于依赖注入，提高代码可测试性
 * 此文件只包含类型定义，无需测试，自动 100% 覆盖
 */

export interface ModuleLoader {
  loadMeta(
    path: string,
  ): Promise<{ help?: string; completion?: string } | null>;
  loadHandler(
    path: string,
  ): Promise<{ default?: (...args: unknown[]) => void | Promise<void> } | null>;
}

export interface FileSystem {
  getAppDir(baseDir: string): string;
  scanMetaFiles(dir: string): AsyncIterable<string>;
  fileExists(path: string): Promise<boolean>;
}
