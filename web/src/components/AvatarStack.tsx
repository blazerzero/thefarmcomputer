import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../pages/shared.module.scss";

export interface AvatarUser {
	username: string;
	avatar_url: string | null;
}

interface AvatarStackProps {
	users: AvatarUser[];
	currentUsername?: string | null;
}

interface TooltipPortalProps {
	label: string;
	anchorRef: React.RefObject<HTMLDivElement | null>;
}

const TOOLTIP_HEIGHT_ESTIMATE = 32;
const GAP = 8;

function TooltipPortal({ label, anchorRef }: TooltipPortalProps) {
	const [state, setState] = useState<{
		top: number;
		left: number;
		placement: "top" | "bottom";
	} | null>(null);

	useEffect(() => {
		if (!anchorRef.current) return;
		const rect = anchorRef.current.getBoundingClientRect();
		const placement =
			rect.top < TOOLTIP_HEIGHT_ESTIMATE + GAP ? "bottom" : "top";
		setState({
			top:
				placement === "top"
					? rect.top + window.scrollY - GAP
					: rect.bottom + window.scrollY + GAP,
			left: rect.left + window.scrollX + rect.width / 2,
			placement,
		});
	}, [anchorRef]);

	if (!state) return null;

	return createPortal(
		<span
			className={styles.avatarTooltip}
			data-placement={state.placement}
			style={{
				position: "absolute",
				top: state.top,
				left: state.left,
				bottom: "auto",
				transform:
					state.placement === "top"
						? "translateX(-50%) translateY(-100%)"
						: "translateX(-50%)",
				opacity: 1,
			}}
		>
			{label}
		</span>,
		document.body,
	);
}

interface AvatarItemProps {
	user: AvatarUser;
	label: string;
}

function AvatarItem({ user, label }: AvatarItemProps) {
	const [hovered, setHovered] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={ref}
			className={styles.avatarWrapper}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{user.avatar_url ? (
				<img src={user.avatar_url} alt="" className={styles.stackedAvatar} />
			) : (
				<div
					className={`${styles.stackedAvatar} ${styles.stackedAvatarFallback}`}
				>
					{user.username[0]?.toUpperCase()}
				</div>
			)}
			{hovered && <TooltipPortal label={label} anchorRef={ref} />}
		</div>
	);
}

export function AvatarStack({ users, currentUsername }: AvatarStackProps) {
	if (users.length === 0) return null;
	return (
		<div className={styles.avatarStack}>
			{users.map((u) => (
				<AvatarItem
					key={u.username}
					user={u}
					label={
						u.username === currentUsername ? `${u.username} (you)` : u.username
					}
				/>
			))}
		</div>
	);
}
