import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper p-8">
      <h1 className="mb-6 font-display text-2xl text-ink sm:text-3xl">Log in</h1>
      <LoginForm />
    </main>
  );
}
