import styles from "./ConfirmModal.module.scss";

interface Props {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmModal({
	isOpen,
	title,
	message,
	confirmLabel = "Confirm",
	onConfirm,
	onCancel,
}: Props) {
	if (!isOpen) return null;

	return (
		<div className={styles.overlay} onClick={onCancel}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<h2 className={styles.title}>{title}</h2>
				<p className={styles.message}>{message}</p>
				<div className={styles.actions}>
					<button type="button" className={styles.btnCancel} onClick={onCancel}>
						Cancel
					</button>
					<button
						type="button"
						className={styles.btnConfirm}
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
