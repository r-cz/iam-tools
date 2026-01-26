type DiagnosticsSnapshot = {
  errorBoundaryCount: number
  windowErrorCount: number
  unhandledRejectionCount: number
}

type DiagnosticsListener = (snapshot: DiagnosticsSnapshot) => void

const listeners = new Set<DiagnosticsListener>()
let snapshot: DiagnosticsSnapshot = {
  errorBoundaryCount: 0,
  windowErrorCount: 0,
  unhandledRejectionCount: 0,
}

function notify() {
  listeners.forEach((listener) => listener(snapshot))
}

export function getDiagnosticsSnapshot(): DiagnosticsSnapshot {
  return snapshot
}

export function subscribeDiagnostics(listener: DiagnosticsListener): () => void {
  listeners.add(listener)
  listener(snapshot)
  return () => listeners.delete(listener)
}

export function recordErrorBoundary() {
  snapshot = {
    ...snapshot,
    errorBoundaryCount: snapshot.errorBoundaryCount + 1,
  }
  notify()
}

export function recordWindowError() {
  snapshot = {
    ...snapshot,
    windowErrorCount: snapshot.windowErrorCount + 1,
  }
  notify()
}

export function recordUnhandledRejection() {
  snapshot = {
    ...snapshot,
    unhandledRejectionCount: snapshot.unhandledRejectionCount + 1,
  }
  notify()
}
