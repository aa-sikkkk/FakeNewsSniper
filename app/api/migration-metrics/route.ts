import { NextResponse } from 'next/server';
import { migrationMonitor } from '@/lib/migration-monitor';

export async function GET() {
  try {
    const metrics = migrationMonitor.getMetrics();
    const migrationProgress = migrationMonitor.getMigrationProgress();
    const errorRate = migrationMonitor.getErrorRate();
    const discrepancyRate = migrationMonitor.getDiscrepancyRate();

    return NextResponse.json({
      ...metrics,
      migrationProgress,
      errorRate,
      discrepancyRate
    });
  } catch (error) {
    console.error('Error fetching migration metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migration metrics' },
      { status: 500 }
    );
  }
} 