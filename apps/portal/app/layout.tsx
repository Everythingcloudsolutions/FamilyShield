export const metadata = {
  title: 'FamilyShield — Parent Portal',
  description: 'Intelligent Digital Safety for Every Child',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
