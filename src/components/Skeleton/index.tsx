interface SkeletonProps {
  linhas?: number;
}

export default function Skeleton({ linhas = 3 }: SkeletonProps) {
  return (
    <div className="docket-list">
      {Array.from({ length: linhas }).map((_, i) => (
        <div className="docket-skeleton" key={i} />
      ))}
    </div>
  );
}
