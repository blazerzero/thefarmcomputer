import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./context/SessionContext";
import { HomePage } from "./pages/HomePage";
import { UsernameSetupPage } from "./pages/UsernameSetupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewFarmPage } from "./pages/NewFarmPage";
import { FarmPage } from "./pages/FarmPage";
import { FarmBundlesPage } from "./pages/FarmBundlesPage";
import { FarmMuseumPage } from "./pages/FarmMuseumPage";
import { InvitationPage } from "./pages/InvitationPage";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
	const { user, loading } = useSession();
	if (loading) return null;
	if (!user) return <Navigate to="/" replace />;
	if (user.setup_required) return <Navigate to="/username-setup" replace />;
	return <>{children}</>;
}

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />
			<Route path="/username-setup" element={<UsernameSetupPage />} />
			<Route
				path="/dashboard"
				element={
					<ProtectedRoute>
						<DashboardPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/farms/new"
				element={
					<ProtectedRoute>
						<NewFarmPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/farms/:farmId"
				element={
					<ProtectedRoute>
						<FarmPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/farms/:farmId/bundles"
				element={
					<ProtectedRoute>
						<FarmBundlesPage />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/farms/:farmId/museum"
				element={
					<ProtectedRoute>
						<FarmMuseumPage />
					</ProtectedRoute>
				}
			/>
			<Route path="/invitations/:id" element={<InvitationPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
