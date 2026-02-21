# Quest Board (Fantasy Guild Board)

## Stack
- Next.js (App Router) + TypeScript
- Supabase (PostgreSQL + Auth)

## Setup
1. Install dependencies
```bash
npm install
```

2. Create `.env.local`
```bash
cp .env.example .env.local
```
Set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Apply DB schema in Supabase SQL editor
- `supabase/schema.sql`

4. Run
```bash
npm run dev
```

## Env Sync (GitHub / Vercel / Supabase)
Use one command to push `.env.local` values to all services.

1. Login once
```bash
gh auth login
vercel login
supabase login
```

2. Run sync
```bash
npm run sync:env -- --github-repo Flat1017/questboard --supabase-project-ref <your-project-ref>
```

3. Dry run (no remote changes)
```bash
npm run sync:env:dry
```

### Useful options
- `--env-file .env.local`
- `--only github` or `--only vercel,supabase`
- `--keys NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `--skip-keys SOME_KEY`
- `--vercel-targets production,preview,development`
- `--vercel-scope <team-or-user-scope>`

### Notes
- GitHub sync uses `gh secret set` (`--github-app` supports `actions`, `codespaces`, `dependabot`).
- Vercel sync replaces existing keys (`vercel env rm` then `vercel env add`) for each target. Run `vercel link` once if this folder is not linked yet.
- Supabase sync sets project secrets (`supabase secrets set`) and requires `--supabase-project-ref`.

## Implemented MVP
- 日本語UI
- OPEN / DOING / DONE タブ
- 同一タブ内のみドラッグ並び替え
- 受注 / 受注解除 / 達成(スタンプ0.3s) / DONE->DOING差し戻し
- 難易度別XP (★1=10, ★2=20, ★3=30, ★4=40, ★5=50)
- 自分が完了したクエストを戻した場合のみXP減算
- 監査ログ (受注/解除/達成/差し戻し)
- 達成ログ (誰がどのクエストをいつ達成したか)
- 14日後自動アーカイブ (RPC呼び出し時に適用)
- メール+パスワード認証
- 参加申請の管理者承認/却下
- ADMINのみクエスト作成可能

## Notes
- 初回管理者は `user_profiles.role='ADMIN'` と `membership_status='APPROVED'` を手動更新してください。
- 本実装ではクエスト作成時に `デッドライン` を必須にしています。
