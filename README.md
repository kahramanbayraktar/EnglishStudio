# EnglishStudio

EnglishStudio is an AI-powered analyzer designed to help English learners identify and understand **phrasal verbs** and **idioms** within any text.

## 🚀 Features
- **AI Analysis:** Uses custom-tuned generative models to pinpoint complex English phrases and their meanings.
- **Persistent History:** Automatically saves and lists your previous analyses using Supabase.
- **Premium UI:** A high-end dark mode interface with glassmorphism and fluid animations.
- **Detailed Insights:** Interactive chips provide definitions and context-specific examples for every identified phrase.

## 🛠 Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **AI Engine:** Google Gemini API
- **Backend/Database:** [Supabase](https://supabase.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Styling:** Vanilla CSS & Lucide Icons

## ⚙️ Setup

### Prerequisites
Create a `.env.local` file in the root directory and add your keys:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database
Apply the SQL migrations found in `supabase/migrations/` to your Supabase project.

### Local Development
Run the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.
