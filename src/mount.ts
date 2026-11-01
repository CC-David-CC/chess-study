export interface MountResult {
  element: HTMLElement;
  dispose(): void;
}

interface HostLike {
  signal?: AbortSignal;
  ui?: {make?: (tag: string, className?: string, text?: string) => HTMLElement};
  storage: Record<string, unknown>;
  w?: {
    title?: string;
    ownerSub?: string;
    launchContext?: {version: 1; storage: 'mirror'; path: string; owner: string};
  };
}

function fallbackMake(tag: string, className = ''): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

export function mount(host: HostLike): MountResult {
  const make = typeof host?.ui?.make === 'function' ? host.ui.make : fallbackMake;
  const body = make('div', 'window-content chess-study');
  const loading = make('div', 'app-status', 'Loading Chess Study…');
  body.append(loading);

  const controller = new AbortController();
  let disposed = false;
  let view: {dispose(): void} | null = null;
  const abort = () => controller.abort(host.signal?.reason || 'View removed');
  host.signal?.addEventListener('abort', abort, {once: true});
  if (host.signal?.aborted) abort();

  queueMicrotask(() => {
    void import('./view/run.js').then(async ({startView}) => {
      if (disposed || controller.signal.aborted) return;
      const workerFactory = () => new Worker(
        new URL('./workers/chess-ai.mjs', import.meta.url),
        {type: 'module', name: 'chess-study-ai'},
      );
      const started = await startView(body, controller.signal, host as never, workerFactory);
      if (disposed || controller.signal.aborted) {
        started.dispose();
        return;
      }
      view = started;
      loading.remove();
    }).catch(error => {
      if (!disposed && !controller.signal.aborted) {
        loading.textContent = 'Chess Study could not start: ' +
          (error instanceof Error ? error.message : 'unknown error');
      }
    });
  });

  return {
    element: body,
    dispose() {
      if (disposed) return;
      disposed = true;
      host.signal?.removeEventListener('abort', abort);
      controller.abort('App closed');
      view?.dispose();
      view = null;
      body.replaceChildren();
    },
  };
}
