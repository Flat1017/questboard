"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

function normalizeEmail(raw: string) {
  return raw
    .normalize("NFKC")
    .replace(/[\p{Z}\p{Cc}\p{Cf}]+/gu, "")
    .toLowerCase();
}

function isEmailFormatValid(email: string) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email);
}

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail) {
        setMessage("メールアドレスを入力してください。");
        return;
      }

      if (!isEmailFormatValid(normalizedEmail)) {
        setMessage("メールアドレス形式が不正です。全角文字や空白が含まれていないか確認してください。");
        return;
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              display_name: displayName || normalizedEmail.split("@")[0]
            }
          }
        });
        if (error) throw error;
        setMessage("登録しました。管理者承認後にログインしてください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        window.location.href = "/board";
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "認証に失敗しました";
      if (rawMessage.includes("Email address") && rawMessage.includes("is invalid")) {
        setMessage("メールアドレス形式が不正です。全角文字や空白が含まれていないか確認してください。");
      } else {
        setMessage(rawMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="guild-shell auth-shell">
      <section className="auth-card">
        <h1 className="card-title">冒険者ログイン</h1>
        <p className="inline-note section-copy">黒樽亭の掲示板に入るため、通行証を確認します。</p>

        <form onSubmit={submit}>
          {isSignUp ? (
            <div className="field">
              <label htmlFor="displayName">表示名</label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={isSignUp}
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button className="btn primary" disabled={busy}>
            {busy ? "処理中..." : isSignUp ? "新規登録" : "ログイン"}
          </button>
        </form>

        <button className="btn toggle-auth-btn" type="button" onClick={() => setIsSignUp((v) => !v)}>
          {isSignUp ? "ログイン画面へ" : "新規登録へ"}
        </button>

        {message ? <p className="inline-note status-msg">{message}</p> : null}
      </section>
    </main>
  );
}
