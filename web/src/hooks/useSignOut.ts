import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext";

export function useSignOut(): () => Promise<void> {
	const { refetch } = useSession();
	const navigate = useNavigate();

	return async () => {
		await fetch("/auth/logout", { method: "POST" });
		refetch();
		navigate("/", { replace: true });
	};
}
