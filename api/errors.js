/**
 * 统一错误契约（对齐 .codebuddy/skills/api-design/SKILL.md）
 *
 * HTTP 版本返回体：
 *   { "error": { "code": "INVALID_REQUEST", "message": "...", "details": [] } }
 *
 * mock 版本直接 throw ApiError，字段与 HTTP 版本一致，
 * 这样页面里的 try/catch 在切换后端时不需要改。
 *
 * 本文件不 import 任何东西，便于脚本静态校验。
 */

export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  STATE_INVALID: 'STATE_INVALID',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVER_ERROR: 'SERVER_ERROR'
};

/** 错误码 → HTTP 状态码（后端接入时直接用这张表） */
export const ERROR_HTTP_STATUS = {
  [ERROR_CODES.INVALID_REQUEST]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.STATE_INVALID]: 409,
  [ERROR_CODES.NOT_IMPLEMENTED]: 501,
  [ERROR_CODES.SERVER_ERROR]: 500
};

export class ApiError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = ERROR_HTTP_STATUS[code] || 500;
  }

  /** 转成 api-design 约定的错误体 */
  toBody() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

export function invalidRequest(message, details) {
  return new ApiError(ERROR_CODES.INVALID_REQUEST, message, details);
}

export function notFound(message, details) {
  return new ApiError(ERROR_CODES.NOT_FOUND, message, details);
}

export function conflict(message, details) {
  return new ApiError(ERROR_CODES.CONFLICT, message, details);
}

export function stateInvalid(message, details) {
  return new ApiError(ERROR_CODES.STATE_INVALID, message, details);
}

export function notImplemented(message, details) {
  return new ApiError(ERROR_CODES.NOT_IMPLEMENTED, message, details);
}
