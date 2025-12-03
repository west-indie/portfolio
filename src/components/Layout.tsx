import { Link, NavLink } from 'react-router-dom';
import { SITE_TITLE } from '../config';
import { FaGithub, FaInstagram, FaLinkedin, FaEnvelope } from 'react-icons/fa';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/work', label: 'Work' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' }
];

const socialLinks = [
  { href: 'mailto:leo@example.com', label: 'Email', icon: <FaEnvelope /> },
  { href: 'https://github.com/', label: 'GitHub', icon: <FaGithub /> },
  { href: 'https://linkedin.com/', label: 'LinkedIn', icon: <FaLinkedin /> },
  { href: 'https://instagram.com/', label: 'Instagram', icon: <FaInstagram /> }
];

function navClass(isActive: boolean) {
  return `px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'text-foreground' : 'text-gray-400 hover:text-foreground'}`;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight hover:text-accent">
            {SITE_TITLE}
          </Link>
          <nav className="flex items-center space-x-2">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => navClass(isActive)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">{children}</div>
      </main>

      <footer className="border-t border-white/5 bg-black/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} {SITE_TITLE}. Built for bold, hybrid work.
          </p>
          <div className="flex items-center space-x-4 text-gray-400">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} aria-label={link.label} className="hover:text-foreground text-lg">
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
