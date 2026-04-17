import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./context/SessionContext";
import "./index.scss";

const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

createRoot(root).render(
	<StrictMode>
		<BrowserRouter>
			<SessionProvider>
				<App />
			</SessionProvider>
		</BrowserRouter>
	</StrictMode>,
);
