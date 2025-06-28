'use client';

import { useEffect, useState } from 'react';
import { migrationMonitor } from '@/lib/migration-monitor';

export default function MigrationDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/migration-metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Migration Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Migration Progress"
          value={`${metrics.migrationProgress.toFixed(1)}%`}
          description="Percentage of requests using new architecture"
        />
        
        <MetricCard
          title="Total Requests"
          value={metrics.totalRequests}
          description="Total number of requests processed"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(1)}%`}
          description="Percentage of requests with errors"
        />
        
        <MetricCard
          title="Discrepancy Rate"
          value={`${metrics.discrepancyRate.toFixed(1)}%`}
          description="Percentage of requests with discrepancies"
        />
        
        <MetricCard
          title="Average Response Time"
          value={`${metrics.averageResponseTime.toFixed(0)}ms`}
          description="Average time to process requests"
        />
        
        <MetricCard
          title="Architecture Split"
          value={`${metrics.newArchitectureRequests} / ${metrics.oldArchitectureRequests}`}
          description="New / Old architecture requests"
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </div>
  );
} 