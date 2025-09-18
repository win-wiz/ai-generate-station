import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: '用户仪表板 - AI生成站',
  description: '管理您的AI生成项目和设置',
};

export default function DashboardPage() {
  return <DashboardClient />;
}