import AuthenticationLayout from './(components)/AuthenticationLayout/AuthenticationLayout';

type AuthenticationPagesLayoutProps = {
  children: React.ReactNode;
};

export default function AuthenticationPagesLayout({ children }: AuthenticationPagesLayoutProps) {
  return (
    <AuthenticationLayout>
      {children}
    </AuthenticationLayout>
  );
}
