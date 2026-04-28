import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "./Dashboard";

/**
 * Home page - displays the creative intelligence dashboard
 */
export default function Home() {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}
