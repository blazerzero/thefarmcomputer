import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	type ReactNode,
} from "react";

export interface SessionUser {
	id: string;
	email: string | null;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	setup_required: boolean;
}

interface SessionContextValue {
	user: SessionUser | null;
	loading: boolean;
	refetch: () => void;
}

const SessionContext = createContext<SessionContextValue>({
	user: null,
	loading: true,
	refetch: () => {
		/* noop */
	},
});

export function SessionProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(() => {
		setLoading(true);
		fetch("/api/me")
			.then((res) => (res.ok ? (res.json() as Promise<SessionUser>) : null))
			.then((data) => {
				setUser(data);
				setLoading(false);
			})
			.catch(() => {
				setUser(null);
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		refetch();
	}, [refetch]);

	return (
		<SessionContext.Provider value={{ user, loading, refetch }}>
			{children}
		</SessionContext.Provider>
	);
}

export function useSession(): SessionContextValue {
	return useContext(SessionContext);
}
