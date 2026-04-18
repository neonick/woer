import { motion } from 'framer-motion';

type TextRevealProps = {
  text: string;
  className?: string;
};

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: {
    opacity: 0,
    y: 16,
    filter: 'blur(5px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function TextReveal({ text, className = '' }: TextRevealProps) {
  const words = text.split(' ');

  return (
    <motion.span
      initial={false}
      animate="visible"
      variants={container}
      className={className}
      aria-label={text}
    >
      {words.map((word, index) => (
        <motion.span key={`${word}-${index}`} variants={item} className="mr-[0.35em] inline-block last:mr-0">
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}
