type FixtureImageProps = {
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

export default function FixtureImage({ alt, className, width, height }: FixtureImageProps) {
  return (
    <span
      aria-label={alt}
      className={className}
      role="img"
      style={{ display: 'inline-block', width, height }}
    />
  );
}
