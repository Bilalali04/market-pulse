import { RegisterForm } from "../../components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-6 text-2xl font-semibold">Create account</h1>
      <RegisterForm />
    </main>
  );
}
