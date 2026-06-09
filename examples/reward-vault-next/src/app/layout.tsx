import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Grindy Stellar Reward Vault",
	description: "Open-source Soroban reward vault demo for Grindy's Stellar integration.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
