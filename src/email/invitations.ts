interface SendInvitationEmailOptions {
	toEmail: string;
	inviterUsername: string;
	farmName: string;
	farmEmoji: string | null;
	invitationId: string;
	deployUrl: string;
	resendApiKey: string;
	resendFromEmail: string;
	isNewUserInvite: boolean;
}

export async function sendInvitationEmail({
	toEmail,
	inviterUsername,
	farmName,
	farmEmoji,
	invitationId,
	deployUrl,
	resendApiKey,
	resendFromEmail,
	isNewUserInvite,
}: SendInvitationEmailOptions): Promise<void> {
	const acceptUrl = `${deployUrl}/invitations/${invitationId}`;
	const displayName = farmEmoji ? `${farmEmoji} ${farmName}` : farmName;

	const signupNote = isNewUserInvite
		? "<p>If you don't have an account yet, you'll be prompted to create one when you click the link.</p>"
		: "";

	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${resendApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: resendFromEmail,
			to: [toEmail],
			subject: `${inviterUsername} invited you to join ${displayName} on The Farm Computer`,
			html: `
				<p>Hi there,</p>
				<p><strong>${inviterUsername}</strong> has invited you to join the farm <strong>${displayName}</strong> on The Farm Computer, a Stardew Valley tracker.</p>
				<p><a href="${acceptUrl}">Click here to view the invitation</a></p>
				<p>This link expires in 7 days.</p>
				${signupNote}
			`,
		}),
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Resend API error: ${res.status} ${err}`);
	}
}
