import Image from 'next/image';

interface LogoProps {
  size?: number;
}

export function Logo({ size = 32 }: LogoProps) {
  return (
    <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
      <Image src="/logo.png" alt="LEPA'S Logo" width={size} height={size} className="text-primary" />
    </div>
  );
}
