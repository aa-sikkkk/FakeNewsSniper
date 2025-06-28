import { v4 as uuidv4 } from 'uuid'; // Import uuid if needed elsewhere, but not directly used here

// Add a global type for the migration monitor
declare global {
  var globalMigrationMonitor: MigrationMonitor;
}

interface MigrationMetrics {
  totalRequests: number;
  newArchitectureRequests: number;
  oldArchitectureRequests: number;
  errors: number;
  discrepancies: number;
  averageResponseTime: number;
}

export class MigrationMonitor {
  private static instance: MigrationMonitor; // Static property to hold the single instance

  private metrics: MigrationMetrics = {
    totalRequests: 0,
    newArchitectureRequests: 0,
    oldArchitectureRequests: 0,
    errors: 0,
    discrepancies: 0,
    averageResponseTime: 0
  };

  private startTimes: Map<string, number> = new Map();

  // Private constructor to prevent direct instantiation outside the class
  private constructor() {}

  // Static method to get the singleton instance
  public static getInstance(): MigrationMonitor {
    if (!MigrationMonitor.instance) {
      MigrationMonitor.instance = new MigrationMonitor();
    }
    return MigrationMonitor.instance;
  }

  public startRequest(requestId: string): void {
    this.startTimes.set(requestId, Date.now());
    this.metrics.totalRequests++;
  }

  public endRequest(requestId: string, useNewArchitecture: boolean, error?: Error): void {
    const startTime = this.startTimes.get(requestId);
    if (startTime) {
      const duration = Date.now() - startTime;
      // Ensure metrics.totalRequests is not zero to avoid division by zero
      if (this.metrics.totalRequests > 0) {
         this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) / 
          this.metrics.totalRequests;
      } else {
         this.metrics.averageResponseTime = duration; // Handle the first request case
      }
     
      this.startTimes.delete(requestId);
    }

    if (useNewArchitecture) {
      this.metrics.newArchitectureRequests++;
    } else {
      this.metrics.oldArchitectureRequests++;
    }

    if (error) {
      this.metrics.errors++;
    }
  }

  public recordDiscrepancy(): void {
    this.metrics.discrepancies++;
  }

  public getMetrics(): MigrationMetrics {
    return { ...this.metrics };
  }

  public getMigrationProgress(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.newArchitectureRequests / this.metrics.totalRequests) * 100;
  }

  public getErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.errors / this.metrics.totalRequests) * 100;
  }

  public getDiscrepancyRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.discrepancies / this.metrics.totalRequests) * 100;
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      newArchitectureRequests: 0,
      oldArchitectureRequests: 0,
      errors: 0,
      discrepancies: 0,
      averageResponseTime: 0
    };
  }
}

// Export the singleton instance via the static method
export const migrationMonitor = MigrationMonitor.getInstance(); 