import type { ErrorEvent, StackFrame } from '@sentry/react-native';

export const previewTestCrash = 'Adwam preview test crash';

type Build = { environment: string; release: string; dist: string; updateId: string };

const errorTypes = new Set(['Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError']);

function safeStackFrame({ filename, abs_path, function: name, lineno, colno, in_app }: StackFrame): StackFrame {
  return {
    filename: filename?.split(/[?#]/u, 1)[0], abs_path: abs_path?.split(/[?#]/u, 1)[0],
    function: name, lineno, colno, in_app,
  };
}

export function scrubCrashEvent(event: ErrorEvent, build: Build): ErrorEvent {
  const { type, event_id, timestamp, platform, level, debug_meta, exception } = event;
  const values = exception?.values?.map((value) => ({
    type: value.type && errorTypes.has(value.type) ? value.type : 'Error',
    value: build.environment === 'preview' && value.value === previewTestCrash ? previewTestCrash : undefined,
    stacktrace: value.stacktrace?.frames && { frames: value.stacktrace.frames.map(safeStackFrame) },
    mechanism: value.mechanism && { type: 'generic', handled: value.mechanism.handled },
  }));
  return {
    type, event_id, timestamp, platform, level, debug_meta,
    environment: build.environment, release: build.release, dist: build.dist,
    tags: { 'expo-update-id': build.updateId },
    exception: values ? { values } : undefined,
  };
}

export function isEuSentryDsn(value: string): boolean {
  return /^https:\/\/[a-z0-9]+@o\d+\.ingest\.de\.sentry\.io\/\d+\/?$/iu.test(value);
}
