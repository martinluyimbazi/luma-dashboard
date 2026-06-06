import { getDashboardData } from './lib/sheets';
import ExecutiveDashboardClient from './components/ExecutiveDashboardClient';

export default async function ExecutiveDashboard() {
  const data = await getDashboardData();
  return <ExecutiveDashboardClient data={data} />;
}