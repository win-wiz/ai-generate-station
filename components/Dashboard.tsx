import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface Metric {
  name: string;
  value: number;
  trend: number;
}

interface DashboardData {
  metrics: Metric[];
}

interface DashboardProps {
  userId: string;
  theme: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ userId, theme }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/${userId}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.metrics.map(metric => ({
      name: metric.name,
      value: metric.value,
      trend: metric.trend
    }));
  }, [data]);

  const MetricCard = ({ title, value, trend }: { title: string; value: number; trend: number }) => (
    <div className={`metric-card ${theme}`}>
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      <div className={`trend ${trend > 0 ? 'positive' : 'negative'}`}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </div>
    </div>
  );

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className={`dashboard ${theme}`}>
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="tab-navigation">
          {['overview', 'analytics', 'reports'].map(tab => (
            <button
              key={tab}
              className={`tab ${selectedTab === tab ? 'active' : ''}`}
              onClick={() => setSelectedTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main className="dashboard-content">
        {selectedTab === 'overview' && (
          <div className="overview-section">
            <div className="metrics-grid">
              {chartData.map(metric => (
                <MetricCard
                  key={metric.name}
                  title={metric.name}
                  value={metric.value}
                  trend={metric.trend}
                />
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'analytics' && (
          <div className="analytics-section">
            <h2>Analytics</h2>
            <p>Analytics content will be displayed here</p>
          </div>
        )}

        {selectedTab === 'reports' && (
          <div className="reports-section">
            <h2>Reports</h2>
            <p>Reports content will be displayed here</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;