// Error type thrown by the local services. Carries the same fields the
// pages already read off axios errors (`userMessage`, `response.data.detail`,
// `response.data.error.message`) so the 8k lines of UI keep working
// without touching their catch blocks.

export class DomainError extends Error {
  status: number;
  userMessage: string;
  response: { status: number; data: { detail: string; error: { code: number; message: string } } };

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.userMessage = message;
    this.response = {
      status,
      data: { detail: message, error: { code: status, message } },
    };
  }
}

export function notFound(what: string): DomainError {
  return new DomainError(`${what} not found`, 404);
}
