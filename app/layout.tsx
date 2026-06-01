import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from './components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Luma Capital Dashboard',
  description: 'Trading performance dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0d1117] text-white min-h-screen`}>
        <Navbar />
        <main className="p-6">
          {children}
        </main>
      </body>
    </html>
  );
}