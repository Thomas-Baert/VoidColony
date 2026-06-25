import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../shared/errors/domain.error';
import { NotFoundError } from '../../../shared/errors/not-found.error';

export const errorHandlerMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  
  if (err instanceof DomainError) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled Error:', err);
  return res.status(500).json({ error: 'Internal Server Error' });
};
