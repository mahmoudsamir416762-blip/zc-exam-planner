# ZC Exam Planner - GitHub Pages + Supabase

This project is ready to publish its **public interface** on GitHub Pages and keep student-course-room data private in Supabase. The repository intentionally contains no student IDs, no `students.json`, and no `student-index.js`.

## Architecture

```text
Student browser → GitHub Pages UI → Supabase Edge Function → private Supabase table
```

The browser sends one entered ID to the Edge Function. It never downloads the complete student index. The function has a 15-request / 10-minute IP rate limit and the table has RLS enabled with no public read policy.

## One-time Supabase setup

1. Create a Supabase project.
2. In SQL Editor, run `supabase/migrations/20261023_secure_lookup.sql`.
3. Create a private CSV from your local extracted file. Do not use the Git repository for either file:

   ```bash
   python scripts/build_supabase_import.py --students C:/private/students.json --out C:/private/student_course_rooms.csv
   ```

4. In Table Editor, import that CSV into `student_course_rooms`. Confirm the columns are `student_id`, `course_code`, `room`.
5. Install the Supabase CLI, log in, then run from this repository:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy lookup --no-verify-jwt
   supabase secrets set LOOKUP_RATE_LIMIT_SALT="a-long-random-secret" ALLOWED_ORIGINS="https://YOUR_GITHUB_USERNAME.github.io"
   ```

6. Edit `public/config.js` and replace `YOUR-PROJECT-REF` with your Supabase project ref.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to Edge Functions by Supabase. Never add the service role key to `config.js`, a GitHub secret exposed to the browser, or a commit.

## Publish on GitHub Pages

1. Create a **private** GitHub repository, then upload this project. Keep it private until your school approves the public site.
2. In repository **Settings → Pages**, set Source to **GitHub Actions**.
3. Push to `main`. The included workflow deploys only `public/`.
4. Add the final GitHub Pages URL to `ALLOWED_ORIGINS` in Supabase secrets. For local testing, add `http://localhost:...` as a comma-separated second origin.

## Security notes

- Do not commit or upload `students.json`, generated import CSV files, original course PDFs, or `student-index.js`.
- The service accepts a single ID per lookup and returns only its course codes and rooms.
- The rate limit helps reduce enumeration. For stronger protection, add university SSO or a server-verified CAPTCHA before enabling the public link.
- If a student asks to remove their data, delete their rows from `student_course_rooms`.
