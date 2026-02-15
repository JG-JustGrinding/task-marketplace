import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header'

export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Header user={user} />
      {children}
    </>
  )
}
