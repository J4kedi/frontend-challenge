import { AxiosError } from 'axios'
import { apiErrorBody, type ErrorCode } from '@/contracts/common'

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CONTRACT_MISMATCH' | 'UNKNOWN'

/** Every failure that reaches the UI is an ApiError: one shape for messages, field errors and retry decisions. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly retryable = false,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError(0, 'TIMEOUT', 'A resposta demorou demais. Tente novamente.', {}, true)
    }
    if (!error.response) {
      return new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.', {}, true)
    }
    const parsed = apiErrorBody.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, fields, retryable, details } = parsed.data.error
      return new ApiError(error.response.status, code, message, fields, retryable ?? error.response.status >= 500, details)
    }
    return new ApiError(error.response.status, 'UNKNOWN', 'Algo deu errado. Tente novamente.', {}, error.response.status >= 500)
  }
  return new ApiError(0, 'UNKNOWN', 'Algo deu errado. Tente novamente.')
}

export const isApiError = (error: unknown, code?: ClientErrorCode): error is ApiError =>
  error instanceof ApiError && (code === undefined || error.code === code)
