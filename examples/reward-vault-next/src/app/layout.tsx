import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Grindy x Stellar | Campaign Infrastructure Demo",
	description:
		"Explore Grindy's open-source Stellar wallet identity and Soroban reward settlement integration on testnet.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>{children}</body>
		</html>
	);
}
