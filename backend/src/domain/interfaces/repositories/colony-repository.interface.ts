import { Colony } from '../../entities/colony.entity';

export interface IColonyRepository {
  findById(id: string): Promise<Colony | null>;
  findByUserId(userId: string): Promise<Colony | null>;
  save(colony: Colony): Promise<void>;
  create(colony: Colony): Promise<void>;
}
