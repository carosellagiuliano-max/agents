export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly details?: Record<string, unknown>,
    readonly options: { headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get headers(): Record<string, string> {
    return this.options.headers ?? {};
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
