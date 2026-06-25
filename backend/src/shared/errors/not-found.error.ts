import { DomainError } from './domain.error';

export class NotFoundError extends DomainError {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier '${identifier}' not found.`);
    this.name = 'NotFoundError';
  }
}
