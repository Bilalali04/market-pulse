import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <LoginForm />
    </main>
  );
}
