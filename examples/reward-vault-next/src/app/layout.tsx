import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Grindy x Stellar | Campaign Infrastructure Demo",
	description:
		"Explore Grindy's open-source Stellar wallet identity and Soroban reward settlement integration on testnet.",
	icons: {
		icon: "/brand/grindy-g-transparent.png",
		shortcut: "/brand/grindy-g-transparent.png",
		apple: "/brand/grindy-g-transparent.png",
	},
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
