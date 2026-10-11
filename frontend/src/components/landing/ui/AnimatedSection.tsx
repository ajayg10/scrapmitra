import { useInView } from '../hooks';
import { usePrefersReducedMotion } from '../hooks';

interface Props {
  children: React.ReactNode;
  delay?: number;
  id?: string;
  className?: string;
}

export default function AnimatedSection({ children, delay = 0, id, className = '' }: Props) {
  const { ref, inView } = useInView();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      id={id}
      ref={ref}
      className={className}
      style={{
        opacity: reduced || inView ? 1 : 0,
        transform: reduced || inView ? 'none' : 'translateY(28px)',
        transition: reduced ? 'none' : `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
