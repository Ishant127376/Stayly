"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";

import { ApiError, login, signup } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const destination = safeDestination(searchParams.get("next"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (mode === "signup") await signup({ name: name.trim(), email: email.trim(), password });
      else await login({ email: email.trim(), password });
      router.replace(destination);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We could not authenticate you. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title">
    <span className="eyebrow">Stayly account</span>
    <h1 id="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
    <p>{mode === "signup" ? "Save stays and manage your trips in one place." : "Log in to continue to your Stayly account."}</p>
    <form className="auth-form" onSubmit={submit}>
      {mode === "signup" && <label>Your name<input autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>}
      <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />{mode === "signup" && <small>Use at least 12 characters.</small>}</label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</button>
    </form>
    <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to Stayly?"} <Link href={`/${mode === "signup" ? "login" : "signup"}?next=${encodeURIComponent(destination)}`}>{mode === "signup" ? "Log in" : "Sign up"}</Link></p>
  </section></main>;
}

function safeDestination(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
