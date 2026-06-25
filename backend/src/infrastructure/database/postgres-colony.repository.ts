import { IColonyRepository } from '../../domain/interfaces/repositories/colony-repository.interface';
import { Colony, Platform, Building } from '../../domain/entities/colony.entity';
import { PrismaClient } from '@prisma/client';

export class PostgresColonyRepository implements IColonyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: any): Colony {
    const platforms = (record.platforms || []).map((p: any) => {
      const buildings = (p.buildings || []).map((b: any) => {
        return new Building(
          b.id,
          b.typeKey,
          b.positionX,
          b.positionY,
          b.functionalState as any,
          b.createdAt
        );
      });
      return new Platform(
        p.id,
        p.platformType,
        p.positionX,
        p.positionY,
        p.gridState,
        p.unlockedAt,
        buildings
      );
    });

    return new Colony(
      record.id,
      record.userId,
      record.novaResetCount,
      record.basePlatformCount,
      record.resources as Record<string, number>,
      record.techUnlocked,
      record.lastTick,
      record.createdAt,
      platforms
    );
  }

  async findById(id: string): Promise<Colony | null> {
    const record = await this.prisma.colony.findUnique({
      where: { id },
      include: {
        platforms: {
          include: {
            buildings: true
          }
        }
      }
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByUserId(userId: string): Promise<Colony | null> {
    const record = await this.prisma.colony.findFirst({
      where: { userId },
      include: {
        platforms: {
          include: {
            buildings: true
          }
        }
      }
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async save(colony: Colony): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update basic colony info
      await tx.colony.update({
        where: { id: colony.id },
        data: {
          novaResetCount: colony.novaResetCount,
          basePlatformCount: colony.basePlatformCount,
          resources: colony.resources,
          techUnlocked: colony.techUnlocked,
          lastTick: colony.lastTick
        }
      });

      // Upsert platforms and buildings
      for (const platform of colony.platforms) {
        await tx.platform.upsert({
          where: { id: platform.id },
          create: {
            id: platform.id,
            colonyId: colony.id,
            platformType: platform.platformType,
            positionX: platform.positionX,
            positionY: platform.positionY,
            gridState: platform.gridState,
            unlockedAt: platform.unlockedAt
          },
          update: {
            gridState: platform.gridState
          }
        });

        for (const building of platform.buildings) {
          await tx.building.upsert({
            where: { id: building.id },
            create: {
              id: building.id,
              platformId: platform.id,
              typeKey: building.typeKey,
              positionX: building.positionX,
              positionY: building.positionY,
              functionalState: building.functionalState,
              createdAt: building.createdAt
            },
            update: {
              functionalState: building.functionalState
            }
          });
        }
      }
    });
  }

  async create(colony: Colony): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.colony.create({
        data: {
          id: colony.id,
          userId: colony.userId,
          novaResetCount: colony.novaResetCount,
          basePlatformCount: colony.basePlatformCount,
          resources: colony.resources,
          techUnlocked: colony.techUnlocked,
          lastTick: colony.lastTick,
          createdAt: colony.createdAt
        }
      });

      for (const platform of colony.platforms) {
        await tx.platform.create({
          data: {
            id: platform.id,
            colonyId: colony.id,
            platformType: platform.platformType,
            positionX: platform.positionX,
            positionY: platform.positionY,
            gridState: platform.gridState,
            unlockedAt: platform.unlockedAt
          }
        });

        for (const building of platform.buildings) {
          await tx.building.create({
            data: {
              id: building.id,
              platformId: platform.id,
              typeKey: building.typeKey,
              positionX: building.positionX,
              positionY: building.positionY,
              functionalState: building.functionalState,
              createdAt: building.createdAt
            }
          });
        }
      }
    });
  }
}
