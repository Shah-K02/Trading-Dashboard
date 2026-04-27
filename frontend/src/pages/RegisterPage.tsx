import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/api";
import { useAppStore } from "../lib/store";

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore((s) => s.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (username.trim().length < 3) return "Username must be at least 3 characters.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await register(username.trim(), password);
      setAuth(res.access_token, res.user);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      setError(typeof msg === "string" ? msg : "Registration failed. Please try again.");
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
            <p className="text-sm text-slate-400">Create your account</p>
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
              <label htmlFor="reg-username" className="mb-1.5 block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="choose_a_username"
              />
              <p className="mt-1 text-xs text-slate-500">Minimum 3 characters</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-slate-500">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:ring-2 ${
                  confirm && confirm !== password
                    ? "border-red-700 bg-slate-800 focus:border-red-500 focus:ring-red-500/30"
                    : "border-slate-700 bg-slate-800 focus:border-emerald-500 focus:ring-emerald-500/30"
                }`}
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
                  Creating account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
