"use client";
import Image from 'next/image';
import Link from 'next/link';

export const Logo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center justify-center py-1"
    >
      <Image src="/logo.png" alt="LEPA'S Logo" width={84} height={84} />
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center justify-center py-1"
    >
      <Image src="/logo.png" alt="LEPA'S Logo" width={28} height={28} />
    </Link>
  );
};
