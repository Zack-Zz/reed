import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { WorkbenchRuntime, WorkbenchFileExport } from './ports';

const RuntimeContext = createContext<WorkbenchRuntime | null>(null);
const FileExportContext = createContext<WorkbenchFileExport | undefined>(undefined);

export function WorkbenchRuntimeProvider({
  runtime,
  children,
  fileExport,
}: PropsWithChildren<{ runtime: WorkbenchRuntime; fileExport?: WorkbenchFileExport }>) {
  return (
    <RuntimeContext.Provider value={runtime}>
      <FileExportContext.Provider value={fileExport}>{children}</FileExportContext.Provider>
    </RuntimeContext.Provider>
  );
}

export function useWorkbenchRuntime(): WorkbenchRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('A workbench runtime must be supplied by the shell.');
  return runtime;
}

export const useWorkbenchFileExport = () => useContext(FileExportContext);
