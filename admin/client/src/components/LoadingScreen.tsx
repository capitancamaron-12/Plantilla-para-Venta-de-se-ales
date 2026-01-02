export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-zinc-700 border-r-transparent align-[-0.125em]"></div>
        <p className="mt-4 text-zinc-400">Cargando...</p>
      </div>
    </div>
  );
}
