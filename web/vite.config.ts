import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import ogPlugin from "vite-plugin-open-graph";

export default defineConfig({
	plugins: [
		react(),
		ogPlugin({
			basic: {
				title: "The Farm Computer",
				description:
					"A nifty Discord bot and web tool for searching in-game details for Stardew Valley, sourced from the official wiki.",
				url: process.env.DEPLOY_URL,
				image: process.env.OG_IMAGE_URL,
			},
		}),
	],
	resolve: {
		alias: [
			{ find: "@/api", replacement: path.resolve(__dirname, "../src") },
			{ find: "@", replacement: path.resolve(__dirname, "src") },
		],
	},
	server: {
		proxy: {
			"/api": "http://localhost:8787",
		},
	},
});
