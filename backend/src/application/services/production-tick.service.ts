import { ICostCalculator, IProductionCalculator } from '../../../../frontend/src/game/config/buildings';

// Re-using the same config from frontend for now via relative import.
// In a real production app, this would be in a shared workspace package.
import { BuildingDefinitionRegistry } from '../../../../frontend/src/game/config/buildings';
import { IColonyRepository } from '../../domain/interfaces/repositories/colony-repository.interface';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

export class ProductionTickService {
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly colonyRepository: IColonyRepository,
    private readonly prisma: PrismaClient,
    private readonly io: Server
  ) {}

  public start() {
    if (this.tickInterval) return;
    console.log('[ProductionTick] Starting background tick service (30s interval)...');
    
    // Run every 30 seconds
    this.tickInterval = setInterval(() => this.runTick(), 30 * 1000);
  }

  public stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private async runTick() {
    console.log('[ProductionTick] Running tick...');
    const now = new Date();
    
    try {
      // Fetch all colonies. In a large game, we would paginate this or process in workers.
      const colonies = await this.prisma.colony.findMany({
        include: {
          platforms: {
            include: {
              buildings: true
            }
          },
          user: true
        }
      });

      for (const colonyRecord of colonies) {
        const lastTick = colonyRecord.lastTick;
        const elapsedSeconds = (now.getTime() - lastTick.getTime()) / 1000;
        
        if (elapsedSeconds <= 0) continue;

        let totalLeeksProduced = 0;
        const resourcesProduced: Record<string, number> = {};

        // Calculate production for all buildings
        for (const platform of colonyRecord.platforms) {
          for (const building of platform.buildings) {
            try {
              const def = BuildingDefinitionRegistry.get(building.typeKey);
              
              // Assume level 1 for now if not defined
              const state = building.functionalState as any;
              const level = state?.level || 1;

              const prod = def.getProduction(level, elapsedSeconds);
              if (prod) {
                if (prod.resourceType === 'leeks_harvested') {
                    totalLeeksProduced += prod.amount;
                } else {
                    resourcesProduced[prod.resourceType] = (resourcesProduced[prod.resourceType] || 0) + prod.amount;
                }
              }
            } catch (err) {
              // Ignore buildings without definitions or errors
            }
          }
        }

        if (totalLeeksProduced > 0 || Object.keys(resourcesProduced).length > 0) {
          await this.prisma.$transaction(async (tx) => {
            // Update lastTick and resources on Colony
            const currentResources = (colonyRecord.resources as Record<string, number>) || {};
            for (const [res, amount] of Object.entries(resourcesProduced)) {
                currentResources[res] = (currentResources[res] || 0) + amount;
            }

            await tx.colony.update({
              where: { id: colonyRecord.id },
              data: { 
                  lastTick: now,
                  resources: currentResources
              }
            });

            // Update leeks on User
            if (totalLeeksProduced > 0) {
              const updatedUser = await tx.user.update({
                where: { id: colonyRecord.userId },
                data: {
                  leekBalance: {
                    increment: Math.floor(totalLeeksProduced)
                  }
                }
              });

              // Notify the user via Socket
              // We need the socket ID for this user. 
              // A simple way is to emit to a room named after the user's ID
              this.io.to(`user:${colonyRecord.userId}`).emit('leek:update', updatedUser.leekBalance.toString());
            }
          });
          
          console.log(`[ProductionTick] Colony ${colonyRecord.id} produced ${totalLeeksProduced} leeks and ${JSON.stringify(resourcesProduced)}.`);
        } else {
            // Just update lastTick
            await this.prisma.colony.update({
                where: { id: colonyRecord.id },
                data: { lastTick: now }
            });
        }
      }
    } catch (error) {
      console.error('[ProductionTick] Error during tick:', error);
    }
  }
}
