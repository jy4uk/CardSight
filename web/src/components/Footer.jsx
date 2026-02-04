export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            © {currentYear} Card Sight. All rights reserved.
          </p>
          <nav className="flex items-center gap-6" aria-label="Legal">
            <a
              href="/legal/terms-of-service.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/legal/privacy-policy.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/legal/dmca-policy.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              DMCA
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
