"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, LoginInput } from "@/lib/schemas";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError("");

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha invalidos");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-morpheus-950 to-morpheus-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-morpheus-900/60 backdrop-blur-sm border border-morpheus-700/50 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Morpheus</h1>
          <p className="text-morpheus-300">Entre na sua conta</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-morpheus-200 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full px-4 py-2.5 bg-morpheus-800/50 border border-morpheus-600/50 rounded-lg text-white placeholder-morpheus-400 focus:outline-none focus:ring-2 focus:ring-morpheus-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-morpheus-200 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full px-4 py-2.5 bg-morpheus-800/50 border border-morpheus-600/50 rounded-lg text-white placeholder-morpheus-400 focus:outline-none focus:ring-2 focus:ring-morpheus-500 focus:border-transparent"
              placeholder="Sua senha"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-morpheus-500 hover:bg-morpheus-600 disabled:bg-morpheus-700 text-white font-semibold rounded-lg transition-colors"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-morpheus-300">
          Nao tem uma conta?{" "}
          <Link href="/register" className="text-morpheus-400 hover:text-morpheus-300 underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
