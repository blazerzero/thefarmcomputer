import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { useSignOut } from "../hooks/useSignOut";
import { ConfirmModal } from "./ConfirmModal";
import FarmComputerIcon from "@/assets/farm-computer.png";
import styles from "./Navbar.module.scss";

export function Navbar() {
	const { user } = useSession();
	const handleSignOut = useSignOut();
	const [open, setOpen] = useState(false);
	const [confirmSignOut, setConfirmSignOut] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<>
			<header className={styles.navbar}>
				<Link to="/" className={styles.logo}>
					<img
						src={FarmComputerIcon}
						alt="The Farm Computer"
						className={styles.logoIcon}
					/>
					<span className={styles.logoText}>The Farm Computer</span>
				</Link>

				<div className={styles.accountWrapper} ref={ref}>
					<button
						type="button"
						className={styles.accountButton}
						onClick={() => setOpen((o) => !o)}
					>
						{user?.avatar_url && (
							<img src={user.avatar_url} alt="" className={styles.avatar} />
						)}
						<span>{user?.username ?? "Account"}</span>
						<span className={styles.caret}>{open ? "▴" : "▾"}</span>
					</button>

					{open && (
						<div className={styles.dropdown}>
							<Link
								to="/dashboard"
								className={styles.dropdownItem}
								onClick={() => setOpen(false)}
							>
								Dashboard
							</Link>
							<button
								type="button"
								className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
								onClick={() => {
									setOpen(false);
									setConfirmSignOut(true);
								}}
							>
								Sign out
							</button>
						</div>
					)}
				</div>
			</header>

			<ConfirmModal
				isOpen={confirmSignOut}
				title="Sign out?"
				message="Are you sure you want to sign out?"
				confirmLabel="Sign out"
				onConfirm={handleSignOut}
				onCancel={() => setConfirmSignOut(false)}
			/>
		</>
	);
}
