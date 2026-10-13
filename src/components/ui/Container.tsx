/** Mobile-first max-width container. Server component (no interactivity). */
export function Container({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-screen-lg px-4 ${className}`}>{children}</div>;
}
