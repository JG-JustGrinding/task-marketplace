import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header'

export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();
    
  return (
    <>
      <Header user={user} profile={profileData} />
      {children}
    </>
  )
}
