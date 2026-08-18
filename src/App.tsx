import { PersonnelPage } from "@/features/personnel/components/PersonnelPage";

function App() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            S
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">SASUCO</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Hệ thống quản lý đào tạo</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <PersonnelPage />
      </main>
    </div>
  );
}

export default App;
