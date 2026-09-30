import Guestbook from "./guestbook";

// 개발자 표기
const DEVELOPER = { name: "강우현", studentId: "202404178" };

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">미니 방명록</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {DEVELOPER.name} ({DEVELOPER.studentId})
        </p>
      </header>
      <Guestbook />
    </main>
  );
}
