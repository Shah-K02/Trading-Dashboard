import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { useAppStore } from "../lib/store";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore((s) => s.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      setAuth(res.access_token, res.user);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src="/logo.png" alt="TradeLens" className="h-14 w-14 object-contain drop-shadow-lg" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">TradeLens</h1>
            <p className="text-sm text-slate-400">Sign in to your account</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur"
        >
          <div className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="your_username"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
