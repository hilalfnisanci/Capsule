import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Capsule
      </h1>
      <p className="text-base text-gray-600">Seal a memory. Open it later.</p>
      <Link
        href="/capsules/new"
        className="inline-flex items-center rounded-md border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Start a capsule →
      </Link>
      <p className="text-sm text-gray-500">
        Press{" "}
        <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs text-gray-700">
          n
        </kbd>{" "}
        to start
      </p>
    </section>
  );
}
