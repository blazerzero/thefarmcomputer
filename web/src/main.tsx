import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { SessionProvider } from "./context/SessionContext";
import "./index.scss";

function ToasterWrapper() {
	const [position, setPosition] = useState<"top-right" | "top-center">(
		window.innerWidth >= 768 ? "top-right" : "top-center",
	);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const handler = (e: MediaQueryListEvent) => {
			setPosition(e.matches ? "top-right" : "top-center");
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return <Toaster position={position} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

createRoot(root).render(
	<StrictMode>
		<BrowserRouter>
			<SessionProvider>
				<App />
				<ToasterWrapper />
			</SessionProvider>
		</BrowserRouter>
	</StrictMode>,
);
