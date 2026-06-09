'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Executive' },
  { href: '/campaigns', label: 'Campaign Analytics' },
  { href: '/risk', label: 'Risk' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#0A0A0A] border-b border-[#292929] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="text-[15px] font-bold text-white">
        <span className="text-blue-400">Luma</span> Capital
        <span className="text-[11px] text-[#6e7681] font-normal ml-2">Dashboard</span>
      </div>
      <div className="flex gap-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              pathname === link.href
                ? 'bg-white text-[#000000] font-semibold'
                : 'text-[#8b949e] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}