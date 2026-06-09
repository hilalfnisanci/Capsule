import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
      <p className="text-base text-gray-700">No capsules yet</p>
      <Link
        href="/capsules/new"
        className="mt-4 inline-flex items-center rounded-md border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Create your first capsule
      </Link>
    </div>
  );
}
