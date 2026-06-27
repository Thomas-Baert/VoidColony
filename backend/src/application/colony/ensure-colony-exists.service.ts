import { v4 as uuidv4 } from 'uuid';
import { FlatTerrainAsteroidGenerator, IAsteroidGenerator } from '@voidcolony/shared';
import { IColonyRepository } from '../../domain/interfaces/repositories/colony-repository.interface';
import { Colony, Platform } from '../../domain/entities/colony.entity';

/** Rayon de l'astéroïde pour une toute nouvelle colonie (avant tout Nova Reset). */
const INITIAL_ASTEROID_RADIUS = 8;

/**
 * Garantit qu'une colonie existe pour l'utilisateur donné, et qu'elle possède
 * un terrain généré et persisté. Toute logique ayant besoin d'accéder à la
 * colonie d'un joueur (placement de bâtiment, lecture d'état, etc.) passe par
 * ce service plutôt que de dupliquer la logique de création paresseuse (SRP).
 */
export class EnsureColonyExistsService {
  constructor(
    private readonly colonyRepository: IColonyRepository,
    private readonly asteroidGenerator: IAsteroidGenerator = new FlatTerrainAsteroidGenerator()
  ) {}

  public async execute(userId: string): Promise<Colony> {
    const existingColony = await this.colonyRepository.findByUserId(userId);
    if (existingColony) return existingColony;

    const tiles = this.asteroidGenerator.generate(INITIAL_ASTEROID_RADIUS);
    const originPlatform = new Platform(
      uuidv4(),
      'rocky',
      0,
      0,
      { tiles },
      new Date(),
      []
    );

    const newColony = new Colony(
      uuidv4(),
      userId,
      0,
      1,
      INITIAL_ASTEROID_RADIUS,
      {},
      '',
      new Date(),
      new Date(),
      [originPlatform]
    );

    await this.colonyRepository.create(newColony);
    return newColony;
  }
}
