import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salas · Morpheus",
};

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
