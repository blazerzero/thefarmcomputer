import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import styles from "./Navbar.module.scss";

export function Navbar() {
	const { user } = useSession();

	return (
		<header className={styles.navbar}>
			<Link to="/" className={styles.logo}>
				The Farm Computer
			</Link>
			<Link to="/dashboard" className={styles.dashboard}>
				{user?.avatar_url && (
					<img src={user.avatar_url} alt="" className={styles.avatar} />
				)}
				<span>{user?.username ?? "Dashboard"}</span>
			</Link>
		</header>
	);
}
